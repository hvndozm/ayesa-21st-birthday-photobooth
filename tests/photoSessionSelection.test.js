import test from 'node:test'
import assert from 'node:assert/strict'
import { photoboothFormats } from '../src/data/photoboothFormats.js'
import { framePercentageStyle } from '../src/utils/frameGeometry.js'
import { getSessionDesign, hasFourPhotos } from '../src/utils/photoSessionSelection.js'

test('custom preview percentages reproduce every central Canvas window without offsets', () => {
  for (const format of photoboothFormats) for (const frame of format.frames) {
    const style = framePercentageStyle(format, frame)
    for (const [property, dimension, coordinate] of [
      ['left', format.canvasWidth, frame.x], ['top', format.canvasHeight, frame.y],
      ['width', format.canvasWidth, frame.width], ['height', format.canvasHeight, frame.height],
    ]) assert.ok(Math.abs(parseFloat(style[property]) / 100 * dimension - coordinate) < 1e-9)
  }
})

test('four photographs belong only to their matching format/design/mock session', () => {
  const session = { formatId: '2x6', designId: '2x6-sweet-bow', mockMode: true,
    photos: Array.from({ length: 4 }, () => ({ blob: new Blob(['local photograph']) })) }
  assert.equal(hasFourPhotos(session, '2x6', '2x6-sweet-bow', true), true)
  assert.equal(hasFourPhotos(session, '2x6', '2x6-sweet-bow', false), false)
  assert.equal(hasFourPhotos(session, '4x6', '2x6-sweet-bow', true), false)
  assert.equal(hasFourPhotos(session, '2x6', '2x6-love-letter', true), false)
  assert.equal(hasFourPhotos({ ...session, photos: [null, ...session.photos.slice(1)] }, '2x6', '2x6-sweet-bow', true), false)
  assert.equal(hasFourPhotos(null, '2x6', '2x6-sweet-bow', true), false)
})

test('a captured custom overlay survives its camera preview URL being released', () => {
  const id = '10000000-0000-4000-8000-000000000100'
  const design = { id, formatId: '6x4', source: 'custom', name: 'Birthday Ribbon', overlayBlob: new Blob(['original PNG']) }
  assert.equal(getSessionDesign({ design }, '6x4', id), design)
  const recovery = getSessionDesign(null, '6x4', id)
  assert.equal(recovery.name, 'Custom Birthday Design')
  assert.equal(recovery.overlayBlob, undefined)
  assert.equal(getSessionDesign({ design }, '4x6', id).overlayBlob, undefined)
  assert.equal(getSessionDesign(null, '2x6', 'unknown-design'), null)
})
