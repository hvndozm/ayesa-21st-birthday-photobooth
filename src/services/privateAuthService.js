import { getSupabaseClient } from '../lib/supabaseClient.js'
import { runAuthOperation } from './authOperationLock.js'
import { isPermanentSession, normalizeOwnProfile } from '../auth/authAccess.js'

const AUTH_TIMEOUT_MS = 15_000

export class PrivateAuthError extends Error {
  constructor(code, technicalCause) {
    super('Private access could not be completed.')
    this.name = 'PrivateAuthError'
    this.code = code
    this.technicalCause = technicalCause
  }
}

export const getPrivateAuthClient = getSupabaseClient

function requireClient(client) {
  if (!client) throw new PrivateAuthError('configuration-unavailable', 'Supabase browser configuration is unavailable.')
}

async function boundedRequest(operation, code, timeoutMs, controller = new AbortController()) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new PrivateAuthError(code, 'The private-access request timed out.'))
        }, timeoutMs)
      }),
    ])
  } catch (error) {
    if (error instanceof PrivateAuthError) throw error
    throw new PrivateAuthError(code, 'The private-access request could not be completed.')
  } finally {
    clearTimeout(timer)
  }
}

export async function readExistingSession(client, timeoutMs = AUTH_TIMEOUT_MS) {
  requireClient(client)
  const response = await boundedRequest(() => client.auth.getSession(), 'initialization-failed', timeoutMs)
  if (response.error) throw new PrivateAuthError('initialization-failed', 'The current Supabase session could not be resolved.')
  return response.data?.session ?? null
}

export async function loadOwnProfile(user, { client = getSupabaseClient(), signal, timeoutMs = AUTH_TIMEOUT_MS } = {}) {
  requireClient(client)
  if (!isPermanentSession({ user })) return null
  const controller = new AbortController()
  const cancel = () => controller.abort()
  if (signal?.aborted) cancel()
  else signal?.addEventListener('abort', cancel, { once: true })
  try {
    const response = await boundedRequest(() => client.from('profiles')
      .select('id, display_name, role').eq('id', user.id).maybeSingle()
      .abortSignal(controller.signal), 'profile-failed', timeoutMs, controller)
    if (response.error) {
      const rls = response.error.code === '42501'
      throw new PrivateAuthError('profile-failed', rls
        ? 'The own-profile SELECT was rejected (PostgreSQL 42501). Check owner-scoped profile access.'
        : 'The own-profile SELECT failed. No private role was granted.')
    }
    return normalizeOwnProfile(response.data, user.id)
  } finally {
    signal?.removeEventListener('abort', cancel)
  }
}

export async function signInPrivate({ email, password } = {}, { client = getSupabaseClient(), timeoutMs = AUTH_TIMEOUT_MS } = {}) {
  requireClient(client)
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password.length) {
    throw new PrivateAuthError('invalid-credentials', 'Email/password input is missing.')
  }
  return boundedRequest((signal) => runAuthOperation(client, async () => {
    // A queued attempt that timed out must not sign in later with retained input.
    if (signal.aborted) throw new PrivateAuthError('sign-in-failed', 'The queued sign-in expired before it started.')
    const response = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (response.error) {
      throw new PrivateAuthError(response.error.code === 'invalid_credentials' ? 'invalid-credentials' : 'sign-in-failed',
        'Email/password sign-in was rejected; raw authentication details were discarded.')
    }
    if (!isPermanentSession(response.data?.session)) {
      throw new PrivateAuthError('sign-in-failed', 'Email/password sign-in did not return a permanent session.')
    }
    return response.data.session
  }), 'sign-in-failed', timeoutMs)
}

export async function signOutPrivate({ client = getSupabaseClient(), timeoutMs = AUTH_TIMEOUT_MS } = {}) {
  requireClient(client)
  await boundedRequest((signal) => runAuthOperation(client, async () => {
    if (signal.aborted) throw new PrivateAuthError('sign-out-failed', 'The queued logout expired before it started.')
    const response = await client.auth.signOut()
    if (response.error) throw new PrivateAuthError('sign-out-failed', 'Supabase logout failed; raw details were discarded.')
  }), 'sign-out-failed', timeoutMs)
}
