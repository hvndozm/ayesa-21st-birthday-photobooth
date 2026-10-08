import assert from 'node:assert/strict'
import test from 'node:test'
import { placeholderDesigns } from '../src/data/placeholderDesigns.js'
import { photoboothFormats } from '../src/data/photoboothFormats.js'
import { getBuiltInDesigns, getBuiltInDesign, normalizeCustomDesign, resolvePhotoboothDesign,
  isCustomDesign, isBuiltInDesign, CUSTOM_DESIGNS_PER_FORMAT } from '../src/data/photoboothDesigns.js'
import { getPublicCustomDesigns, getPublicCustomDesign, getCustomDesignPreviews,
  downloadCustomDesignOverlay, PublicDesignError } from '../src/services/publicDesignService.js'

const userId = '10000000-0000-4000-8000-000000000101'
const designId = '10000000-0000-4000-8000-000000000102'
const path = '2x6/10000000-0000-4000-8000-000000000103.png'
const row = { id: designId, name: '  Birthday Ribbons  ', format_id: '2x6', storage_path: path, is_active: true }

function pngBlob(width = 600, height = 1800) {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  const header = new DataView(bytes.buffer)
  header.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12)
  header.setUint32(16, width); header.setUint32(20, height)
  return new Blob([bytes], { type: 'image/png' })
}
const validation = { decode: async file => {
  const header = new DataView(await file.slice(0, 33).arrayBuffer())
  return { width: header.getUint32(16), height: header.getUint32(20) }
} }

function fixture({ rows = [row], response, session = { user: { id: userId, is_anonymous: true } }, blob = pngBlob() } = {}) {
  const calls = []
  const client = {
    auth: {
      getSession: async () => { calls.push({ operation: 'session' }); return { data: { session } } },
      signInAnonymously: async () => {
        calls.push({ operation: 'anonymous' })
        return { data: { session: { user: { id: userId, is_anonymous: true } } } }
      },
    },
    from(table) {
      assert.equal(table, 'photostrip_designs', 'Public catalog must not fetch birthday messages, profiles, or guest images')
      const call = { table, steps: [] }; calls.push(call)
      const query = {}
      for (const method of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
        query[method] = (...args) => { call.steps.push([method, ...args]); return query }
      }
      query.abortSignal = signal => {
        call.signal = signal
        return response ? response(call) : { data: call.steps.some(step => step[0] === 'maybeSingle') ? rows[0] ?? null : rows }
      }
      return query
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'template-designs', 'Templates remain independent of final private photostrips')
      return {
        createSignedUrls: (paths, expiresIn) => {
          const call = { operation: 'sign', bucket, paths, expiresIn }; calls.push(call)
          return response ? response(call) : { data: paths.map(path => ({ path, signedUrl: 'https://example.invalid/temporary-template' })) }
        },
        download: (storagePath, options, parameters) => {
          const call = { operation: 'download', bucket, storagePath, options, signal: parameters.signal }; calls.push(call)
          return response ? response(call) : { data: blob }
        },
      }
    } },
  }
  return { client, calls }
}

test('all twelve built-in IDs and configurations are preserved independently of Supabase', () => {
  assert.equal(placeholderDesigns.length, 12)
  for (const format of photoboothFormats) {
    const builtins = getBuiltInDesigns(format.id)
    assert.equal(getBuiltInDesigns(format.id), builtins, 'Hook dependencies keep stable catalog identity')
    assert.deepEqual(builtins.map(design => design.name), ['Sweet Bow', 'Birthday Sparkle', 'Lavender Dream', 'Love Letter'])
    assert.equal(builtins.length, 4)
    for (const design of builtins) {
      const { source, ...original } = design
      assert.equal(source, 'builtin')
      assert.deepEqual(original, placeholderDesigns.find(item => item.id === design.id))
      assert.equal(isBuiltInDesign(design), true)
      assert.equal(isCustomDesign(design), false)
      assert.deepEqual(resolvePhotoboothDesign(design.id, format.id), design)
      assert.equal(getBuiltInDesign(design.id, format.id), design, 'Resolved built-in DTO identity is stable')
    }
  }
  assert.equal(getBuiltInDesign('2x6-sweet-bow', '6x4'), null)
  assert.equal(resolvePhotoboothDesign('arbitrary', '2x6'), null)
  assert.equal(placeholderDesigns.some(design => 'source' in design), false, 'Do not mutate existing local configs')
})

test('custom normalization exposes only needed metadata and rejects inactive, wrong-format, or unsafe paths', () => {
  const design = normalizeCustomDesign({ ...row, owner_id: 'PRIVATE OWNER', arbitrary: 'PRIVATE DATA' })
  assert.equal(design.id, designId)
  assert.equal(design.name, 'Birthday Ribbons')
  assert.equal(design.source, 'custom')
  assert.equal(isCustomDesign(design), true)
  assert.equal(isBuiltInDesign(design), false)
  assert.equal('owner_id' in design, false)
  assert.equal('arbitrary' in design, false)
  assert.equal(normalizeCustomDesign({ ...row, is_active: false }), null)
  assert.equal(normalizeCustomDesign({ ...row, is_active: false }, { requireActive: false }).isActive, false)
  for (const change of [{ id: 'storage/name.png' }, { format_id: 'unknown' }, { storage_path: '2x6/../private.png' },
    { storage_path: path.replace('2x6', '6x4') }, { is_active: 'true' }]) {
    assert.equal(normalizeCustomDesign({ ...row, ...change }), null)
  }
  assert.equal(resolvePhotoboothDesign(designId, '2x6', [design]), design)
  assert.equal(resolvePhotoboothDesign(designId, '6x4', [design]), null)
})

test('hybrid format catalog supports four built-ins plus up to four active custom designs', async () => {
  const rows = Array.from({ length: 6 }, (_, index) => ({ ...row, id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` }))
  const { client, calls } = fixture({ rows })
  const custom = await getPublicCustomDesigns('2x6', { client })
  assert.equal(custom.length, CUSTOM_DESIGNS_PER_FORMAT)
  assert.equal(getBuiltInDesigns('2x6').length + custom.length, 8)
  const query = calls.find(call => call.table)
  assert.deepEqual(query.steps, [['select', 'id,name,format_id,storage_path,is_active'], ['eq', 'format_id', '2x6'],
    ['eq', 'is_active', true], ['order', 'created_at', { ascending: false }], ['order', 'id', { ascending: false }], ['limit', 4]])
  assert.equal(calls.some(call => call.operation === 'anonymous'), false)
})

test('empty custom catalog is successful and preserves local built-ins; inactive/wrong-format rows are hidden', async () => {
  const { client } = fixture({ rows: [] })
  assert.deepEqual(await getPublicCustomDesigns('2x6', { client }), [])
  assert.equal(getBuiltInDesigns('2x6').length, 4)
  const mixed = fixture({ rows: [row, { ...row, is_active: false }, { ...row, format_id: '6x4' }] })
  assert.equal((await getPublicCustomDesigns('2x6', { client: mixed.client })).length, 1)
  await assert.rejects(getPublicCustomDesigns('2x6', { client: null }), error => error.code === 'configuration-unavailable')
  assert.equal(getBuiltInDesigns('2x6').length, 4)
})

test('direct custom IDs are verified as active, existing, matching-format database metadata', async () => {
  const { client, calls } = fixture()
  const design = await getPublicCustomDesign(designId, '2x6', { client })
  assert.equal(design.id, designId)
  assert.deepEqual(calls.find(call => call.table).steps, [['select', 'id,name,format_id,storage_path,is_active'],
    ['eq', 'id', designId], ['eq', 'format_id', '2x6'], ['eq', 'is_active', true], ['maybeSingle']])
  for (const rows of [[], [{ ...row, is_active: false }], [{ ...row, format_id: '6x4' }], [{ ...row, id: userId }]]) {
    const denied = fixture({ rows })
    await assert.rejects(getPublicCustomDesign(designId, '2x6', { client: denied.client }), error => error.code === 'design-unavailable')
  }
  await assert.rejects(getPublicCustomDesign('birthday-ribbons', '2x6', { client }), error => error.code === 'design-unavailable')
})

test('public template reads reuse permanent sessions and create an anonymous session only when needed', async () => {
  const existing = fixture({ session: { user: { id: userId, is_anonymous: false } } })
  await getPublicCustomDesigns('2x6', { client: existing.client })
  assert.equal(existing.calls.some(call => call.operation === 'anonymous'), false)
  const fresh = fixture({ session: null })
  await getPublicCustomDesigns('2x6', { client: fresh.client })
  assert.equal(fresh.calls.filter(call => call.operation === 'anonymous').length, 1)
})

test('custom preview signing is batched, ten minutes, and preserves independent item failures', async () => {
  const first = normalizeCustomDesign(row)
  const second = { ...first, id: userId, storagePath: '2x6/10000000-0000-4000-8000-000000000104.png' }
  const { client, calls } = fixture({ response: call => ({ data: call.paths.map((path, index) =>
    index ? { path, error: 'PRIVATE PATH SHOULD NOT ESCAPE' } : { path, signedUrl: 'https://example.invalid/signed' }) }) })
  const previews = await getCustomDesignPreviews([first, second], { client })
  assert.equal(previews[first.id].status, 'ready')
  assert.deepEqual(previews[second.id], { status: 'unavailable' })
  assert.deepEqual(calls.find(call => call.operation === 'sign'), { operation: 'sign', bucket: 'template-designs',
    paths: [first.storagePath, second.storagePath], expiresIn: 600 })
  assert.deepEqual(await getCustomDesignPreviews([], { client: null }), {})
})

test('Canvas overlay uses original private download bytes, validates PNG decoding, and has no preview transform', async () => {
  const blob = pngBlob()
  const { client, calls } = fixture({ blob })
  assert.equal(await downloadCustomDesignOverlay(normalizeCustomDesign(row), { client, validation }), blob)
  const downloaded = calls.find(call => call.operation === 'download')
  assert.equal(downloaded.storagePath, path)
  assert.deepEqual(downloaded.options, {})
  assert.equal(downloaded.signal.aborted, false)
  assert.equal(calls.some(call => call.operation === 'sign'), false)
  for (const invalid of [new Blob(['renamed invalid PNG'], { type: 'image/png' }), pngBlob(599, 1800)]) {
    const denied = fixture({ blob: invalid })
    await assert.rejects(downloadCustomDesignOverlay(normalizeCustomDesign(row), { client: denied.client, validation }),
      error => error.code === 'invalid-overlay')
  }
  await assert.rejects(downloadCustomDesignOverlay(normalizeCustomDesign(row), { client, validation: {
    decode: async () => { throw new Error('PRIVATE IMAGE INFORMATION') },
  } }), error => error.code === 'invalid-overlay' && !JSON.stringify(error).includes('PRIVATE IMAGE'))
})

test('custom failures preserve safe operation/resource/code/status without leaking raw paths or errors', async () => {
  const { client } = fixture({ response: () => ({ error: { code: '42501', status: 403,
    message: 'PRIVATE UUID/path.png forbidden birthday letter' } }) })
  await assert.rejects(getPublicCustomDesigns('2x6', { client }), error => {
    assert.ok(error instanceof PublicDesignError)
    assert.equal(error.operation, 'SELECT active designs')
    assert.equal(error.resource, 'photostrip_designs')
    assert.equal(error.databaseCode, '42501')
    assert.equal(error.status, 403)
    assert.equal(JSON.stringify(error).includes('PRIVATE'), false)
    return true
  })
})

test('cancellation prevents queued public reads; download/decode timeouts remain recoverable', async () => {
  const stopped = new AbortController(); stopped.abort()
  const empty = fixture()
  await assert.rejects(getPublicCustomDesigns('2x6', { client: empty.client, signal: stopped.signal }),
    error => error.code === 'cancelled')
  assert.deepEqual(empty.calls, [])
  const stalled = fixture({ response: () => new Promise(() => {}) })
  await assert.rejects(downloadCustomDesignOverlay(normalizeCustomDesign(row), { client: stalled.client, timeoutMs: 5 }),
    error => error.operation === 'DOWNLOAD')
  assert.equal(stalled.calls.find(call => call.operation === 'download').signal.aborted, true)
  const decode = fixture()
  await assert.rejects(downloadCustomDesignOverlay(normalizeCustomDesign(row), { client: decode.client, timeoutMs: 5,
    validation: { decode: () => new Promise(() => {}) } }), error => error.code === 'invalid-overlay')
})
