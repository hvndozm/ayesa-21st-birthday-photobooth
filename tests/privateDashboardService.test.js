import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { getBirthdayMessageCounts, getPhotostripCount, getBirthdayMessages, getPrivatePhotostrips,
  markBirthdayMessageRead, getPrivatePreviews, downloadPrivatePhotostrip, PrivateDashboardError, privateDataRequest } from '../src/services/privateDashboardService.js'
import { applyReadToPage, formatBirthdayDate, resolveMemoryLabels, memoryDownloadName } from '../src/utils/birthdayDashboard.js'
import { getProtectedAccess } from '../src/auth/authAccess.js'

function fixture(respond = () => ({ data: [], count: 0, error: null })) {
  const calls = []
  const client = {
    from(table) {
      const call = { table, steps: [] }
      calls.push(call)
      const query = {}
      for (const method of ['select', 'eq', 'order', 'range', 'update', 'maybeSingle']) {
        query[method] = (...args) => { call.steps.push([method, ...args]); return query }
      }
      query.abortSignal = signal => { call.signal = signal; return respond(call) }
      return query
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'photostrips')
      return {
        createSignedUrls(paths, expiresIn) {
          const call = { operation: 'sign', paths, expiresIn }
          calls.push(call)
          return respond(call)
        },
        download(path, options, parameters) {
          const call = { operation: 'download', path, options, signal: parameters.signal }
          calls.push(call)
          return respond(call)
        },
      }
    } },
  }
  return { client, calls }
}
const memory = { id: 'test-memory', storage_path: 'private-owner/secret-file.png', format_id: '2x6',
  design_id: '2x6-sweet-bow', width: 600, height: 1800, created_at: '2026-10-08T06:35:00Z' }

test('overview counts are exact HEAD queries and fetch neither collections nor images', async () => {
  const { client, calls } = fixture(call => ({ count: call.steps.some(step => step[0] === 'eq') ? 3 : 12, error: null }))
  assert.deepEqual(await getBirthdayMessageCounts({ client }), { total: 12, unread: 3 })
  assert.deepEqual(await getPhotostripCount({ client }), { total: 12 })
  assert.equal(calls.length, 3)
  for (const call of calls) assert.deepEqual(call.steps[0], ['select', 'id', { count: 'exact', head: true }])
  assert.deepEqual(calls[1].steps[1], ['eq', 'is_read', false])
})

test('zero counts are valid, and one count failure does not prevent the other card loading', async () => {
  const { client } = fixture(call => call.table === 'birthday_messages'
    ? { error: { code: '42501', message: 'PRIVATE CONTENT SHOULD NOT ESCAPE' } } : { count: 0 })
  const results = await Promise.allSettled([getBirthdayMessageCounts({ client }), getPhotostripCount({ client })])
  assert.equal(results[0].status, 'rejected')
  assert.deepEqual(results[1].value, { total: 0 })
  assert.equal(results[0].reason.code, '42501')
  assert.equal(JSON.stringify(results[0].reason).includes('PRIVATE CONTENT'), false)
})

test('message queries select only letter fields, use newest-first stable ordering, and paginate 50', async () => {
  const items = Array.from({ length: 50 }, (_, id) => ({ id }))
  const { client, calls } = fixture(() => ({ data: items, count: 51 }))
  const page = await getBirthdayMessages({ client })
  assert.equal(page.items.length, 50)
  assert.equal(page.hasMore, true)
  assert.equal(page.nextOffset, 50)
  assert.deepEqual(calls[0].steps, [
    ['select', 'id,nickname,message,is_read,created_at', { count: 'exact' }],
    ['order', 'created_at', { ascending: false }], ['order', 'id', { ascending: false }], ['range', 0, 49],
  ])
  await getBirthdayMessages({ client, offset: 50 })
  assert.deepEqual(calls[1].steps.at(-1), ['range', 50, 99])
})

test('All/Unread/Read filters scope the entire server collection, including later pages', async () => {
  const { client, calls } = fixture()
  for (const filter of ['all', 'unread', 'read']) await getBirthdayMessages({ client, filter, offset: 50 })
  assert.equal(calls[0].steps.some(step => step[0] === 'eq'), false)
  assert.deepEqual(calls[1].steps[1], ['eq', 'is_read', false])
  assert.deepEqual(calls[2].steps[1], ['eq', 'is_read', true])
})

test('empty message/gallery pages are successful, not errors or endless pagination', async () => {
  const { client } = fixture()
  for (const load of [getBirthdayMessages, getPrivatePhotostrips]) {
    assert.deepEqual(await load({ client }), { items: [], nextOffset: 0, hasMore: false })
  }
})

test('mark read changes only is_read for one ID and requires a confirmed returned row', async () => {
  const { client, calls } = fixture(() => ({ data: { id: 'letter', is_read: true } }))
  assert.deepEqual(await markBirthdayMessageRead('letter', { client }), { id: 'letter', is_read: true })
  assert.deepEqual(calls[0].steps, [['update', { is_read: true }], ['eq', 'id', 'letter'], ['select', 'id,is_read'], ['maybeSingle']])
  for (const data of [null, { id: 'different', is_read: true }, { id: 'letter', is_read: false }]) {
    const { client: denied } = fixture(() => ({ data }))
    await assert.rejects(markBirthdayMessageRead('letter', { client: denied }), PrivateDashboardError)
  }
})

test('successful read updates are immutable and adjust Unread pagination without skipping a letter', () => {
  const original = { items: [{ id: 'a', is_read: false, message: 'keep intact' }, { id: 'b', is_read: true }], nextOffset: 50, hasMore: true }
  const all = applyReadToPage(original, 'a', 'all')
  assert.equal(all.items[0].is_read, true)
  assert.equal(original.items[0].is_read, false)
  assert.equal(all.items[0].message, 'keep intact')
  assert.equal(all.nextOffset, 50)
  const unread = applyReadToPage(original, 'a', 'unread')
  assert.deepEqual(unread.items.map(item => item.id), ['b'])
  assert.equal(unread.nextOffset, 49)
  assert.equal(applyReadToPage(all, 'a', 'all'), all)
})

test('gallery metadata selects only needed fields and paginates 24 newest-first', async () => {
  const { client, calls } = fixture(() => ({ data: [memory], count: 25 }))
  const page = await getPrivatePhotostrips({ client, offset: 24 })
  assert.equal(page.hasMore, false)
  assert.deepEqual(calls[0].steps[0], ['select', 'id,storage_path,format_id,design_id,width,height,created_at', { count: 'exact' }])
  assert.deepEqual(calls[0].steps.at(-1), ['range', 24, 47])
})

test('signed previews batch private paths for ten minutes and tolerate individual missing files', async () => {
  const { client, calls } = fixture(call => ({ data: [{ path: call.paths[0], signedUrl: 'https://example.invalid/temporary-preview' },
    { path: call.paths[1], signedUrl: null, error: 'not found' }] }))
  const result = await getPrivatePreviews([memory, { ...memory, id: 'missing', storage_path: 'private-owner/missing.png' }], { client })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].expiresIn, 600)
  assert.equal(result[memory.id].status, 'ready')
  assert.ok(result[memory.id].expiresAt > Date.now() + 590_000)
  assert.deepEqual(result.missing, { status: 'unavailable' })
  assert.deepEqual(await getPrivatePreviews([], { client }), {})
})

test('private original download returns the same Blob, with no resize/transform or public URL', async () => {
  const original = new Blob(['exact original file'], { type: 'image/png' })
  const { client, calls } = fixture(() => ({ data: original }))
  assert.equal(await downloadPrivatePhotostrip(memory.storage_path, { client }), original)
  assert.equal(calls[0].path, memory.storage_path)
  assert.deepEqual(calls[0].options, {})
  assert.equal(calls[0].signal.aborted, false)
})

test('download and data errors expose safe diagnostics, never raw Storage paths or letter contents', async () => {
  const { client } = fixture(() => ({ error: { code: '42501', status: 403, message: 'secret/path.png PRIVATE LETTER CONTENT' } }))
  for (const operation of [() => getBirthdayMessages({ client }), () => getPrivatePhotostrips({ client }),
    () => markBirthdayMessageRead('id', { client }), () => downloadPrivatePhotostrip(memory.storage_path, { client })]) {
    await assert.rejects(operation(), error => error instanceof PrivateDashboardError && error.code === '42501'
      && error.status === 403 && !JSON.stringify(error).includes('secret/path'))
  }
})

test('timeouts cover the full private download and abort its request', async () => {
  const { client, calls } = fixture(() => new Promise(() => {}))
  await assert.rejects(downloadPrivatePhotostrip(memory.storage_path, { client, timeoutMs: 5 }), PrivateDashboardError)
  assert.equal(calls[0].signal.aborted, true)
})

test('session/page cancellation aborts pending reads; cancelled work cannot report success', async () => {
  const { client, calls } = fixture(() => new Promise(() => {}))
  const controller = new AbortController()
  const pending = getBirthdayMessages({ client, signal: controller.signal })
  await new Promise(resolve => setTimeout(resolve, 1))
  controller.abort()
  await assert.rejects(pending, PrivateDashboardError)
  assert.equal(calls[0].signal.aborted, true)
  const aborted = new AbortController()
  aborted.abort()
  await assert.rejects(getPrivatePhotostrips({ client, signal: aborted.signal }), PrivateDashboardError)
  assert.equal(calls.length, 1)
})

test('cancelling a queued private write prevents its non-abortable Storage operation from starting', async () => {
  const controller = new AbortController()
  let started = false
  const pending = privateDataRequest('UPLOAD', 'template-designs Storage', () => {
    started = true
    return { data: {} }
  }, { client: {}, signal: controller.signal, write: true })
  controller.abort()
  await assert.rejects(pending, PrivateDashboardError)
  assert.equal(started, false)
})

test('central labels preserve all three output proportions and have friendly unknown fallbacks', () => {
  for (const [format_id, width, height] of [['2x6', 600, 1800], ['6x4', 1800, 1200], ['4x6', 1200, 1800]]) {
    const labels = resolveMemoryLabels({ ...memory, format_id, design_id: `${format_id}-sweet-bow`, width, height })
    assert.equal(labels.width / labels.height, width / height)
    assert.equal(labels.designName, 'Sweet Bow')
  }
  const unknown = { ...memory, format_id: 'private-id', design_id: 'unknown-id' }
  assert.equal(resolveMemoryLabels(unknown).formatName, 'Birthday photostrip')
  assert.equal(resolveMemoryLabels(unknown).designName, 'Birthday design')
  assert.match(memoryDownloadName(memory), /^ayesa-memory-2x6-2026-10-\d{2}\.png$/)
  assert.equal(memoryDownloadName(unknown).includes('private-id'), false)
  assert.equal(formatBirthdayDate('invalid'), 'A birthday moment')
  assert.equal(typeof formatBirthdayDate(memory.created_at, true), 'string')
})

test('all Ayesa routes share the strict role guard: anonymous/session loss redirects and Admin goes to Admin', async () => {
  const id = '10000000-0000-4000-8000-000000000001'
  const auth = { status: 'ready', session: { user: { id, is_anonymous: false } }, profile: { id, role: 'ayesa' } }
  assert.deepEqual(getProtectedAccess(auth, 'ayesa'), { kind: 'allowed' })
  assert.deepEqual(getProtectedAccess({ ...auth, session: null }, 'ayesa'), { kind: 'redirect', to: '/ayesa/login' })
  assert.deepEqual(getProtectedAccess({ ...auth, session: { user: { id, is_anonymous: true } } }, 'ayesa'), { kind: 'redirect', to: '/ayesa/login' })
  assert.deepEqual(getProtectedAccess({ ...auth, profile: { id, role: 'admin' } }, 'ayesa'), { kind: 'redirect', to: '/admin' })
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /path="\/ayesa" element={<ProtectedRoute role="ayesa">[\s\S]*?<Route path="messages"[\s\S]*?<Route path="gallery"/)
  assert.match(app, /path="\/admin" element={<ProtectedRoute role="admin">[\s\S]*?<AdminDashboardLayout/)
})

test('private services contain no public URL API or manual public Storage endpoint', async () => {
  const source = await readFile(new URL('../src/services/privateDashboardService.js', import.meta.url), 'utf8')
  assert.equal(source.includes('getPublicUrl'), false)
  assert.equal(source.includes('/object/public/'), false)
})
