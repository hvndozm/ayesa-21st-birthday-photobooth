import { canvasToPngBlob, drawImageCover, loadCanvasImage } from './canvasImageUtils.js'

function drawBackground(context, format, style) {
  const { canvasWidth: width, canvasHeight: height } = format
  context.fillStyle = style.backgroundColor
  if (style.pattern === 'gradient') {
    const gradient = context.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, style.backgroundColor)
    gradient.addColorStop(1, style.backgroundEndColor)
    context.fillStyle = gradient
  }
  context.fillRect(0, 0, width, height)
  if (style.pattern === 'dots') {
    context.fillStyle = style.patternColor
    for (let y = 14; y < height; y += 28) {
      for (let x = 14; x < width; x += 28) {
        context.beginPath()
        context.arc(x, y, 2.5, 0, Math.PI * 2)
        context.fill()
      }
    }
  } else if (style.pattern === 'lines') {
    context.fillStyle = style.patternColor
    for (let y = 0; y < height; y += 28) context.fillRect(0, y, width, 4)
  }
}

// Original little motifs in normalized coordinates; they stay in the print margins.
const drawMotif = {
  bow(context) {
    context.beginPath()
    context.moveTo(0, 0)
    context.bezierCurveTo(-0.85, -0.8, -0.85, 0.6, 0, 0.1)
    context.bezierCurveTo(0.85, 0.6, 0.85, -0.8, 0, 0)
    context.fill()
    context.beginPath()
    context.moveTo(-0.1, 0)
    context.lineTo(-0.38, 0.65)
    context.lineTo(-0.12, 0.56)
    context.lineTo(0, 0.12)
    context.lineTo(0.12, 0.56)
    context.lineTo(0.38, 0.65)
    context.lineTo(0.1, 0)
    context.fill()
    context.beginPath()
    context.ellipse(0, 0.02, 0.13, 0.18, 0, 0, Math.PI * 2)
    context.fill()
  },
  heart(context) {
    context.beginPath()
    context.moveTo(0, 0.55)
    context.bezierCurveTo(-0.85, 0, -0.6, -0.65, 0, -0.2)
    context.bezierCurveTo(0.6, -0.65, 0.85, 0, 0, 0.55)
    context.fill()
  },
  sparkle(context) {
    context.beginPath()
    context.moveTo(0, -0.65)
    context.lineTo(0.16, -0.16)
    context.lineTo(0.65, 0)
    context.lineTo(0.16, 0.16)
    context.lineTo(0, 0.65)
    context.lineTo(-0.16, 0.16)
    context.lineTo(-0.65, 0)
    context.lineTo(-0.16, -0.16)
    context.closePath()
    context.fill()
  },
  cloud(context) {
    context.fillStyle = '#fffafc'
    context.beginPath()
    context.moveTo(-0.5, 0.3)
    context.bezierCurveTo(-0.95, 0.3, -0.8, -0.25, -0.4, -0.18)
    context.bezierCurveTo(-0.32, -0.7, 0.4, -0.7, 0.47, -0.15)
    context.bezierCurveTo(0.85, -0.18, 0.95, 0.3, 0.5, 0.3)
    context.closePath()
    context.fill()
    context.stroke()
  },
}

function drawPlaceholderForeground(context, format, design) {
  const { canvasWidth: width, canvasHeight: height, frames } = format
  const style = design.canvasStyle
  context.strokeStyle = style.borderColor
  context.lineWidth = 4
  context.strokeRect(2, 2, width - 4, height - 4)
  // Borders sit outside each photo rectangle, without changing its cover crop.
  for (const frame of frames) context.strokeRect(frame.x - 3, frame.y - 3, frame.width + 6, frame.height + 6)

  const topMargin = Math.min(...frames.map((frame) => frame.y))
  const bottomEdge = Math.max(...frames.map((frame) => frame.y + frame.height))
  const bottomMargin = height - bottomEdge
  const headerY = topMargin / 2
  const footerY = bottomEdge + bottomMargin / 2
  context.fillStyle = style.textColor
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `italic ${Math.min(42, topMargin * 0.3)}px Georgia, serif`
  context.fillText('a little birthday love', width / 2, headerY, width * 0.65)
  context.font = `${Math.min(42, bottomMargin * 0.3)}px Georgia, serif`
  context.fillText('AYESA ♡ 21', width / 2, footerY, width * 0.65)

  const motif = drawMotif[design.motif]
  const motifSize = Math.min(70, topMargin * 0.55, bottomMargin * 0.55)
  if (motif) {
    for (const [x, y] of [[width * 0.08, headerY], [width * 0.92, footerY]]) {
      context.save()
      context.translate(x, y)
      context.scale(motifSize, motifSize)
      context.fillStyle = style.accentColor
      context.strokeStyle = style.accentColor
      context.lineWidth = 0.025
      motif(context)
      context.restore()
    }
  }
}

// Full-resolution pixels come only from format configuration, never the CSS preview.
export async function generatePhotostrip({ format, design, photos, signal }) {
  if (!format || design?.formatId !== format.id || format.frames?.length !== 4 || photos?.length !== 4
    || photos.some((photo) => !photo || !(photo.blob instanceof Blob || photo.url))) {
    throw new Error('Four photos and a compatible format/design are required.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = format.canvasWidth
  canvas.height = format.canvasHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas rendering is unavailable in this browser.')

  const sources = photos.map((photo) => photo.blob ?? photo.url)
  if (design.overlaySrc) sources.push(design.overlaySrc)
  // Wait for every load to settle so partial failures cannot leak decoded resources.
  const loaded = await Promise.allSettled(sources.map((source) => loadCanvasImage(source, signal)))
  const resources = loaded.filter((result) => result.status === 'fulfilled').map((result) => result.value)
  try {
    if (signal?.aborted) throw new DOMException('Rendering cancelled.', 'AbortError')
    const failure = loaded.find((result) => result.status === 'rejected')
    if (failure) throw failure.reason
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    // Bottom → top: theme background, Photos 1–4, then template/foreground.
    drawBackground(context, format, design.canvasStyle)
    photos.forEach((photo, index) => {
      // Phase 3 already baked selfie mirroring into the pixels. Draw every image as-is.
      drawImageCover(context, resources[index].image, format.frames[index])
    })
    if (design.overlaySrc) {
      context.drawImage(resources[4].image, 0, 0, canvas.width, canvas.height)
    } else {
      drawPlaceholderForeground(context, format, design)
    }
    const blob = await canvasToPngBlob(canvas)
    if (signal?.aborted) throw new DOMException('Rendering cancelled.', 'AbortError')
    return { blob, width: canvas.width, height: canvas.height }
  } finally {
    resources.forEach((resource) => resource.release())
    canvas.width = 0
    canvas.height = 0
  }
}
