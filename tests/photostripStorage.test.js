import assert from 'node:assert/strict'
import test from 'node:test'
import { createBoundedFetch, getSupabaseClient, isSupabaseConfigurationValid } from '../src/lib/supabaseClient.js'
import { ensureGuestSession, PhotostripSaveError, savePhotostrip } from '../src/services/photostripStorage.js'
import { photoboothFormats } from '../src/data/photoboothFormats.js'
import { photoboothFilters } from '../src/data/photoboothFilters.js'

const userId = '10000000-0000-4000-8000-000000000001'
const guestSession = { user: { id: userId, is_anonymous: true } }

function finalResult(format = photoboothFormats[0]) {
  return { blob: new Blob(['test-only PNG stand-in'], { type: 'image/png' }),
    formatId: format.id, designId: `${format.id}-sweet-bow`, width: format.canvasWidth, height: format.canvasHeight }
}

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

function fakeClient(overrides = {}) {
  const calls = { sessions: 0, anonymous: 0, uploads: [], inserts: [], removals: [], signals: [] }
  let currentSession = overrides.session === undefined ? guestSession : overrides.session
  const client = {
    auth: {
      async getSession() {
        calls.sessions += 1
        if (overrides.getSession) return overrides.getSession()
        return { data: { session: currentSession }, error: overrides.sessionError ?? null }
      },
      async signInAnonymously() {
        calls.anonymous += 1
        const response = overrides.signIn ? await overrides.signIn()
          : { data: { session: guestSession }, error: null }
        if (response.data?.session) currentSession = response.data.session
        return response
      },
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'photostrips')
        return {
          async upload(path, blob, options) {
            calls.uploads.push({ path, blob, options })
            return overrides.upload ? overrides.upload() : { data: { path }, error: null }
          },
          async remove(paths) {
            calls.removals.push(paths)
            return overrides.remove ? overrides.remove() : { data: [{ name: paths[0] }], error: null }
          },
        }
      },
    },
    from(table) {
      assert.equal(table, 'photostrips')
      return {
        insert(row) {
          calls.inserts.push(row)
          return {
            abortSignal(signal) {
              calls.signals.push(signal)
              return overrides.insert ? overrides.insert(signal) : Promise.resolve({ error: null, status: 201 })
            },
          }
        },
      }
    },
  }
  return { client, calls }
}

test('missing and malformed configuration stay unavailable without a Vite environment', async () => {
  assert.equal(getSupabaseClient(), null)
  for (const config of [undefined, {}, { url: 'bad', publishableKey: 'bad' },
    { url: 'https://example.supabase.co', publishableKey: 'sb_secret_forbidden_for_tests' },
    { url: 'https://example.supabase.co', publishableKey: 'eyJhbGciOiJIUzI1NiJ9.test.signature' },
    { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_' },
    { url: 'http://example.supabase.co', publishableKey: 'sb_publishable_placeholder_only_for_tests' },
    { url: 'https://example.supabase.co?unsafe=true', publishableKey: 'sb_publishable_placeholder_only_for_tests' }]) {
    assert.equal(isSupabaseConfigurationValid(config), false)
  }
  assert.equal(isSupabaseConfigurationValid({ url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_placeholder_only_for_tests' }), true)
  await assert.rejects(savePhotostrip(finalResult(), { client: null }),
    (error) => error.code === 'configuration-unavailable')
})

test('existing anonymous and permanent sessions are reused without another sign-in', async () => {
  for (const isAnonymous of [true, false]) {
    const existing = { user: { id: userId, is_anonymous: isAnonymous } }
    const { client, calls } = fakeClient({ session: existing })
    assert.equal(await ensureGuestSession({ client }), existing)
    assert.equal(await ensureGuestSession({ client }), existing)
    assert.equal(calls.anonymous, 0)
  }
})

test('concurrent callers share one anonymous sign-in and later saves reuse that session', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ session: null, signIn: () => pending.promise })
  const first = ensureGuestSession({ client })
  const second = ensureGuestSession({ client })
  await Promise.resolve()
  assert.equal(calls.anonymous, 1)
  pending.resolve({ data: { session: guestSession }, error: null })
  assert.equal(await first, guestSession)
  assert.equal(await second, guestSession)
  await ensureGuestSession({ client })
  assert.equal(calls.anonymous, 1)
})

test('an auth timeout retains single-flight work until the original request settles', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ session: null, signIn: () => pending.promise })
  await assert.rejects(ensureGuestSession({ client, timeoutMs: 10 }), (error) => error.code === 'timeout')
  await assert.rejects(ensureGuestSession({ client, timeoutMs: 10 }), (error) => error.code === 'timeout')
  assert.equal(calls.anonymous, 1)
  pending.resolve({ data: { session: guestSession }, error: null })
  assert.equal(await ensureGuestSession({ client }), guestSession)
  assert.equal(calls.anonymous, 1)
})

test('session lookup failure or a malformed non-null session never triggers anonymous replacement', async () => {
  for (const override of [
    { sessionError: { status: 403, message: 'private response context' } },
    { session: { user: { id: 'invalid' } } },
  ]) {
    const { client, calls } = fakeClient(override)
    await assert.rejects(ensureGuestSession({ client }), PhotostripSaveError)
    assert.equal(calls.anonymous, 0)
  }
})

test('anonymous sign-in failure is sanitized and a subsequent intentional attempt can succeed', async () => {
  let attempts = 0
  const { client, calls } = fakeClient({ session: null, signIn: () => {
    attempts += 1
    return attempts === 1
      ? { data: { session: null }, error: { code: 'anonymous_provider_disabled', message: 'private response context' } }
      : { data: { session: guestSession }, error: null }
  } })
  await assert.rejects(ensureGuestSession({ client }), (error) =>
    error.technicalCause === 'Anonymous sign-ins are disabled in Supabase Auth.' && !error.message.includes('private'))
  await ensureGuestSession({ client })
  assert.equal(calls.anonymous, 2)
})

test('each format uploads its exact existing PNG Blob once and inserts only its validated metadata', async () => {
  for (const format of photoboothFormats) {
    const { client, calls } = fakeClient()
    const result = finalResult(format)
    const saved = await savePhotostrip(result, { client })
    assert.equal(calls.uploads.length, 1)
    assert.equal(calls.inserts.length, 1)
    assert.equal(calls.removals.length, 0)
    assert.equal(calls.uploads[0].blob, result.blob)
    assert.deepEqual(calls.uploads[0].options, { contentType: 'image/png', upsert: false })
    assert.match(saved.storagePath, new RegExp(`^${userId}/[0-9a-f-]{36}\\.png$`))
    assert.equal(saved.ownerId, userId)
    assert.deepEqual(calls.inserts[0], { owner_id: userId, storage_path: saved.storagePath,
      format_id: format.id, design_id: result.designId, width: format.canvasWidth, height: format.canvasHeight, filter_id: 'original' })
  }
})

test('all five filters save their selected metadata while uploading only the final flattened PNG', async () => {
  for (const filter of photoboothFilters) {
    const { client, calls } = fakeClient()
    const result = { ...finalResult(), filterId: filter.id }
    await savePhotostrip(result, { client })
    assert.equal(calls.inserts[0].filter_id, filter.id)
    assert.equal(calls.uploads.length, 1)
    assert.equal(calls.uploads[0].blob, result.blob)
    assert.equal(calls.inserts[0].blob, undefined)
    assert.equal(calls.inserts[0].photos, undefined)
    assert.equal(calls.inserts[0].design, undefined)
  }
})

test('validated custom snapshots save stable UUID IDs in all formats without uploading template artwork', async () => {
  const designId = '10000000-0000-4000-8000-000000000104'
  const overlayBlob = new Blob(['custom artwork stand-in'], { type: 'image/png' })
  for (const format of photoboothFormats) {
    const { client, calls } = fakeClient()
    const design = { id: designId, formatId: format.id, name: 'Custom birthday ribbons', source: 'custom',
      storagePath: `${format.id}/10000000-0000-4000-8000-000000000105.png`, isActive: true, overlayBlob }
    const result = { ...finalResult(format), designId, design, filterId: 'mono' }
    await savePhotostrip(result, { client })
    assert.equal(calls.inserts[0].design_id, designId)
    assert.equal(calls.inserts[0].filter_id, 'mono')
    assert.equal(calls.uploads.length, 1)
    assert.equal(calls.uploads[0].blob, result.blob)
    assert.notEqual(calls.uploads[0].blob, overlayBlob)
    assert.equal('storagePath' in calls.inserts[0], false)
    assert.equal('overlayBlob' in calls.inserts[0], false)
    assert.equal('design' in calls.inserts[0], false)
  }
})

test('unknown filters and unvalidated/inactive/incompatible custom UUIDs fail before authentication or Storage', async () => {
  const designId = '10000000-0000-4000-8000-000000000104'
  const custom = { id: designId, formatId: '2x6', source: 'custom', isActive: true,
    storagePath: '2x6/10000000-0000-4000-8000-000000000105.png' }
  const result = { ...finalResult(), designId, design: custom }
  for (const invalid of [{ ...finalResult(), filterId: 'sepia' }, { ...finalResult(), filterId: null },
    { ...result, design: undefined }, { ...result, design: { ...custom, isActive: false } },
    { ...result, design: { ...custom, formatId: '6x4' } }, { ...result, design: { ...custom, source: 'builtin' } },
    { ...result, design: { ...custom, storagePath: '2x6/../secret.png' } },
    { ...result, design: { ...custom, id: '10000000-0000-4000-8000-000000000106' } }]) {
    const { client, calls } = fakeClient()
    await assert.rejects(savePhotostrip(invalid, { client }), error => error.code === 'invalid-result' && !error.retryable)
    assert.equal(calls.sessions, 0)
    assert.deepEqual(calls.uploads, [])
    assert.deepEqual(calls.inserts, [])
  }
})

test('separate results receive distinct private paths without overwriting', async () => {
  const { client, calls } = fakeClient()
  await savePhotostrip(finalResult(), { client })
  await savePhotostrip(finalResult(), { client })
  assert.notEqual(calls.uploads[0].path, calls.uploads[1].path)
  assert.ok(calls.uploads.every(({ options }) => options.upsert === false))
})

test('invalid MIME type, empty output, incompatible design, or wrong dimensions prevent network work', async () => {
  const result = finalResult()
  for (const input of [
    { ...result, blob: new Blob(['raw photo'], { type: 'image/jpeg' }) },
    { ...result, blob: new Blob([], { type: 'image/png' }) },
    { ...result, designId: '4x6-sweet-bow' }, { ...result, width: 599 },
  ]) {
    const { client, calls } = fakeClient()
    await assert.rejects(savePhotostrip(input, { client }), (error) => error.code === 'invalid-result')
    assert.equal(calls.sessions + calls.uploads.length + calls.inserts.length, 0)
  }
})

test('a definite Storage rejection prevents metadata insertion and reports RLS without raw details', async () => {
  const { client, calls } = fakeClient({ upload: () => ({ error: { statusCode: '403',
    message: 'new row violates row-level security policy; private response context' } }) })
  await assert.rejects(savePhotostrip(finalResult(), { client }), (error) =>
    error.code === 'rls-denied' && error.stage === 'upload' && error.retryable
    && error.technicalCause.includes('HTTP 403') && !error.technicalCause.includes('private'))
  assert.equal(calls.inserts.length, 0)
  assert.equal(calls.removals.length, 0)
})

test('a definite metadata rejection attempts to delete only the newly uploaded object', async () => {
  const { client, calls } = fakeClient({ insert: () => Promise.resolve({
    error: { code: '42501', message: 'private response context' }, status: 403 }) })
  await assert.rejects(savePhotostrip(finalResult(), { client }), (error) =>
    error.code === 'rls-denied' && error.stage === 'metadata' && error.cleanupFailed === false)
  assert.deepEqual(calls.removals, [[calls.uploads[0].path]])
})

test('failed cleanup preserves the primary metadata failure and safe cleanup diagnostics', async () => {
  const { client, calls } = fakeClient({ insert: () => Promise.resolve({
    error: { code: '23514', message: 'private response context' }, status: 400 }),
  remove: () => ({ error: { statusCode: '403', message: 'row-level security private response context' } }) })
  await assert.rejects(savePhotostrip(finalResult(), { client }), (error) =>
    error.stage === 'metadata' && error.cleanupFailed === true
    && error.technicalCause.includes('23514') && error.cleanupTechnicalCause.includes('row-level security')
    && !error.cleanupTechnicalCause.includes('private'))
  assert.equal(calls.removals.length, 1)
})

test('an empty removal response is cleanup-unconfirmed rather than proof the orphan was deleted', async () => {
  const { client } = fakeClient({ insert: () => Promise.resolve({ error: { code: '23502' }, status: 400 }),
    remove: () => ({ data: [], error: null }) })
  await assert.rejects(savePhotostrip(finalResult(), { client }), (error) =>
    error.cleanupFailed === true && error.cleanupTechnicalCause.includes('returned no deleted object'))
})

test('upload timeout ends the attempt without inserting metadata or enabling a blind duplicate retry', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ upload: () => pending.promise })
  await assert.rejects(savePhotostrip(finalResult(), { client, timeoutMs: 10 }), (error) =>
    error.code === 'outcome-unknown' && error.stage === 'upload' && error.retryable === false)
  assert.equal(calls.inserts.length, 0)
  pending.resolve({ data: {}, error: null })
})

test('metadata timeout aborts its request without deleting an image whose row may have committed', async () => {
  const pending = deferred()
  const { client, calls } = fakeClient({ insert: () => pending.promise })
  await assert.rejects(savePhotostrip(finalResult(), { client, timeoutMs: 10 }), (error) =>
    error.code === 'outcome-unknown' && error.stage === 'metadata' && error.retryable === false)
  assert.equal(calls.signals[0].aborted, true)
  assert.equal(calls.removals.length, 0)
  pending.resolve({ error: null, status: 201 })
})

test('PostgREST status zero and Storage network errors are uncertain write outcomes', async () => {
  for (const override of [
    { insert: () => Promise.resolve({ status: 0, error: { code: '', message: 'TypeError: Failed to fetch' } }) },
    { upload: () => ({ error: { name: 'StorageUnknownError', message: 'private response context' } }) },
  ]) {
    const { client, calls } = fakeClient(override)
    await assert.rejects(savePhotostrip(finalResult(), { client }), (error) =>
      error.code === 'outcome-unknown' && !error.retryable && !error.technicalCause.includes('private'))
    assert.equal(calls.removals.length, 0)
  }
})

test('a normal failed save can be manually retried with a new unique path', async () => {
  let uploads = 0
  const { client, calls } = fakeClient({ upload: () => {
    uploads += 1
    return uploads === 1 ? { error: { statusCode: '400' } } : { error: null, data: {} }
  } })
  await assert.rejects(savePhotostrip(finalResult(), { client }), (error) => error.retryable)
  await savePhotostrip(finalResult(), { client })
  assert.equal(calls.inserts.length, 1)
  assert.notEqual(calls.uploads[0].path, calls.uploads[1].path)
})

test('bounded fetch aborts a stalled request and emits a fixed timeout error', async () => {
  let signal
  const request = createBoundedFetch(async (_, options) => {
    signal = options.signal
    return new Promise(() => {})
  }, 10)
  await assert.rejects(request('https://example.invalid'), (error) =>
    error.name === 'SupabaseRequestTimeoutError' && error.message === 'Gallery request timed out.')
  assert.equal(signal.aborted, true)
})

test('the fetch deadline remains active when JSON headers arrived but the body is stalled', async () => {
  const request = createBoundedFetch(async () => new Response(new ReadableStream({ start() {} }),
    { headers: { 'content-type': 'application/json' } }), 10)
  await assert.rejects(request('https://example.invalid'), (error) => error.name === 'SupabaseRequestTimeoutError')
})

test('bounded fetch preserves existing caller cancellation and complete JSON responses', async () => {
  const caller = new AbortController()
  let receivedSignal
  const request = createBoundedFetch(async (_, options) => {
    receivedSignal = options.signal
    return new Response('{"ok":true}', { status: 201, headers: { 'content-type': 'application/json' } })
  })
  caller.abort()
  const response = await request('https://example.invalid', { signal: caller.signal })
  assert.equal(receivedSignal.aborted, true)
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { ok: true })
})

test('bodyless JSON responses remain successful after bounded fetch wrapping', async () => {
  for (const status of [204, 205, 304]) {
    const request = createBoundedFetch(async () => new Response(null,
      { status, headers: { 'content-type': 'application/json' } }))
    const response = await request('https://example.invalid')
    assert.equal(response.status, status)
    assert.equal(await response.text(), '')
  }
})
