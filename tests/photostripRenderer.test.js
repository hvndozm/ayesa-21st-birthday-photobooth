import assert from 'node:assert/strict'
import test from 'node:test'
import { photoboothFormats } from '../src/data/photoboothFormats.js'
import { placeholderDesigns } from '../src/data/placeholderDesigns.js'
import { generatePhotostrip } from '../src/utils/photostripRenderer.js'

function installCanvasHarness() {
  const oldDocument = globalThis.document
  const oldImage = globalThis.Image
  const oldCreateUrl = URL.createObjectURL
  const oldRevokeUrl = URL.revokeObjectURL
  const canvases = []
  const sources = new Map()
  const revoked = []
  const releasedImages = []
  let urlSequence = 0
  URL.createObjectURL = (blob) => {
    const url = `blob:renderer-fixture-${++urlSequence}`
    sources.set(url, blob)
    return url
  }
  URL.revokeObjectURL = (url) => revoked.push(url)
  class Canvas {
    constructor() {
      this.width = 0
      this.height = 0
      this.operations = []
      this.context = {
        drawImage: (source, ...coordinates) => this.operations.push({
          type: 'image', source, coordinates,
          pixels: source.processedPixels ? [...source.processedPixels.slice(0, 4)] : null,
        }),
        fillRect: (...coordinates) => this.operations.push({ type: 'fill', color: this.context.fillStyle, coordinates }),
        strokeRect: (...coordinates) => this.operations.push({ type: 'border', color: this.context.strokeStyle, coordinates }),
        fill: () => this.operations.push({ type: 'motif', color: this.context.fillStyle }),
        fillText: (text) => this.operations.push({ type: 'text', color: this.context.fillStyle, text }),
        createLinearGradient: () => ({ addColorStop() {} }),
        getImageData: (_x, _y, width, height) => {
          const data = new Uint8ClampedArray(width * height * 4)
          for (let index = 0; index < data.length; index += 4) data.set([205, 108, 61, 255], index)
          return { width, height, data }
        },
        putImageData: ({ data }) => { this.processedPixels = data },
      }
      for (const method of ['beginPath', 'arc', 'moveTo', 'lineTo', 'bezierCurveTo', 'ellipse', 'closePath', 'stroke', 'save', 'translate', 'scale', 'restore']) {
        this.context[method] = () => {}
      }
      canvases.push(this)
    }
    getContext() { return this.context }
    toBlob(callback, type) {
      this.exportedSize = [this.width, this.height]
      callback(new Blob(['rendered fixture'], { type }))
    }
  }
  globalThis.document = { createElement: () => new Canvas() }
  globalThis.Image = class {
    set src(value) {
      this.source = value
      if (!value) { releasedImages.push(this); return }
      this.loadedSource = value
      const blob = sources.get(value)
      this.naturalWidth = blob?.fixtureDimensions?.[0] ?? 800
      this.naturalHeight = blob?.fixtureDimensions?.[1] ?? 600
      queueMicrotask(() => {
        if (blob?.fixtureError) this.onerror?.()
        else this.onload?.()
      })
    }
    async decode() {}
  }
  return {
    canvases, sources, revoked, releasedImages,
    restore() {
      globalThis.document = oldDocument
      globalThis.Image = oldImage
      URL.createObjectURL = oldCreateUrl
      URL.revokeObjectURL = oldRevokeUrl
    },
  }
}

function createPhotos() {
  return Array.from({ length: 4 }, () => ({ blob: new Blob(['private local photograph'], { type: 'image/png' }) }))
}

function createCustom(format, dimensions = [format.canvasWidth, format.canvasHeight]) {
  const overlayBlob = new Blob(['original private transparent PNG'], { type: 'image/png' })
  overlayBlob.fixtureDimensions = dimensions
  return {
    id: '3e44d761-43ef-4429-9003-9d5cb86214b0', name: 'Custom birthday frame',
    source: 'custom', formatId: format.id, overlayBlob,
    overlaySrc: 'https://unused-preview.invalid/expired',
  }
}

test('Original preserves all twelve built-in drawings, exact formats, crop placement, and colors', async () => {
  const harness = installCanvasHarness()
  try {
    for (const format of photoboothFormats) {
      for (const design of placeholderDesigns.filter((item) => item.formatId === format.id)) {
        const firstCanvas = harness.canvases.length
        const result = await generatePhotostrip({ format, design, photos: createPhotos() })
        const canvas = harness.canvases[firstCanvas]
        assert.equal(harness.canvases.length, firstCanvas + 1, 'Original never creates a filter/resampling canvas')
        assert.deepEqual([result.width, result.height], [format.canvasWidth, format.canvasHeight])
        assert.equal(result.filterId, 'original')
        assert.equal(result.blob.type, 'image/png')
        assert.deepEqual(canvas.exportedSize, [format.canvasWidth, format.canvasHeight])
        const draws = canvas.operations.filter((operation) => operation.type === 'image')
        assert.equal(draws.length, 4)
        for (const [index, draw] of draws.entries()) {
          assert.deepEqual(draw.coordinates.slice(4), Object.values(format.frames[index]))
          assert.equal(draw.pixels, null)
        }
        assert.ok(canvas.operations.some((operation) => operation.type === 'text' && operation.color === design.canvasStyle.textColor))
        assert.ok(canvas.operations.findIndex((operation) => operation.type === 'border') > canvas.operations.lastIndexOf(draws[3]))
      }
    }
    assert.equal(harness.revoked.length, 48)
    assert.equal(harness.releasedImages.length, 48)
    assert.ok(harness.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0))
  } finally { harness.restore() }
})

test('every selected filter processes all four photos before colored built-in artwork', async () => {
  const harness = installCanvasHarness()
  try {
    const format = photoboothFormats[0]
    const design = placeholderDesigns[0]
    const signatures = []
    for (const filterId of ['blurry', 'digicam', 'polaroid', 'mono']) {
      const firstCanvas = harness.canvases.length
      const result = await generatePhotostrip({ format, design, photos: createPhotos(), filterId })
      const canvas = harness.canvases[firstCanvas]
      const photoDraws = canvas.operations.filter((operation) => operation.type === 'image')
      assert.equal(result.filterId, filterId)
      assert.equal(photoDraws.length, 4)
      assert.ok(photoDraws.every((draw) => draw.pixels?.[3] === 255))
      if (filterId === 'mono') {
        for (const draw of photoDraws) assert.deepEqual(draw.pixels.slice(0, 3), Array(3).fill(draw.pixels[0]))
      }
      const lastPhotoIndex = canvas.operations.indexOf(photoDraws[3])
      const artIndex = canvas.operations.findIndex((operation) => operation.type === 'text')
      assert.ok(artIndex > lastPhotoIndex)
      assert.ok(canvas.operations.some((operation) => operation.type === 'motif' && operation.color === design.canvasStyle.accentColor))
      signatures.push(photoDraws[0].pixels.join(','))
    }
    assert.equal(new Set(signatures).size, 4)
    assert.ok(harness.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0))
  } finally { harness.restore() }
})

test('custom templates decode the original Blob and draw it last at full resolution for all three formats', async () => {
  const harness = installCanvasHarness()
  try {
    for (const format of photoboothFormats) {
      const design = createCustom(format)
      const firstCanvas = harness.canvases.length
      const result = await generatePhotostrip({ format, design, photos: createPhotos(), filterId: 'mono' })
      const canvas = harness.canvases[firstCanvas]
      const images = canvas.operations.filter((operation) => operation.type === 'image')
      assert.equal(images.length, 5)
      assert.ok(images.slice(0, 4).every((draw) => draw.pixels[0] === draw.pixels[1] && draw.pixels[1] === draw.pixels[2]))
      assert.equal(harness.sources.get(images[4].source.loadedSource), design.overlayBlob)
      assert.deepEqual(images[4].coordinates, [0, 0, format.canvasWidth, format.canvasHeight])
      assert.equal(images[4].pixels, null, 'the PNG overlay never goes through photograph filtering')
      assert.equal(canvas.operations.at(-1), images[4])
      assert.deepEqual([result.width, result.height], [format.canvasWidth, format.canvasHeight])
      assert.equal(canvas.operations.some((operation) => operation.type === 'text'), false)
    }
    assert.equal(harness.revoked.length, 15)
    assert.ok(harness.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0))
  } finally { harness.restore() }
})

test('custom rendering rejects a missing original Blob rather than using its signed preview', async () => {
  const harness = installCanvasHarness()
  try {
    const format = photoboothFormats[0]
    const design = createCustom(format)
    delete design.overlayBlob
    await assert.rejects(generatePhotostrip({ format, design, photos: createPhotos() }), /original custom/)
    assert.equal(harness.canvases.length, 0)
    assert.equal(harness.sources.size, 0)
  } finally { harness.restore() }
})

test('wrong-sized and failed custom overlays release every decoded image and Canvas', async () => {
  const harness = installCanvasHarness()
  try {
    const format = photoboothFormats[0]
    await assert.rejects(generatePhotostrip({ format, design: createCustom(format, [1200, 1800]), photos: createPhotos() }), /dimensions/)
    const broken = createCustom(format)
    broken.overlayBlob.fixtureError = true
    await assert.rejects(generatePhotostrip({ format, design: broken, photos: createPhotos() }), /could not be loaded/)
    assert.equal(harness.revoked.length, 10)
    assert.equal(harness.releasedImages.length, 10)
    assert.ok(harness.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0))
  } finally { harness.restore() }
})

test('invalid filters and already-cancelled renders fail before decoding any photo', async () => {
  const harness = installCanvasHarness()
  try {
    const format = photoboothFormats[0]
    const design = placeholderDesigns[0]
    await assert.rejects(generatePhotostrip({ format, design, photos: createPhotos(), filterId: 'sepia' }), /five available/)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(generatePhotostrip({ format, design, photos: createPhotos(), signal: controller.signal }), { name: 'AbortError' })
    assert.equal(harness.sources.size, 0)
    assert.equal(harness.canvases.length, 0)
  } finally { harness.restore() }
})

test('cancelling during photo processing releases decoded sources and the scratch Canvas', async () => {
  const harness = installCanvasHarness()
  try {
    const format = photoboothFormats[0]
    const controller = new AbortController()
    const rendering = generatePhotostrip({
      format, design: createCustom(format), photos: createPhotos(), filterId: 'blurry', signal: controller.signal,
    })
    setTimeout(() => controller.abort(), 0)
    await assert.rejects(rendering, { name: 'AbortError' })
    assert.equal(harness.revoked.length, 5)
    assert.equal(harness.releasedImages.length, 5)
    assert.ok(harness.canvases.every((canvas) => canvas.width === 0 && canvas.height === 0))
    assert.ok(harness.canvases.every((canvas) => !canvas.exportedSize))
  } finally { harness.restore() }
})
