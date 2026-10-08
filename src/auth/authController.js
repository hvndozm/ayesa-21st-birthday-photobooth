import { isPermanentSession, normalizeOwnProfile } from './authAccess.js'

const initialState = { status: 'initializing', session: null, profile: null, role: null, error: null }

async function loadWithDeadline(load, timeoutMs) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Private access could not be loaded.')), timeoutMs) }),
    ])
  } finally { clearTimeout(timer) }
}

// One controller per provider lifetime. No credentials or roles are persisted here.
export function createAuthController(loadServices = () => import('../services/privateAuthService.js'), loadTimeoutMs = 12_000) {
  let state = initialState
  let services = null
  let client = null
  let initialization = null
  let subscription = null
  let identity = null
  let eventSerial = 0
  let lifecycle = 0
  let profileRevision = 0
  let profileController = null
  let profileTimer = null
  let stopTimer = null
  let mutationPending = false
  const listeners = new Set()

  function publish(next) {
    state = next
    listeners.forEach(listener => listener())
  }

  function cancelProfile() {
    profileRevision += 1
    clearTimeout(profileTimer)
    profileController?.abort()
    profileController = null
  }

  function acceptSession(session, forceProfile = false) {
    const permanent = isPermanentSession(session)
    const nextIdentity = session?.user?.id ? `${session.user.id}:${permanent ? 'permanent' : 'guest'}` : null
    if (nextIdentity === identity && !forceProfile && state.status !== 'initializing') {
      publish({ ...state, session })
      return
    }
    cancelProfile()
    identity = nextIdentity
    if (!permanent) {
      publish({ status: 'ready', session, profile: null, role: null, error: null })
      return
    }
    publish({ status: 'loading-profile', session, profile: null, role: null, error: null })
    const revision = profileRevision
    const controller = new AbortController()
    profileController = controller
    // Keep database requests outside the synchronous Supabase auth callback.
    profileTimer = setTimeout(async () => {
      try {
        const response = await services.loadOwnProfile(session.user, { client, signal: controller.signal })
        const profile = normalizeOwnProfile(response, session.user.id)
        if (revision !== profileRevision || controller.signal.aborted) return
        publish({ status: 'ready', session: state.session, profile, role: profile?.role ?? null, error: null })
      } catch {
        if (revision !== profileRevision || controller.signal.aborted) return
        publish({ status: 'ready', session: state.session, profile: null, role: null, error: 'profile-failed' })
      }
    }, 0)
  }

  function start() {
    if (initialization) return initialization
    const currentLifecycle = lifecycle
    initialization = (async () => {
      let initialSerial = eventSerial
      try {
        const loadedServices = await loadWithDeadline(loadServices, loadTimeoutMs)
        if (currentLifecycle !== lifecycle) return
        services = loadedServices
        client = services.getPrivateAuthClient()
        if (!client) { publish({ ...initialState, status: 'unavailable', error: 'configuration-unavailable' }); return }
        subscription = client.auth.onAuthStateChange((event, session) => {
          if (currentLifecycle !== lifecycle) return
          eventSerial += 1
          acceptSession(event === 'SIGNED_OUT' ? null : session)
        }).data.subscription
        initialSerial = eventSerial
        const session = await services.readExistingSession(client)
        if (currentLifecycle === lifecycle && initialSerial === eventSerial) acceptSession(session)
      } catch {
        if (currentLifecycle === lifecycle && initialSerial === eventSerial) {
          cancelProfile()
          identity = null
          publish({ ...initialState, status: 'error', error: 'initialization-failed' })
        }
      }
    })()
    return initialization
  }

  function stop() {
    lifecycle += 1
    cancelProfile()
    subscription?.unsubscribe()
    subscription = null
    initialization = null
    identity = null
    state = initialState
  }

  async function signIn(credentials) {
    await start()
    if (!client || !services) throw new Error('Private sign-in is unavailable.')
    if (mutationPending) throw new Error('Private access is already being updated.')
    mutationPending = true
    const serial = eventSerial
    const currentLifecycle = lifecycle
    try {
      const session = await services.signInPrivate(credentials, { client })
      // Respect a newer logout/account change rather than restoring a stale result.
      if (currentLifecycle === lifecycle && (eventSerial === serial || state.session?.user?.id === session.user.id)) acceptSession(session)
    } finally { mutationPending = false }
  }

  async function logout() {
    await start()
    if (!client || !services || mutationPending) throw new Error('Logout is unavailable right now.')
    mutationPending = true
    const serial = eventSerial
    const currentLifecycle = lifecycle
    try {
      await services.signOutPrivate({ client })
      if (currentLifecycle === lifecycle && (eventSerial === serial || !state.session)) acceptSession(null)
    } finally { mutationPending = false }
  }

  async function retry() {
    if (isPermanentSession(state.session)) acceptSession(state.session, true)
    else {
      stop()
      publish(initialState)
      await start()
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      clearTimeout(stopTimer)
      listeners.add(listener)
      void start()
      return () => {
        listeners.delete(listener)
        // StrictMode immediately resubscribes; keep its pending lookup shared.
        if (!listeners.size) stopTimer = setTimeout(() => { if (!listeners.size) stop() }, 0)
      }
    },
    signIn, logout, retry,
    destroy: stop,
  }
}
