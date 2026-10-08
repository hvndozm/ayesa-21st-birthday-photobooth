import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthController } from '../src/auth/authController.js'
import { getProtectedAccess, getPrivateArea, isPermanentSession } from '../src/auth/authAccess.js'

const ayesaId = '10000000-0000-4000-8000-000000000073'
const adminId = '10000000-0000-4000-8000-000000000074'
const sessionFor = (id = ayesaId, anonymous = false) => ({ user: { id, is_anonymous: anonymous } })
const profileFor = (id = ayesaId, role = 'ayesa') => ({ id, role, display_name: role === 'ayesa' ? 'Ayesa' : 'Birthday admin' })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
async function until(predicate) {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 1000) throw new Error('Auth state did not settle')
    await new Promise(resolve => setTimeout(resolve, 1))
  }
}

function setup(t, overrides = {}) {
  let callback
  let current = overrides.session ?? null
  const calls = { subscriptions: 0, unsubscribes: 0, sessions: 0, profiles: [], login: 0, logout: 0 }
  const client = { auth: {
    onAuthStateChange(handler) {
      callback = handler
      calls.subscriptions += 1
      return { data: { subscription: { unsubscribe() { calls.unsubscribes += 1; callback = null } } } }
    },
  } }
  const emit = (event, session) => { current = session; return callback?.(event, session) }
  const services = {
    getPrivateAuthClient: () => client,
    async readExistingSession() { calls.sessions += 1; return overrides.readSession ? overrides.readSession() : current },
    async loadOwnProfile(user, options) {
      calls.profiles.push({ id: user.id, signal: options.signal })
      return overrides.profile ? overrides.profile(user, calls.profiles.length) : profileFor(user.id, user.id === adminId ? 'admin' : 'ayesa')
    },
    async signInPrivate() { calls.login += 1; const session = overrides.login ? await overrides.login() : sessionFor(); if (!overrides.skipLoginEvent) emit('SIGNED_IN', session); return session },
    async signOutPrivate() { calls.logout += 1; if (overrides.logout) await overrides.logout(); emit('SIGNED_OUT', null) },
  }
  const controller = createAuthController(() => services)
  const unsubscribe = controller.subscribe(() => {})
  t.after(() => { unsubscribe(); controller.destroy() })
  return { controller, calls, emit, services, unsubscribe }
}

test('fresh and anonymous guests initialize without querying profiles or requiring login', async t => {
  for (const session of [null, sessionFor(ayesaId, true)]) {
    const { controller, calls } = setup(t, { session })
    await until(() => controller.getSnapshot().status === 'ready')
    assert.equal(controller.getSnapshot().role, null)
    assert.equal(calls.profiles.length, 0)
    assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'ayesa'), { kind: 'redirect', to: '/ayesa/login' })
    assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'admin'), { kind: 'redirect', to: '/admin/login' })
  }
})

test('permanent restoration shows loading until its one profile lookup completes', async t => {
  const pending = deferred()
  const { controller, calls } = setup(t, { session: sessionFor(), profile: () => pending.promise })
  await until(() => calls.profiles.length === 1)
  assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'ayesa'), { kind: 'loading' })
  assert.equal(controller.getSnapshot().role, null)
  pending.resolve(profileFor())
  await until(() => controller.getSnapshot().role === 'ayesa')
  assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'ayesa'), { kind: 'allowed' })
})

test('StrictMode subscribe/unsubscribe/resubscribe shares initialization and profile work', async t => {
  const { controller, calls, unsubscribe } = setup(t, { session: sessionFor() })
  unsubscribe()
  const second = controller.subscribe(() => {})
  t.after(second)
  await until(() => controller.getSnapshot().role === 'ayesa')
  assert.equal(calls.subscriptions, 1)
  assert.equal(calls.sessions, 1)
  assert.equal(calls.profiles.length, 1)
})

test('same-user auth events refresh the session without repeated profile requests', async t => {
  const { controller, calls, emit } = setup(t, { session: sessionFor() })
  await until(() => controller.getSnapshot().role === 'ayesa')
  for (const event of ['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED']) {
    assert.equal(emit(event, sessionFor()), undefined, 'auth callbacks remain synchronous')
  }
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(calls.profiles.length, 1)
  assert.equal(controller.getSnapshot().role, 'ayesa')
})

test('profile requests run after the auth callback returns, avoiding SDK callback reentry', async t => {
  let callbackActive = false
  const { controller, emit } = setup(t, { profile: user => { assert.equal(callbackActive, false); return profileFor(user.id) } })
  await until(() => controller.getSnapshot().status === 'ready')
  callbackActive = true
  emit('SIGNED_IN', sessionFor())
  callbackActive = false
  await until(() => controller.getSnapshot().role === 'ayesa')
})

test('wrong roles redirect to their own area regardless of the requested entrance', async t => {
  for (const [id, role, other] of [[ayesaId, 'ayesa', 'admin'], [adminId, 'admin', 'ayesa']]) {
    const { controller } = setup(t, { session: sessionFor(id) })
    await until(() => controller.getSnapshot().role === role)
    assert.deepEqual(getProtectedAccess(controller.getSnapshot(), other), { kind: 'redirect', to: `/${role}` })
    assert.equal(getPrivateArea(controller.getSnapshot().role), `/${role}`)
  }
})

test('missing profile, foreign profile, and invented roles deny private access', async t => {
  for (const profile of [null, profileFor(ayesaId, 'superadmin'), profileFor(adminId, 'admin')]) {
    const { controller } = setup(t, { session: sessionFor(), profile: () => profile })
    await until(() => controller.getSnapshot().status === 'ready')
    assert.equal(controller.getSnapshot().role, null)
    assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'ayesa'), { kind: 'denied' })
  }
  assert.equal(getPrivateArea('constructor'), null)
  assert.equal(getPrivateArea('toString'), null)
  assert.equal(isPermanentSession({ user: { id: ayesaId, email: 'private-test@example.invalid' } }), false)
})

test('profile failure grants no role and explicit retry can recover', async t => {
  const { controller, calls } = setup(t, { session: sessionFor(), profile: (user, count) => {
    if (count === 1) throw new Error('private response context')
    return profileFor(user.id)
  } })
  await until(() => controller.getSnapshot().error === 'profile-failed')
  assert.equal(controller.getSnapshot().role, null)
  assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'ayesa'), { kind: 'denied' })
  await controller.retry()
  await until(() => controller.getSnapshot().role === 'ayesa')
  assert.equal(calls.profiles.length, 2)
})

test('account switch clears the old role and discards a late old profile', async t => {
  const pending = deferred()
  const { controller, calls, emit } = setup(t, { session: sessionFor(), profile: user => user.id === ayesaId ? pending.promise : profileFor(adminId, 'admin') })
  await until(() => calls.profiles.length === 1)
  emit('SIGNED_IN', sessionFor(adminId))
  assert.equal(controller.getSnapshot().role, null)
  assert.equal(calls.profiles[0].signal.aborted, true)
  await until(() => controller.getSnapshot().role === 'admin')
  pending.resolve(profileFor())
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(controller.getSnapshot().role, 'admin')
  assert.equal(controller.getSnapshot().profile.id, adminId)
})

test('logout revokes routes immediately and a late profile cannot restore access', async t => {
  const pending = deferred()
  const { controller, calls } = setup(t, { session: sessionFor(), profile: () => pending.promise })
  await until(() => calls.profiles.length === 1)
  await controller.logout()
  assert.equal(controller.getSnapshot().session, null)
  assert.equal(controller.getSnapshot().role, null)
  pending.resolve(profileFor())
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(controller.getSnapshot().role, null)
  assert.equal(calls.logout, 1)
  assert.equal(calls.profiles.length, 1)
})

test('an older initialization result cannot replace a newer sign-in event', async t => {
  const pending = deferred()
  const { controller, calls, emit } = setup(t, { readSession: () => pending.promise })
  await until(() => calls.sessions === 1)
  emit('SIGNED_IN', sessionFor(adminId))
  await until(() => controller.getSnapshot().role === 'admin')
  pending.resolve(sessionFor(ayesaId, true))
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(controller.getSnapshot().role, 'admin')
})

test('SDK sign-out event revokes access even if the remote logout operation rejects', async t => {
  const { controller, services, emit } = setup(t, { session: sessionFor() })
  await until(() => controller.getSnapshot().role === 'ayesa')
  services.signOutPrivate = async () => { emit('SIGNED_OUT', null); throw new Error('Logout could not be confirmed') }
  await assert.rejects(controller.logout())
  assert.equal(controller.getSnapshot().role, null)
  assert.equal(controller.getSnapshot().session, null)
  assert.deepEqual(getProtectedAccess(controller.getSnapshot(), 'ayesa'), { kind: 'redirect', to: '/ayesa/login' })
})

test('sign-in updates roles once, and a newer logout beats a late sign-in result', async t => {
  const normal = setup(t, { session: sessionFor(ayesaId, true) })
  await until(() => normal.controller.getSnapshot().status === 'ready')
  await normal.controller.signIn({})
  await until(() => normal.controller.getSnapshot().role === 'ayesa')
  assert.equal(normal.calls.profiles.length, 1)
  const pending = deferred()
  const raced = setup(t, { login: () => pending.promise, skipLoginEvent: true })
  await until(() => raced.controller.getSnapshot().status === 'ready')
  const attempt = raced.controller.signIn({})
  await until(() => raced.calls.login === 1)
  raced.emit('SIGNED_OUT', null)
  pending.resolve(sessionFor())
  await attempt
  assert.equal(raced.controller.getSnapshot().session, null)
  assert.equal(raced.controller.getSnapshot().role, null)
})

test('module load timeout/late resolution cannot install an abandoned listener', async t => {
  const pending = deferred()
  const controller = createAuthController(() => pending.promise, 10)
  const unsubscribe = controller.subscribe(() => {})
  t.after(() => { unsubscribe(); controller.destroy() })
  await until(() => controller.getSnapshot().status === 'error')
  let installed = false
  pending.resolve({ getPrivateAuthClient() { installed = true; return {} } })
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(installed, false)
})

test('disposal unsubscribes and aborts profile work without later role restoration', async t => {
  const pending = deferred()
  const { controller, calls } = setup(t, { session: sessionFor(), profile: () => pending.promise })
  await until(() => calls.profiles.length === 1)
  controller.destroy()
  assert.equal(calls.unsubscribes, 1)
  assert.equal(calls.profiles[0].signal.aborted, true)
  pending.resolve(profileFor())
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(controller.getSnapshot().role, null)
})

test('removing the last subscriber releases its listener and discards pending profile work', async t => {
  const pending = deferred()
  const { controller, calls, unsubscribe } = setup(t, { session: sessionFor(), profile: () => pending.promise })
  await until(() => calls.profiles.length === 1)
  unsubscribe()
  await until(() => calls.unsubscribes === 1)
  assert.equal(calls.profiles[0].signal.aborted, true)
  pending.resolve(profileFor())
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(controller.getSnapshot().role, null)
})
