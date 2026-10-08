import assert from 'node:assert/strict'
import test from 'node:test'
import { getFilterDisplayName, getPhotoboothFilter, photoboothFilters } from '../src/data/photoboothFilters.js'
import { applyPhotoboothFilter } from '../src/utils/photoboothFilterProcessing.js'

function pixels(colors, width = colors.length, height = 1) {
  return { width, height, data: new Uint8ClampedArray(colors.flat()) }
}

test('the centralized catalog has exactly the five requested selectable filters', () => {
  assert.deepEqual(photoboothFilters.map(({ id, name }) => [id, name]), [
    ['original', 'Original'], ['blurry', 'Blurry'], ['digicam', 'Digicam'], ['polaroid', 'Polaroid'], ['mono', 'Mono'],
  ])
  assert.equal(getPhotoboothFilter().id, 'original')
  assert.equal(getPhotoboothFilter('unknown'), undefined)
  assert.equal(getFilterDisplayName(undefined), 'Original')
  assert.equal(getFilterDisplayName('polaroid'), 'Polaroid')
  for (const filter of photoboothFilters) {
    assert.ok(filter.description && filter.previewLabel && filter.render)
  }
})

test('Original leaves all source photograph pixels exactly unchanged', async () => {
  const image = pixels([[211, 66, 129, 255], [8, 19, 245, 127], [0, 0, 0, 0]])
  const before = new Uint8ClampedArray(image.data)
  assert.equal(await applyPhotoboothFilter(image, 'original'), image)
  assert.deepEqual(image.data, before)
})

test('Mono creates true equal RGB grayscale while preserving detail and alpha', async () => {
  const image = pixels([[205, 108, 61, 255], [22, 43, 72, 123], [253, 251, 244, 255]])
  await applyPhotoboothFilter(image, 'mono', { seed: 127 })
  for (let index = 0; index < image.data.length; index += 4) {
    assert.equal(image.data[index], image.data[index + 1])
    assert.equal(image.data[index], image.data[index + 2])
  }
  assert.equal(image.data[7], 123)
  assert.ok(image.data[4] > 20 && image.data[4] < image.data[0])
  assert.ok(image.data[8] > image.data[0])
})

test('Digicam and Polaroid grain repeat exactly for the same frame seed', async () => {
  for (const filterId of ['digicam', 'polaroid', 'mono']) {
    const color = [127, 141, 160, 255]
    const first = pixels(Array.from({ length: 100 }, () => color))
    const second = pixels(Array.from({ length: 100 }, () => color))
    const otherFrame = pixels(Array.from({ length: 100 }, () => color))
    await applyPhotoboothFilter(first, filterId, { seed: 127 })
    await applyPhotoboothFilter(second, filterId, { seed: 127 })
    await applyPhotoboothFilter(otherFrame, filterId, { seed: 1136 })
    assert.deepEqual(first.data, second.data)
    assert.notDeepEqual(first.data, otherFrame.data)
  }
})

test('filter personalities stay restrained, photographic, and distinct', async () => {
  const outputs = {}
  for (const filter of photoboothFilters) {
    const image = pixels([[150, 120, 105, 211]])
    await applyPhotoboothFilter(image, filter.id, { seed: 127 })
    outputs[filter.id] = [...image.data]
    assert.equal(image.data[3], 211)
    assert.ok([...image.data.slice(0, 3)].every((value) => value > 70 && value < 220))
  }
  assert.equal(new Set(Object.values(outputs).map((output) => output.join(','))).size, 5)
  assert.ok(outputs.polaroid[0] - outputs.polaroid[2] > outputs.original[0] - outputs.original[2])
  assert.ok(outputs.blurry[1] > outputs.original[1])
})

test('Blurry softly spreads detail without erasing the original sharp center or alpha', async () => {
  const image = pixels([[0, 0, 0, 255], [0, 0, 0, 255], [255, 255, 255, 125], [0, 0, 0, 255], [0, 0, 0, 255]])
  await applyPhotoboothFilter(image, 'blurry')
  assert.ok(image.data[8] > 145 && image.data[8] < 220)
  assert.ok(image.data[4] > 10 && image.data[4] < 80)
  assert.equal(image.data[11], 125)
})

test('processing yields to input between chunks and responds to cancellation', async () => {
  const image = pixels(Array.from({ length: 130 }, () => [120, 140, 160, 255]), 1, 130)
  const controller = new AbortController()
  let yields = 0
  await assert.rejects(applyPhotoboothFilter(image, 'digicam', {
    signal: controller.signal,
    yieldControl: async () => { yields += 1; controller.abort() },
  }), { name: 'AbortError' })
  assert.equal(yields, 1)
})

test('unknown filters and malformed pixel buffers fail without returning a substitute', async () => {
  await assert.rejects(applyPhotoboothFilter(pixels([[1, 2, 3, 255]]), 'sepia'), /five available/)
  await assert.rejects(applyPhotoboothFilter({ width: 4, height: 1, data: new Uint8ClampedArray(4) }, 'mono'), /pixels/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(applyPhotoboothFilter(pixels([[1, 2, 3, 255]]), 'original', { signal: controller.signal }), { name: 'AbortError' })
})
