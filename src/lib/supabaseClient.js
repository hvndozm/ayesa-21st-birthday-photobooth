import { createClient } from '@supabase/supabase-js'

const REQUEST_TIMEOUT_MS = 12_000
let client = null
let initializationAttempted = false

// Only browser-safe publishable keys belong here. Legacy JWT and secret keys
// are deliberately rejected rather than interpreted or printed.
export function isSupabaseConfigurationValid({ url, publishableKey } = {}) {
  if (typeof url !== 'string' || typeof publishableKey !== 'string'
    || !/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(publishableKey.trim())) return false
  try {
    const parsed = new URL(url.trim())
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    return (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && local))
      && Boolean(parsed.hostname) && !parsed.username && !parsed.password
      && !parsed.search && !parsed.hash && parsed.pathname === '/'
  } catch {
    return false
  }
}

export function createBoundedFetch(fetcher, timeoutMs = REQUEST_TIMEOUT_MS) {
  return async (input, options = {}) => {
    const controller = new AbortController()
    const previousSignal = options.signal
      ?? (typeof Request !== 'undefined' && input instanceof Request ? input.signal : null)
    const cancel = () => controller.abort()
    if (previousSignal?.aborted) cancel()
    else previousSignal?.addEventListener('abort', cancel, { once: true })

    let timer
    let timedOut = false
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true
        controller.abort()
        const error = new Error('Gallery request timed out.')
        error.name = 'SupabaseRequestTimeoutError'
        reject(error)
      }, timeoutMs)
    })
    const request = (async () => {
      const response = await fetcher(input, { ...options, signal: controller.signal })
      // Supabase's write/auth responses are small JSON documents. Keep the
      // deadline active through body consumption, not just response headers.
      if (response.headers.get('content-type')?.includes('application/json')) {
        const body = await response.arrayBuffer()
        const noBody = [204, 205, 304].includes(response.status)
        return new Response(noBody ? null : body, {
          status: response.status, statusText: response.statusText, headers: response.headers,
        })
      }
      return response
    })()
    try {
      return await Promise.race([request, deadline])
    } catch (error) {
      if (timedOut) {
        const timeoutError = new Error('Gallery request timed out.')
        timeoutError.name = 'SupabaseRequestTimeoutError'
        throw timeoutError
      }
      throw error
    } finally {
      clearTimeout(timer)
      previousSignal?.removeEventListener('abort', cancel)
    }
  }
}

// Lazy initialization keeps routes that do not save photos independent of Auth.
// Node tests can import this module without Vite's import.meta.env existing.
export function getSupabaseClient() {
  if (initializationAttempted) return client
  initializationAttempted = true
  const url = import.meta.env?.VITE_SUPABASE_URL
  const publishableKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!isSupabaseConfigurationValid({ url, publishableKey })
    || typeof globalThis.fetch !== 'function') return null
  try {
    client = createClient(url.trim(), publishableKey.trim(), {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, debug: false },
      global: { fetch: createBoundedFetch(globalThis.fetch.bind(globalThis)) },
    })
  } catch {
    client = null
  }
  return client
}
