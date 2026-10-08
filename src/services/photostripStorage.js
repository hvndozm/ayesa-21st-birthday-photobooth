import { getSupabaseClient } from '../lib/supabaseClient.js'
import { runAuthOperation } from './authOperationLock.js'
import { getPhotoboothFormat } from '../data/photoboothFormats.js'
import { getPlaceholderDesign } from '../data/placeholderDesigns.js'

const STAGE_TIMEOUT_MS = 15_000
const CLEANUP_TIMEOUT_MS = 5_000
const pendingSessions = new WeakMap()
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const databaseCodes = new Set(['42501', '23505', '23503', '23502', '23514', '22001', '42P01', '42703', 'PGRST204', 'PGRST205', 'PGRST301', 'PGRST302'])

export class PhotostripSaveError extends Error {
  constructor(code, stage, technicalCause, retryable = true) {
    super('The gallery copy could not be saved.')
    this.name = 'PhotostripSaveError'
    this.code = code
    this.stage = stage
    this.technicalCause = technicalCause
    this.retryable = retryable
  }
}

function stageLabel(stage) {
  return { auth: 'Guest session', upload: 'Storage upload', metadata: 'Metadata insert', cleanup: 'Storage cleanup' }[stage]
    ?? 'Gallery save'
}

function safeFailure(error, stage, responseStatus) {
  if (error instanceof PhotostripSaveError) return error
  const statusValue = Number(error?.status ?? error?.statusCode ?? responseStatus)
  const status = Number.isInteger(statusValue) && statusValue >= 100 && statusValue <= 599 ? statusValue : null
  const code = databaseCodes.has(error?.code) ? error.code : null
  const timedOut = error?.name === 'SupabaseRequestTimeoutError'
    || error?.originalError?.name === 'SupabaseRequestTimeoutError'
    || error?.message === 'Gallery request timed out.'
  const networkFailure = responseStatus === 0 || (!status && (
    ['TypeError', 'AuthRetryableFetchError', 'StorageUnknownError', 'AbortError'].includes(error?.name)
    || /failed to fetch|fetcherror|aborterror|network request failed/i.test(String(error?.message ?? ''))))
  const write = stage === 'upload' || stage === 'metadata'
  if (write && (timedOut || networkFailure || (status && status >= 500))) {
    return new PhotostripSaveError('outcome-unknown', stage,
      `${stageLabel(stage)} confirmation was lost; the server may have accepted the write.`, false)
  }
  if (timedOut) return new PhotostripSaveError('timeout', stage, `${stageLabel(stage)} timed out.`)
  const rls = code === '42501' || /row[- ]level security/i.test(String(error?.message ?? ''))
  if (rls) return new PhotostripSaveError('rls-denied', stage,
    `${stageLabel(stage)} was rejected by row-level security${code ? ` (PostgreSQL ${code})` : ''}${status ? ` (HTTP ${status})` : ''}.`)
  if (stage === 'auth' && error?.code === 'anonymous_provider_disabled') {
    return new PhotostripSaveError('auth-failed', stage, 'Anonymous sign-ins are disabled in Supabase Auth.')
  }
  if (stage === 'auth' && ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(error?.code)) {
    return new PhotostripSaveError('auth-failed', stage, 'Supabase Auth rejected the request because of its rate limit.')
  }
  return new PhotostripSaveError(`${stage}-failed`, stage,
    `${stageLabel(stage)} failed${code ? ` (database code ${code})` : ''}${status ? ` (HTTP ${status})` : ''}${networkFailure ? ' because the network was unavailable' : ''}.`)
}

async function withDeadline(operation, stage, timeoutMs, controller) {
  let timer
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort()
      const write = stage === 'upload' || stage === 'metadata'
      reject(new PhotostripSaveError(write ? 'outcome-unknown' : 'timeout', stage,
        write ? `${stageLabel(stage)} timed out before confirmation; the server may have accepted the write.`
          : `${stageLabel(stage)} timed out.`, !write))
    }, timeoutMs)
  })
  try {
    const request = typeof operation === 'function' ? Promise.resolve().then(operation) : Promise.resolve(operation)
    return await Promise.race([request, deadline])
  } catch (error) {
    throw safeFailure(error, stage)
  } finally {
    clearTimeout(timer)
  }
}

function requireClient(client) {
  if (!client) throw new PhotostripSaveError('configuration-unavailable', 'configuration',
    'Supabase is unavailable because its browser configuration is missing or invalid.')
}

function requireSession(session) {
  if (!session || !uuidPattern.test(session.user?.id ?? '')) {
    throw new PhotostripSaveError('auth-failed', 'auth', 'Supabase did not provide a valid guest session.')
  }
  return session
}

async function readOrCreateSession(client) {
  const current = await client.auth.getSession()
  if (current.error) throw safeFailure(current.error, 'auth')
  // Never replace a future permanent session or a non-null malformed session.
  if (current.data?.session != null) return requireSession(current.data.session)
  const signedIn = await client.auth.signInAnonymously()
  if (signedIn.error) throw safeFailure(signedIn.error, 'auth')
  return requireSession(signedIn.data?.session)
}

export async function ensureGuestSession({ client = getSupabaseClient(), timeoutMs = STAGE_TIMEOUT_MS } = {}) {
  requireClient(client)
  let pending = pendingSessions.get(client)
  if (!pending) {
    pending = runAuthOperation(client, () => readOrCreateSession(client))
    pendingSessions.set(client, pending)
    // Retain the underlying request after a caller times out. A retry must
    // join it, not create a second anonymous guest while the first is pending.
    const release = () => {
      if (pendingSessions.get(client) === pending) pendingSessions.delete(client)
    }
    pending.then(release, release)
  }
  return withDeadline(pending, 'auth', timeoutMs)
}

function createStorageId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new PhotostripSaveError('crypto-unavailable', 'configuration', 'Secure file-name generation is unavailable.', false)
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function validateResult({ blob, formatId, designId, width, height } = {}) {
  const format = getPhotoboothFormat(formatId)
  if (!(blob instanceof Blob) || blob.type !== 'image/png' || blob.size === 0
    || !format || !getPlaceholderDesign(designId, formatId)
    || width !== format.canvasWidth || height !== format.canvasHeight) {
    throw new PhotostripSaveError('invalid-result', 'validation', 'The generated PNG or its validated format metadata is invalid.', false)
  }
}

export async function savePhotostrip(result, { client = getSupabaseClient(), timeoutMs = STAGE_TIMEOUT_MS,
  cleanupTimeoutMs = CLEANUP_TIMEOUT_MS } = {}) {
  requireClient(client)
  validateResult(result)
  const session = await ensureGuestSession({ client, timeoutMs })
  const ownerId = session.user.id
  const storagePath = `${ownerId}/${createStorageId()}.png`
  const bucket = client.storage.from('photostrips')
  const upload = await withDeadline(() => bucket.upload(storagePath, result.blob, {
    contentType: 'image/png', upsert: false,
  }), 'upload', timeoutMs)
  if (upload.error) throw safeFailure(upload.error, 'upload')

  const controller = new AbortController()
  try {
    const insertion = client.from('photostrips').insert({
      owner_id: ownerId, storage_path: storagePath, format_id: result.formatId,
      design_id: result.designId, width: result.width, height: result.height,
    })
    const response = await withDeadline(insertion.abortSignal(controller.signal), 'metadata', timeoutMs, controller)
    if (response.error) throw safeFailure(response.error, 'metadata', response.status)
  } catch (error) {
    const failure = safeFailure(error, 'metadata')
    // A missing response is not proof the insert failed. Deleting its image
    // could break a row that committed; retrying could save the same result twice.
    if (failure.code === 'outcome-unknown') throw failure
    try {
      const removal = await withDeadline(() => bucket.remove([storagePath]), 'cleanup', cleanupTimeoutMs)
      if (removal.error) throw safeFailure(removal.error, 'cleanup')
      if (!Array.isArray(removal.data) || removal.data.length === 0) {
        throw new PhotostripSaveError('cleanup-unconfirmed', 'cleanup',
          'Storage cleanup returned no deleted object; inspect the bucket for an orphan file.')
      }
      failure.cleanupFailed = false
    } catch (cleanupError) {
      failure.cleanupFailed = true
      failure.cleanupTechnicalCause = safeFailure(cleanupError, 'cleanup').technicalCause
    }
    throw failure
  }
  return { storagePath, ownerId }
}
