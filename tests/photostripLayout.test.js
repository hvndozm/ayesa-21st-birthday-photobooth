import assert from 'node:assert/strict'
import test from 'node:test'
import { photoboothFormats } from '../src/data/photoboothFormats.js'
import { calculateCoverCrop, drawImageCover } from '../src/utils/canvasImageUtils.js'

test('cover crops a wide photo equally on the left and right', () => {
  assert.deepEqual(calculateCoverCrop(400, 200, 100, 100), { x: 100, y: 0, width: 200, height: 200 })
})

test('cover crops a tall photo equally on the top and bottom', () => {
  assert.deepEqual(calculateCoverCrop(200, 400, 200, 100), { x: 0, y: 150, width: 200, height: 100 })
})

test('matching aspect ratios use the complete source image', () => {
  assert.deepEqual(calculateCoverCrop(1200, 800, 750, 500), { x: 0, y: 0, width: 1200, height: 800 })
})

test('invalid image dimensions fail before drawing', () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => calculateCoverCrop(value, 960, 500, 355), /positive/)
  }
})

test('drawing maps the centered source region to the exact destination rectangle', () => {
  const calls = []
  const image = { naturalWidth: 800, naturalHeight: 400 }
  drawImageCover({ drawImage: (...args) => calls.push(args) }, image, { x: 50, y: 150, width: 500, height: 500 })
  assert.deepEqual(calls, [[image, 200, 0, 400, 400, 50, 150, 500, 500]])
})

test('the three output sizes contain four non-overlapping, ordered photo windows', () => {
  assert.deepEqual(photoboothFormats.map(({ id, canvasWidth, canvasHeight }) => [id, canvasWidth, canvasHeight]), [
    ['2x6', 600, 1800], ['6x4', 1800, 1200], ['4x6', 1200, 1800],
  ])
  for (const format of photoboothFormats) {
    assert.equal(format.frames.length, 4)
    for (const [index, frame] of format.frames.entries()) {
      assert.ok(frame.width > 0 && frame.height > 0 && frame.x >= 0 && frame.y >= 0)
      assert.ok(frame.x + frame.width <= format.canvasWidth && frame.y + frame.height <= format.canvasHeight)
      for (const other of format.frames.slice(index + 1)) {
        const separate = frame.x + frame.width <= other.x || other.x + other.width <= frame.x
          || frame.y + frame.height <= other.y || other.y + other.height <= frame.y
        assert.ok(separate, `${format.id}: photo windows overlap`)
      }
      if (index > 0) {
        const previous = format.frames[index - 1]
        assert.ok(frame.y > previous.y || (frame.y === previous.y && frame.x > previous.x))
      }
    }
  }
})
