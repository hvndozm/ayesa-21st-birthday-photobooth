import assert from 'node:assert/strict'
import test from 'node:test'
import { loadOwnProfile, readExistingSession, signInPrivate, signOutPrivate } from '../src/services/privateAuthService.js'
import { ensureGuestSession } from '../src/services/photostripStorage.js'

const guestId = '10000000-0000-4000-8000-000000000071'
const ownerId = '10000000-0000-4000-8000-000000000072'
const guest = { user: { id: guestId, is_anonymous: true } }
const permanent = { user: { id: ownerId, is_anonymous: false } }
const credentials = () => ({ email: 'private-test@example.invalid', password: crypto.randomUUID() })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

function fakeClient(overrides = {}) {
  let session = overrides.session === undefined ? permanent : overrides.session
  const calls = { anonymous: 0, password: 0, logout: 0, profiles: 0, columns: null, ownerFilter: null, signal: null }
  const client = {
    auth: {
      async getSession() { return { data: { session }, error: overrides.sessionError ?? null } },
      async signInAnonymously() {
        calls.anonymous += 1
        if (overrides.guestWait) await overrides.guestWait
        session = guest
        return { data: { session }, error: null }
      },
      async signInWithPassword(input) {
        calls.password += 1
        calls.emailTrimmed = input.email === 'private-test@example.invalid'
        calls.passwordSupplied = typeof input.password === 'string' && input.password.length > 0
        if (overrides.loginWait) await overrides.loginWait
        if (overrides.loginError) return { data: { session: null }, error: overrides.loginError }
        session = overrides.loginSession ?? permanent
        return { data: { session }, error: null }
      },
      async signOut() { calls.logout += 1; if (!overrides.logoutError) session = null; return { error: overrides.logoutError ?? null } },
      signUp() { assert.fail('Permanent registration is outside scope') },
    },
    from(table) {
      assert.equal(table, 'profiles')
      calls.profiles += 1
      const query = {
        select(columns) { calls.columns = columns; return query },
        eq(column, value) { assert.equal(column, 'id'); calls.ownerFilter = value; return query },
        maybeSingle() { return query },
        abortSignal(signal) { calls.signal = signal; return overrides.profileRequest
          ? overrides.profileRequest : Promise.resolve({ data: overrides.profile === undefined
            ? { id: ownerId, role: 'ayesa', display_name: ' Ayesa ' } : overrides.profile, error: overrides.profileError ?? null }) },
        insert() { assert.fail('Profiles are read-only') },
        update() { assert.fail('Profile roles must never be updated by this client') },
        delete() { assert.fail('Profiles must never be deleted by this client') },
      }
      return query
    },
  }
  return { client, calls }
}

test('profile lookup selects only the current permanent owner and validates its role', async () => {
  const { client, calls } = fakeClient()
  assert.deepEqual(await loadOwnProfile(permanent.user, { client }), { id: ownerId, role: 'ayesa', display_name: 'Ayesa' })
  assert.equal(calls.profiles, 1)
  assert.equal(calls.columns, 'id, display_name, role')
  assert.equal(calls.ownerFilter, ownerId)
})

test('anonymous/unknown users never query profiles or acquire a private role', async () => {
  const { client, calls } = fakeClient()
  for (const user of [guest.user, undefined, { id: ownerId, email: 'private-test@example.invalid' }, { id: 'invalid', is_anonymous: false }]) {
    assert.equal(await loadOwnProfile(user, { client }), null)
  }
  assert.equal(calls.profiles, 0)
})

test('missing, foreign-owner, and invalid-role profiles do not grant access', async () => {
  for (const profile of [null, { id: ownerId, role: 'owner' }, { id: guestId, role: 'admin' }, { id: ownerId, role: 'ADMIN' }]) {
    const { client } = fakeClient({ profile })
    assert.equal(await loadOwnProfile(permanent.user, { client }), null)
  }
})

test('own-profile RLS errors preserve only fixed technical diagnostics', async () => {
  const { client } = fakeClient({ profileError: { code: '42501', message: 'private response context' } })
  await assert.rejects(loadOwnProfile(permanent.user, { client }), error =>
    error.code === 'profile-failed' && error.technicalCause.includes('42501') && !error.technicalCause.includes('private response'))
})

test('profile network stalls are bounded and abort their owner-filtered request', async () => {
  const { client, calls } = fakeClient({ profileRequest: new Promise(() => {}) })
  await assert.rejects(loadOwnProfile(permanent.user, { client, timeoutMs: 10 }), error => error.code === 'profile-failed')
  assert.equal(calls.signal.aborted, true)
})

test('password login replaces an anonymous session and never creates a permanent account', async () => {
  const { client, calls } = fakeClient({ session: guest })
  const input = credentials()
  input.email = '  ' + input.email + '  '
  assert.equal(await signInPrivate(input, { client }), permanent)
  assert.equal(await readExistingSession(client), permanent)
  assert.equal(calls.password, 1)
  assert.equal(calls.anonymous, 0)
  assert.equal(calls.emailTrimmed, true)
  assert.equal(calls.passwordSupplied, true)
})

test('invalid credentials and non-permanent login responses are denied without raw errors', async () => {
  const { client } = fakeClient({ loginError: { code: 'invalid_credentials', message: 'private response context' } })
  await assert.rejects(signInPrivate(credentials(), { client }), error =>
    error.code === 'invalid-credentials' && !error.message.includes('private response') && !error.technicalCause.includes('private response'))
  const anonymousResponse = fakeClient({ loginSession: guest })
  await assert.rejects(signInPrivate(credentials(), { client: anonymousResponse.client }), error => error.code === 'sign-in-failed')
})

test('logout uses the SDK and leaves no automatically created anonymous session', async () => {
  const { client, calls } = fakeClient()
  await signOutPrivate({ client })
  assert.equal(calls.logout, 1)
  assert.equal(calls.anonymous, 0)
  assert.equal(await readExistingSession(client), null)
})

test('older guest creation completes before private login, so permanent session wins', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ session: null, guestWait: pending.promise })
  const guestAttempt = ensureGuestSession({ client })
  const privateAttempt = signInPrivate(credentials(), { client })
  await new Promise(resolve => setTimeout(resolve, 1))
  assert.equal(calls.anonymous, 1)
  assert.equal(calls.password, 0)
  pending.resolve()
  await Promise.all([guestAttempt, privateAttempt])
  assert.equal(await readExistingSession(client), permanent)
  assert.equal(calls.password, 1)
})

test('guest features wait for pending private login and reuse the permanent result', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ session: null, loginWait: pending.promise })
  const privateAttempt = signInPrivate(credentials(), { client })
  await new Promise(resolve => setTimeout(resolve, 1))
  const guestAttempt = ensureGuestSession({ client })
  pending.resolve()
  await privateAttempt
  assert.equal(await guestAttempt, permanent)
  assert.equal(calls.anonymous, 0)
})

test('queued sign-in that expired never submits its input later', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ session: null, guestWait: pending.promise })
  const guestAttempt = ensureGuestSession({ client })
  await assert.rejects(signInPrivate(credentials(), { client, timeoutMs: 10 }), error => error.code === 'sign-in-failed')
  pending.resolve()
  await guestAttempt
  await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(calls.password, 0)
})

test('configuration/session/logout failures are safe and do not invoke guest creation', async () => {
  await assert.rejects(signInPrivate(credentials(), { client: null }), error => error.code === 'configuration-unavailable')
  const { client, calls } = fakeClient({ sessionError: { message: 'private response context' }, logoutError: { message: 'private response context' } })
  await assert.rejects(readExistingSession(client), error => error.code === 'initialization-failed')
  await assert.rejects(signOutPrivate({ client }), error => error.code === 'sign-out-failed' && !error.message.includes('private response'))
  assert.equal(calls.anonymous, 0)
})
