import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { photoboothFormats } from '../src/data/photoboothFormats.js'
import { placeholderDesigns } from '../src/data/placeholderDesigns.js'
import { createCaptureTimer } from '../src/utils/captureTimer.js'

// Transform the actual JSX with the existing Vite toolchain, without a browser,
// network listener, Supabase configuration, or another test framework.
let server
let Composition
async function loadComposition() {
  if (!server) {
    server = await createServer({ configFile: false, envFile: false, envDir: false,
      logLevel: 'silent', server: { middlewareMode: true, watch: null, hmr: false },
      esbuild: { jsx: 'automatic' },
    })
    Composition = (await server.ssrLoadModule('/src/components/CaptureComposition.jsx')).default
  }
  return Composition
}
after(async () => { await server?.close() })

function render(Component, format, design, overrides = {}) {
  return renderToStaticMarkup(createElement(Component, {
    format, design, photos: [null, null, null, null], activeSlot: 1,
    renderCamera: () => createElement('span', { className: 'fixture-live-camera' }, 'Live preview'),
    ...overrides,
  }))
}

test('countdown sits above the print for every built-in design and keeps all four frames unobstructed', async () => {
  const Component = await loadComposition()
  for (const format of photoboothFormats) {
    for (const design of placeholderDesigns.filter((entry) => entry.formatId === format.id)) {
      const html = render(Component, format, design, { countdown: 3, busy: true })
      assert.equal((html.match(/class="capture-frame(?: is-active)?"/g) ?? []).length, 4)
      assert.equal((html.match(/class="camera-countdown"/g) ?? []).length, 1)
      assert.ok(html.indexOf('class="camera-countdown"') < html.indexOf('class="booth-print capture-composition'))
      const frames = html.match(/<ol class="booth-preview-frames capture-frames"[\s\S]*?<\/ol>/)[0]
      assert.equal(frames.includes('camera-countdown'), false)
      assert.match(frames, /class="capture-frame is-active"[\s\S]*?fixture-live-camera/)
      assert.match(html, /class="camera-countdown-area" role="status" aria-live="polite" aria-atomic="true"/)
      assert.match(html, /class="camera-countdown-number" aria-hidden="true">3<\/span>/)
      assert.match(html, /Photo 2 in 3 seconds\./)
      assert.match(html, /booth-print-caption/)
      assert.match(html, /booth-print-motif/)
      assert.match(html, new RegExp(`booth-print--${design.theme}`))
    }
  }
})

test('custom countdown keeps the original PNG, centralized coordinates, and captured photos', async () => {
  const Component = await loadComposition()
  for (const format of photoboothFormats) {
    const design = { id: '4b38f5a7-31de-4d9d-bc58-66fe3b52dfc0', source: 'custom',
      formatId: format.id, name: 'Birthday overlay', overlayUrl: 'blob:original-overlay' }
    const html = render(Component, format, design, { countdown: 5, busy: true,
      onRetake: () => {}, photos: [{ url: 'blob:previous-photo', width: 1280, height: 960 }, null, null, null],
    })
    assert.match(html, /capture-composition--custom/)
    assert.match(html, /class="custom-template-overlay" src="blob:original-overlay"/)
    assert.ok(html.indexOf('class="camera-countdown"') < html.indexOf('class="booth-print capture-composition'))
    assert.match(html, /class="camera-countdown-number" aria-hidden="true">5<\/span>/)
    assert.match(html, /Photo 2 in 5 seconds\./)
    assert.match(html, /blob:previous-photo/)
    assert.match(html, /aria-label="Retake Photo 1" disabled=""/)
    for (const frame of format.frames) {
      assert.ok(html.includes(`left:${frame.x / format.canvasWidth * 100}%`))
      assert.ok(html.includes(`top:${frame.y / format.canvasHeight * 100}%`))
      assert.ok(html.includes(`width:${frame.width / format.canvasWidth * 100}%`))
      assert.ok(html.includes(`height:${frame.height / format.canvasHeight * 100}%`))
    }
  }
})

test('no-timer composition keeps photos, retakes, and the existing frame flash without a countdown', async () => {
  const Component = await loadComposition()
  const html = render(Component, photoboothFormats[0], placeholderDesigns[0], {
    onRetake: () => {}, flashSlot: 0, flashNumber: 1,
    photos: [{ url: 'blob:immediate-photo', width: 1280, height: 960 }, null, null, null],
  })
  assert.equal(html.includes('class="camera-countdown"'), false)
  assert.match(html, /class="camera-countdown-area"/)
  assert.match(html, /Your birthday studio/)
  assert.match(html, /aria-label="Retake Photo 1"/)
  assert.match(html, /camera-flash-overlay/)
  assert.match(html, /blob:immediate-photo/)
  assert.equal(html.includes('disabled=""'), false)
})

test('every timer tick announces the active retake without hiding the remaining captured photos', async () => {
  const Component = await loadComposition()
  const photos = [0, 1, 2, 3].map((slot) => slot === 2 ? null : ({
    url: `blob:captured-${slot}`, width: 1280, height: 960,
  }))
  for (const countdown of [5, 4, 3, 2, 1]) {
    const html = render(Component, photoboothFormats[0], placeholderDesigns[0], {
      countdown, photos, activeSlot: 2, busy: true, onRetake: () => {},
    })
    assert.match(html, new RegExp(`Photo 3 in ${countdown} ${countdown === 1 ? 'second' : 'seconds'}\\.`))
    assert.equal((html.match(/class="camera-countdown"/g) ?? []).length, 1)
    assert.equal((html.match(/src="blob:captured-/g) ?? []).length, 3)
    assert.equal((html.match(/aria-label="Retake Photo [124]" disabled=""/g) ?? []).length, 3)
  }
})

test('development countdown calls the actual mock generator once with the active slot and capture number', async () => {
  await loadComposition()
  const { captureMockFrame } = await server.ssrLoadModule('/src/utils/cameraCapture.js')
  const previousDocument = globalThis.document
  const labels = []
  const context = {
    createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {}, arc() {}, fill() {},
    fillText: (text) => labels.push(text),
  }
  let encodes = 0
  const canvas = { getContext: () => context, toBlob(callback, type) {
    encodes++
    queueMicrotask(() => callback(new Blob(['generated local mock'], { type })))
  } }
  globalThis.document = { createElement: () => canvas }
  try {
    let nextTick
    let result
    const timer = createCaptureTimer({ setTimer: callback => { nextTick = callback; return 1 }, clearTimer() {} })
    timer.setEnabled(true)
    timer.trigger(() => { result = captureMockFrame(2, 9) })
    assert.equal(encodes, 0)
    for (const number of [5, 4, 3, 2, 1]) {
      assert.equal(timer.getSnapshot().countdown, number)
      nextTick()
    }
    const photo = await result
    assert.equal(encodes, 1)
    assert.deepEqual([photo.width, photo.height], [1280, 960])
    assert.equal(photo.blob.type, 'image/jpeg')
    assert.ok(labels.includes('Mock Photo 2'))
    assert.ok(labels.includes('Capture 9'))
    nextTick()
    assert.equal(encodes, 1)
  } finally { globalThis.document = previousDocument }
})
