import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { getTemplateDesignCounts, getTemplateDesigns, uploadTemplateDesign, setTemplateDesignActive, deleteTemplateDesign } from '../src/services/templateDesignService.js'
import { validateTemplatePng, validateTemplateFileBasics, validateTemplateName, templateSlug, MAX_TEMPLATE_BYTES, TemplateValidationError } from '../src/utils/templateValidation.js'
import { createTemplatePreview, templateErrorMessage } from '../src/utils/templateManagement.js'
import { getPrivatePreviews } from '../src/services/privateDashboardService.js'
import { getProtectedAccess } from '../src/auth/authAccess.js'

const adminId = '10000000-0000-4000-8000-000000000091'
const designId = '10000000-0000-4000-8000-000000000092'
const path = '2x6/10000000-0000-4000-8000-000000000093.png'
const design = { id: designId, name: 'Sweet Bow', format_id: '2x6', storage_path: path, is_active: true }
const sizes = { '2x6': [600, 1800], '6x4': [1800, 1200], '4x6': [1200, 1800] }

// Header fixture for Node validation; browser checks exercise actual PNG decoding.
function pngFile(width = 600, height = 1800, { name = 'artwork.png', type = 'image/png', size = 33 } = {}) {
  const bytes = new Uint8Array(size)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  const header = new DataView(bytes.buffer)
  header.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12)
  header.setUint32(16, width); header.setUint32(20, height)
  return new File([bytes], name, { type })
}
const validation = { decode: async file => {
  const buffer = await file.slice(0, 33).arrayBuffer()
  return { width: new DataView(buffer).getUint32(16), height: new DataView(buffer).getUint32(20) }
} }

function fixture(overrides = {}) {
  const calls = []
  const client = {
    auth: { async getSession() {
      calls.push({ operation: 'session' })
      return { data: { session: overrides.noSession ? null : { user: { id: adminId, is_anonymous: !!overrides.anonymous } } } }
    } },
    from(table) {
      const call = { table, steps: [] }
      calls.push(call)
      const builder = {}
      for (const method of ['select', 'eq', 'order', 'range', 'maybeSingle', 'insert', 'update', 'delete']) {
        builder[method] = (...args) => { call.steps.push([method, ...args]); return builder }
      }
      builder.abortSignal = async signal => {
        call.signal = signal
        if (table === 'profiles') return { data: { id: adminId, role: overrides.role ?? 'admin', display_name: 'Admin' } }
        if (overrides.query) return overrides.query(call)
        if (call.steps.some(step => step[0] === 'insert')) return { data: null, status: 201 }
        if (call.steps.some(step => step[0] === 'update')) return { data: { id: designId, is_active: call.steps.find(step => step[0] === 'update')[1].is_active } }
        if (call.steps.some(step => step[0] === 'delete')) return { data: { id: designId } }
        if (call.steps.some(step => step[0] === 'maybeSingle')) return { data: overrides.design ?? design }
        return { data: [], count: 0 }
      }
      return builder
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'template-designs', 'Admin template mutations must never touch guest photostrips')
      return {
        async upload(storagePath, file, options) {
          const call = { operation: 'upload', bucket, path: storagePath, file, options }; calls.push(call)
          return overrides.upload ? overrides.upload(call) : { data: { path: storagePath } }
        },
        async remove(paths) {
          const call = { operation: 'remove', bucket, paths }; calls.push(call)
          return overrides.remove ? overrides.remove(call) : { data: paths.map(name => ({ name })) }
        },
        async createSignedUrls(paths, expiresIn) {
          calls.push({ operation: 'sign', bucket, paths, expiresIn })
          return { data: paths.map(path => ({ path, signedUrl: 'https://example.invalid/temporary-artwork' })) }
        },
      }
    } },
  }
  return { client, calls }
}
const uploadInput = { name: '  Sweet Bow  ', formatId: '2x6', file: pngFile() }

test('PNG extension, MIME, empty input, and arbitrary formats are checked before decoding', () => {
  for (const [file, format] of [[null, '2x6'], [new File([], 'empty.png', { type: 'image/png' }), '2x6'],
    [pngFile(600, 1800, { name: 'photo.jpg' }), '2x6'], [pngFile(600, 1800, { type: 'image/jpeg' }), '2x6'], [pngFile(), '../arbitrary']]) {
    assert.throws(() => validateTemplateFileBasics(file, format), TemplateValidationError)
  }
  assert.equal(validateTemplateFileBasics(pngFile(600, 1800, { name: 'UPPER.PNG', type: '' }), '2x6').id, '2x6')
})

test('the 10 MB limit rejects larger files before header reads, accepts the exact limit', () => {
  assert.doesNotThrow(() => validateTemplateFileBasics(pngFile(600, 1800, { size: MAX_TEMPLATE_BYTES }), '2x6'))
  assert.throws(() => validateTemplateFileBasics(pngFile(600, 1800, { size: MAX_TEMPLATE_BYTES + 1 }), '2x6'), /10 MB/)
})

for (const [format, [width, height]] of Object.entries(sizes)) {
  test(`${format} validates exact ${width}×${height} header and decoded dimensions`, async () => {
    assert.deepEqual(await validateTemplatePng(pngFile(width, height), format, validation), { width, height })
    await assert.rejects(validateTemplatePng(pngFile(width - 1, height), format, validation), /exactly/)
    await assert.rejects(validateTemplatePng(pngFile(width, height), format, { decode: async () => ({ width: height, height: width }) }), /exactly/)
  })
}

test('a renamed non-PNG, corrupt decode, and invalid dimensions never reach upload/auth', async () => {
  const { client, calls } = fixture()
  for (const file of [new File(['GIF89a fake PNG'], 'fake.png', { type: 'image/png' }), pngFile(599, 1800)]) {
    await assert.rejects(uploadTemplateDesign({ ...uploadInput, file }, { client, validation }), TemplateValidationError)
  }
  await assert.rejects(uploadTemplateDesign(uploadInput, { client, validation: { decode: async () => { throw new Error('corrupt') } } }), /couldn’t open/)
  assert.deepEqual(calls, [])
})

test('name validation and slug generation produce safe paths without exposing filenames', () => {
  assert.deepEqual(validateTemplateName(' Sweet Bow '), { name: 'Sweet Bow', slug: 'sweet-bow' })
  assert.equal(templateSlug(' Birthday Sparkle! '), 'birthday-sparkle')
  for (const value of ['../../secret', 'C:\\evil\\..\\file', '♡', '日本語', 'Café & ribbons']) assert.match(templateSlug(value), /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  for (const value of ['', '  ', 'X'.repeat(81)]) assert.throws(() => validateTemplateName(value), TemplateValidationError)
})

test('template summary counts use exact HEAD queries, including active-only', async () => {
  const { client, calls } = fixture({ query: call => ({ count: call.steps.some(step => step[0] === 'eq') ? 2 : 5 }) })
  assert.deepEqual(await getTemplateDesignCounts({ client }), { total: 5, active: 2 })
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[0].steps[0], ['select', 'id', { count: 'exact', head: true }])
  assert.deepEqual(calls[1].steps[1], ['eq', 'is_active', true])
})

test('template list reads only needed columns, orders newest first, and paginates 24', async () => {
  const { client, calls } = fixture({ query: () => ({ data: [design], count: 25 }) })
  const page = await getTemplateDesigns({ client })
  assert.equal(page.hasMore, true)
  assert.deepEqual(calls[0].steps, [['select', 'id,name,slug,format_id,storage_path,is_active,created_at', { count: 'exact' }],
    ['order', 'created_at', { ascending: false }], ['order', 'id', { ascending: false }], ['range', 0, 23]])
  const empty = fixture()
  assert.deepEqual(await getTemplateDesigns({ client: empty.client }), { items: [], nextOffset: 0, hasMore: false })
})

test('upload validates Admin profile, stores the original Blob without upsert, and inserts exactly six fields', async () => {
  const { client, calls } = fixture()
  assert.deepEqual(await uploadTemplateDesign(uploadInput, { client, validation }), { uploaded: true })
  const upload = calls.find(call => call.operation === 'upload')
  assert.match(upload.path, /^2x6\/[0-9a-f-]{36}\.png$/)
  assert.equal(upload.file, uploadInput.file)
  assert.deepEqual(upload.options, { contentType: 'image/png', upsert: false })
  const insertion = calls.find(call => call.steps?.some(step => step[0] === 'insert'))
  assert.deepEqual(insertion.steps[0][1], { name: 'Sweet Bow', slug: 'sweet-bow', format_id: '2x6', storage_path: upload.path, is_active: true, created_by: adminId })
  assert.equal(insertion.steps.length, 1, 'No manual id/time and no unnecessary returned collection')
  assert.equal(calls.some(call => call.table === 'profiles'), true)
})

test('duplicate slug in the same format stops before upload without overwriting', async () => {
  const { client, calls } = fixture({ query: () => ({ count: 1 }) })
  await assert.rejects(uploadTemplateDesign(uploadInput, { client, validation }), error => error.code === 'duplicate-name')
  assert.equal(calls.some(call => call.operation === 'upload'), false)
  const duplicate = calls.find(call => call.table === 'photostrip_designs')
  assert.deepEqual(duplicate.steps.slice(1), [['eq', 'format_id', '2x6'], ['eq', 'slug', 'sweet-bow']])
})

test('non-Admin, anonymous, and missing sessions cannot upload/toggle/delete templates', async () => {
  for (const options of [{ role: 'ayesa' }, { anonymous: true }, { noSession: true }]) {
    const { client, calls } = fixture(options)
    for (const action of [() => uploadTemplateDesign(uploadInput, { client, validation }), () => setTemplateDesignActive(designId, false, { client }),
      () => deleteTemplateDesign(designId, { client, confirmed: true })]) {
      await assert.rejects(action(), error => error.code === 'admin-required')
    }
    assert.equal(calls.some(call => call.table === 'photostrip_designs' || call.bucket), false)
  }
})

test('definite metadata failure cleans up only the just-uploaded file and preserves sanitized diagnostics', async () => {
  const { client, calls } = fixture({ query: call => call.steps.some(step => step[0] === 'insert')
    ? { error: { code: '42501', message: 'raw PRIVATE UUID/path/content' }, status: 403 } : { count: 0 } })
  await assert.rejects(uploadTemplateDesign(uploadInput, { client, validation }), error => {
    assert.equal(error.databaseCode, '42501'); assert.equal(error.cleanupFailed, false)
    assert.equal(JSON.stringify(error).includes('PRIVATE UUID'), false)
    return true
  })
  assert.deepEqual(calls.find(call => call.operation === 'remove').paths, [calls.find(call => call.operation === 'upload').path])
})

test('failed cleanup is clearly reported instead of silently leaving an orphan', async () => {
  const { client } = fixture({ query: call => call.steps.some(step => step[0] === 'insert')
    ? { error: { code: '23505' }, status: 409 } : { count: 0 }, remove: () => ({ error: { statusCode: 403 } }) })
  await assert.rejects(uploadTemplateDesign(uploadInput, { client, validation }), error => error.cleanupFailed && templateErrorMessage(error).includes('cleanup needs checking'))
})

test('uncertain metadata response preserves a potentially committed file and does not retry automatically', async () => {
  const { client, calls } = fixture({ query: call => call.steps.some(step => step[0] === 'insert')
    ? { error: { message: 'network' }, status: 0 } : { count: 0 } })
  await assert.rejects(uploadTemplateDesign(uploadInput, { client, validation }), error => error.uncertain === true)
  assert.equal(calls.filter(call => call.operation === 'upload').length, 1)
  assert.equal(calls.some(call => call.operation === 'remove'), false)
})

test('Storage rejection prevents metadata and cleanup operations', async () => {
  const { client, calls } = fixture({ upload: () => ({ error: { statusCode: '403', code: 'AccessDenied', message: 'secret path' } }) })
  await assert.rejects(uploadTemplateDesign(uploadInput, { client, validation }), error => error.code === 'upload-failed' && error.status === 403)
  assert.equal(calls.some(call => call.steps?.some(step => step[0] === 'insert') || call.operation === 'remove'), false)
})

test('enable/disable changes only is_active on the selected row and requires confirmation', async () => {
  const { client, calls } = fixture()
  assert.deepEqual(await setTemplateDesignActive(designId, false, { client }), { id: designId, is_active: false })
  const update = calls.find(call => call.steps?.some(step => step[0] === 'update'))
  assert.deepEqual(update.steps, [['update', { is_active: false }], ['eq', 'id', designId], ['select', 'id,is_active'], ['maybeSingle']])
  const denied = fixture({ query: () => ({ data: null }) })
  await assert.rejects(setTemplateDesignActive(designId, true, { client: denied.client }), error => error.code === 'toggle-unconfirmed')
})

test('template deletion requires explicit confirmation before any backend work', async () => {
  const { client, calls } = fixture()
  await assert.rejects(deleteTemplateDesign(designId, { client }), error => error.code === 'confirmation-required')
  assert.deepEqual(calls, [])
})

test('confirmed delete resolves the database path, removes exactly one template file, then the matching row', async () => {
  const { client, calls } = fixture()
  assert.deepEqual(await deleteTemplateDesign(designId, { client, confirmed: true }), { deleted: true })
  const removal = calls.find(call => call.operation === 'remove')
  assert.deepEqual(removal.paths, [path])
  const deletion = calls.find(call => call.steps?.some(step => step[0] === 'delete'))
  assert.deepEqual(deletion.steps, [['delete'], ['eq', 'id', designId], ['eq', 'storage_path', path], ['select', 'id'], ['maybeSingle']])
  assert.ok(calls.indexOf(removal) < calls.indexOf(deletion))
})

test('unsafe file paths/folders and unexpected formats are rejected without Storage deletion', async () => {
  for (const storage_path of ['2x6/', '2x6', '2x6/../photo.png', 'photostrips/private-user/file.png', '/2x6/file.png']) {
    const { client, calls } = fixture({ design: { ...design, storage_path } })
    await assert.rejects(deleteTemplateDesign(designId, { client, confirmed: true }), error => error.code === 'unsafe-delete-target')
    assert.equal(calls.some(call => call.operation === 'remove'), false)
  }
})

test('Storage failure or empty deletion acknowledgement preserves metadata', async () => {
  for (const response of [{ error: { statusCode: 403 } }, { data: [] }]) {
    const { client, calls } = fixture({ remove: () => response })
    await assert.rejects(deleteTemplateDesign(designId, { client, confirmed: true }))
    assert.equal(calls.some(call => call.steps?.some(step => step[0] === 'delete')), false)
  }
})

test('partial deletion retries the metadata operation without removing the file twice', async () => {
  let fail = true
  const { client, calls } = fixture({ query: call => {
    if (call.steps.some(step => step[0] === 'delete')) return fail ? { error: { code: '42501' }, status: 403 } : { data: { id: designId } }
    return { data: design }
  } })
  await assert.rejects(deleteTemplateDesign(designId, { client, confirmed: true }), error => error.storageRemoved && templateErrorMessage(error).includes('Retry'))
  fail = false
  await deleteTemplateDesign(designId, { client, confirmed: true })
  assert.equal(calls.filter(call => call.operation === 'remove').length, 1)
})

test('private template previews reuse batched signing for 600 seconds', async () => {
  const { client, calls } = fixture()
  const previews = await getPrivatePreviews([design], { client, bucket: 'template-designs' })
  assert.equal(previews[designId].status, 'ready')
  assert.deepEqual(calls[0], { operation: 'sign', bucket: 'template-designs', paths: [path], expiresIn: 600 })
})

test('local preview URLs are released exactly once when replaced, discarded, or unmounted', () => {
  let count = 0
  const revoked = []
  const urls = { createObjectURL: () => 'blob:fixture-'+count++, revokeObjectURL: url => revoked.push(url) }
  const first = createTemplatePreview(pngFile(), urls)
  first.release()
  const replacement = createTemplatePreview(pngFile(1800, 1200), urls)
  first.release()
  replacement.release(); replacement.release()
  assert.deepEqual(revoked, ['blob:fixture-0', 'blob:fixture-1'])
})

test('all four Admin routes share the profile-role guard, denying Ayesa and anonymous users', async () => {
  const auth = { status: 'ready', session: { user: { id: adminId, is_anonymous: false } }, profile: { id: adminId, role: 'admin' } }
  assert.deepEqual(getProtectedAccess(auth, 'admin'), { kind: 'allowed' })
  assert.deepEqual(getProtectedAccess({ ...auth, profile: { id: adminId, role: 'ayesa' } }, 'admin'), { kind: 'redirect', to: '/ayesa' })
  assert.deepEqual(getProtectedAccess({ ...auth, session: { user: { id: adminId, is_anonymous: true } } }, 'admin'), { kind: 'redirect', to: '/admin/login' })
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /path="\/admin" element={<ProtectedRoute role="admin">[\s\S]*?<Route path="messages"[\s\S]*?<Route path="gallery"[\s\S]*?<Route path="designs"/)
})

test('template management introduces no public URLs or guest dependency on database designs', async () => {
  const source = await readFile(new URL('../src/services/templateDesignService.js', import.meta.url), 'utf8')
  assert.equal(source.includes('getPublicUrl'), false)
  assert.equal(source.includes('/object/public/'), false)
  for (const file of ['PhotoboothPage.jsx', 'DesignSelectionPage.jsx', 'CameraPage.jsx', 'ResultReadyPage.jsx']) {
    const page = await readFile(new URL('../src/pages/'+file, import.meta.url), 'utf8')
    assert.equal(page.includes('templateDesignService'), false)
    assert.equal(page.includes('photostrip_designs'), false)
  }
})
