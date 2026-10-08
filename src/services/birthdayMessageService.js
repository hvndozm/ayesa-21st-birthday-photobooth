import { getSupabaseClient } from '../lib/supabaseClient.js'
import { ensureGuestSession, PhotostripSaveError } from './photostripStorage.js'
import { validateBirthdayMessage } from '../utils/birthdayMessageValidation.js'

const INSERT_TIMEOUT_MS = 15_000
const databaseCodes = new Set(['42501', '23503', '23502', '23514', '22001', '42P01', '42703', 'PGRST204', 'PGRST205'])

export class BirthdayMessageError extends Error {
  constructor(code, technicalCause, uncertain = false) {
    super('The birthday message could not be sent.')
    this.name = 'BirthdayMessageError'
    this.code = code
    this.technicalCause = technicalCause
    this.uncertain = uncertain
  }
}

function insertFailure(error, responseStatus) {
  if (error instanceof BirthdayMessageError) return error
  const numericStatus = Number(error?.status ?? responseStatus)
  const status = Number.isInteger(numericStatus) && numericStatus >= 100 && numericStatus <= 599 ? numericStatus : null
  const code = databaseCodes.has(error?.code) ? error.code : null
  const timedOut = error?.name === 'SupabaseRequestTimeoutError'
    || error?.message === 'Gallery request timed out.'
  const networkFailure = responseStatus === 0 || ['TypeError', 'AbortError'].includes(error?.name)
    || /failed to fetch|network request failed|aborterror/i.test(String(error?.message ?? ''))
  if (timedOut || networkFailure || (status && status >= 500)) {
    return new BirthdayMessageError('outcome-unknown', 'Message insertion could not be confirmed; the server may have accepted it.', true)
  }
  if (code === '42501' || /row[- ]level security/i.test(String(error?.message ?? ''))) {
    return new BirthdayMessageError('rls-denied',
      `birthday_messages INSERT was rejected by row-level security${code ? ` (PostgreSQL ${code})` : ''}${status ? ` (HTTP ${status})` : ''}.`)
  }
  return new BirthdayMessageError('insert-failed',
    `birthday_messages INSERT failed${code ? ` (database code ${code})` : ''}${status ? ` (HTTP ${status})` : ''}.`)
}

export async function sendBirthdayMessage(input, options = {}) {
  // Validate before even initializing the client. Never echo letter contents in errors.
  const { values, errors } = validateBirthdayMessage(input)
  if (Object.keys(errors).length) {
    const failure = new BirthdayMessageError('validation-failed', 'Nickname or message validation failed.')
    failure.fieldErrors = errors
    throw failure
  }
  const client = options.client === undefined ? getSupabaseClient() : options.client
  if (!client) throw new BirthdayMessageError('configuration-unavailable', 'Supabase browser configuration is missing or invalid.')
  const timeoutMs = options.timeoutMs ?? INSERT_TIMEOUT_MS
  let session
  try {
    // Share Phase 5's session reuse and single-flight anonymous initialization.
    session = await ensureGuestSession({ client, timeoutMs })
  } catch (error) {
    throw new BirthdayMessageError('session-failed', error instanceof PhotostripSaveError
      ? error.technicalCause : 'A guest session could not be established.')
  }

  const controller = new AbortController()
  let timer
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new BirthdayMessageError('outcome-unknown', 'Message insertion timed out before confirmation.', true))
      }, timeoutMs)
    })
    const insertion = client.from('birthday_messages').insert({
      owner_id: session.user.id,
      nickname: values.nickname,
      message: values.message,
      is_read: false,
    }).abortSignal(controller.signal)
    // INSERT-only guests must not request a returned row with .select().
    const response = await Promise.race([insertion, deadline])
    if (!response) throw new BirthdayMessageError('outcome-unknown', 'No message insertion confirmation was received.', true)
    if (response.error) throw insertFailure(response.error, response.status)
    return { sent: true }
  } catch (error) {
    throw insertFailure(error)
  } finally {
    clearTimeout(timer)
  }
}
