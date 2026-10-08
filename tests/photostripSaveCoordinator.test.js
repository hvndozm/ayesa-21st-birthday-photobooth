import assert from 'node:assert/strict'
import test from 'node:test'
import { createPhotostripSaveCoordinator, loadPhotostripStorage } from '../src/services/photostripSaveCoordinator.js'

const format = { id: '2x6' }
const design = { id: '2x6-sweet-bow' }
function result() { return { blob: new Blob(['fixture'], { type: 'image/png' }), width: 600, height: 1800 } }

test('simultaneous effects share one save and successful remounts do not upload again', async () => {
  let count = 0
  let finish
  const start = createPhotostripSaveCoordinator(async () => { count += 1; await new Promise((resolve) => { finish = resolve }) })
  const photos = [1, 2, 3, 4]
  const first = start(photos, result(), format, design)
  const second = start(photos, result(), format, design)
  await Promise.resolve()
  assert.equal(count, 1)
  assert.equal(first.promise, second.promise)
  finish()
  assert.equal((await first.promise).status, 'success')
  assert.equal(start(photos, result(), format, design, true), first)
  assert.equal(count, 1)
})

test('a definite failure retries only on a deliberate retry and uses the existing final Blob', async () => {
  let count = 0
  const png = result()
  const start = createPhotostripSaveCoordinator(async (payload) => {
    assert.equal(payload.blob, png.blob)
    assert.deepEqual({ ...payload, blob: undefined }, { blob: undefined, formatId: '2x6', designId: '2x6-sweet-bow', design,
      width: 600, height: 1800, filterId: 'original' })
    if (++count === 1) throw Object.assign(new Error('Fixture rejection'), { retryable: true })
  })
  const photos = [1, 2, 3, 4]
  const first = start(photos, png, format, design)
  assert.equal((await first.promise).status, 'error')
  assert.equal(start(photos, png, format, design), first)
  assert.equal(count, 1)
  assert.equal((await start(photos, png, format, design, true).promise).status, 'success')
  assert.equal(count, 2)
})

test('filter changes save distinct outputs and returning to a previously saved filter does not duplicate it', async () => {
  const payloads = []
  const start = createPhotostripSaveCoordinator(async payload => { payloads.push(payload) })
  const photos = [1, 2, 3, 4]
  const entries = new Map()
  for (const filterId of ['original', 'blurry', 'digicam', 'polaroid', 'mono']) {
    const output = { ...result(), filterId }
    const first = start(photos, output, format, design)
    assert.equal(start(photos, output, format, design), first)
    await first.promise
    entries.set(filterId, first)
  }
  assert.equal(payloads.length, 5)
  assert.deepEqual(payloads.map(payload => payload.filterId), ['original', 'blurry', 'digicam', 'polaroid', 'mono'])
  assert.equal(start(photos, { ...result(), filterId: 'mono' }, format, design, true), entries.get('mono'))
  assert.equal(start(photos, result(), format, design), entries.get('original'))
  assert.equal(payloads.length, 5)
})

test('custom design snapshots and exact filtered final Blobs reach storage without passing raw captures', async () => {
  const custom = { id: '10000000-0000-4000-8000-000000000104', formatId: '2x6', source: 'custom', isActive: true,
    storagePath: '2x6/10000000-0000-4000-8000-000000000105.png' }
  const filtered = { ...result(), filterId: 'polaroid' }
  let payload
  const start = createPhotostripSaveCoordinator(async input => { payload = input })
  await start([{ blob: new Blob(['raw frame']) }, 2, 3, 4], filtered, format, custom).promise
  assert.equal(payload.design, custom)
  assert.equal(payload.designId, custom.id)
  assert.equal(payload.filterId, 'polaroid')
  assert.equal(payload.blob, filtered.blob)
  assert.equal('photos' in payload, false)
})

test('uncertain writes cannot be retried blindly and new photo sets save independently', async () => {
  let count = 0
  const start = createPhotostripSaveCoordinator(async () => {
    count += 1
    throw Object.assign(new Error('Unconfirmed fixture'), { code: 'outcome-unknown', retryable: false })
  })
  const photos = [1, 2, 3, 4]
  const first = start(photos, result(), format, design)
  assert.equal((await first.promise).uncertain, true)
  assert.equal(start(photos, result(), format, design, true), first)
  await start([1, 2, 3, 5], result(), format, design).promise
  assert.equal(count, 2)
})

test('unexpected empty rejections resolve safely rather than leaving a pending save', async () => {
  for (const rejected of [null, undefined]) {
    const start = createPhotostripSaveCoordinator(() => Promise.reject(rejected))
    const entry = start([1, 2, 3, 4], result(), format, design)
    assert.deepEqual(await entry.promise, { status: 'error', canRetry: false, uncertain: false })
  }
})

test('SDK loading failure stays retryable and a late module cannot start a save after timeout', async () => {
  await assert.rejects(loadPhotostripStorage(() => Promise.reject(new Error('Fixture loading error'))),
    (error) => error.code === 'client-loading-failed' && error.retryable === true)
  let resolveModule
  let writes = 0
  const delayed = new Promise((resolve) => { resolveModule = resolve })
  const save = (async () => {
    const module = await loadPhotostripStorage(() => delayed, 10)
    await module.savePhotostrip()
  })()
  await assert.rejects(save, (error) => error.code === 'client-loading-failed' && error.retryable === true)
  resolveModule({ savePhotostrip: () => { writes += 1 } })
  await Promise.resolve()
  assert.equal(writes, 0)
})
