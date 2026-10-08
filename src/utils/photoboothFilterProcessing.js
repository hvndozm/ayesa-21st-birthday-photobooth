import { getPhotoboothFilter } from '../data/photoboothFilters.js'
import { drawImageCover } from './canvasImageUtils.js'

const ROWS_PER_CHUNK = 64

export function checkRenderCancelled(signal) {
  if (signal?.aborted) throw new DOMException('Rendering cancelled.', 'AbortError')
}

// A task boundary lets touch input, React updates, and AbortController run on phones.
export function yieldRenderThread() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function forEachRowChunk(height, signal, yieldControl, processRows) {
  for (let start = 0; start < height; start += ROWS_PER_CHUNK) {
    checkRenderCancelled(signal)
    processRows(start, Math.min(height, start + ROWS_PER_CHUNK))
    if (start + ROWS_PER_CHUNK < height) await yieldControl()
  }
  checkRenderCancelled(signal)
}

// A small separable box blur blended with the sharp image keeps facial detail.
// Clamped edges prevent a transparent/dark halo at the photo window boundaries.
async function softenPhotograph(imageData, radius, mix, options) {
  const { data, width, height } = imageData
  const horizontal = new Uint8ClampedArray(data.length)
  const sampleCount = radius * 2 + 1
  await forEachRowChunk(height, options.signal, options.yieldControl, (start, end) => {
    for (let y = start; y < end; y += 1) {
      const rowStart = y * width * 4
      const sums = [0, 0, 0]
      for (let offset = -radius; offset <= radius; offset += 1) {
        const source = rowStart + Math.max(0, Math.min(width - 1, offset)) * 4
        for (let channel = 0; channel < 3; channel += 1) sums[channel] += data[source + channel]
      }
      for (let x = 0; x < width; x += 1) {
        const destination = rowStart + x * 4
        const leaving = rowStart + Math.max(0, x - radius) * 4
        const entering = rowStart + Math.min(width - 1, x + radius + 1) * 4
        for (let channel = 0; channel < 3; channel += 1) {
          horizontal[destination + channel] = sums[channel] / sampleCount
          sums[channel] += data[entering + channel] - data[leaving + channel]
        }
      }
    }
  })
  await forEachRowChunk(height, options.signal, options.yieldControl, (start, end) => {
    for (let y = start; y < end; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const destination = (y * width + x) * 4
        for (let channel = 0; channel < 3; channel += 1) {
          let sum = 0
          for (let offset = -radius; offset <= radius; offset += 1) {
            const sampleY = Math.max(0, Math.min(height - 1, y + offset))
            sum += horizontal[(sampleY * width + x) * 4 + channel]
          }
          data[destination + channel] = data[destination + channel] * (1 - mix) + sum / sampleCount * mix
        }
      }
    }
  })
}

// Mutates only this photograph's ImageData, never the composed template Canvas.
// Grain has a fixed seed per frame, so repeat renders produce identical pixels.
export async function applyPhotoboothFilter(imageData, filterId, {
  seed = 0,
  signal,
  yieldControl = yieldRenderThread,
} = {}) {
  const filter = getPhotoboothFilter(filterId)
  if (!filter) throw new Error('Choose one of the five available photobooth filters.')
  checkRenderCancelled(signal)
  if (filter.id === 'original') return imageData
  const { data, width, height } = imageData
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || data?.length !== width * height * 4) throw new Error('The photograph pixels could not be prepared.')

  const settings = filter.render
  if (settings.softenRadius) {
    await softenPhotograph(imageData, settings.softenRadius, settings.softenMix, { signal, yieldControl })
  }
  let noiseState = (seed >>> 0) || 1
  await forEachRowChunk(height, signal, yieldControl, (start, end) => {
    for (let index = start * width * 4; index < end * width * 4; index += 4) {
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
      noiseState = (Math.imul(noiseState, 1664525) + 1013904223) >>> 0
      const grain = (noiseState / 0x100000000 - 0.5) * settings.grain * 2
      for (let channel = 0; channel < 3; channel += 1) {
        const saturated = luminance + (data[index + channel] - luminance) * settings.saturation
        const contrasted = (saturated - 128) * settings.contrast + 128
        data[index + channel] = contrasted * settings.brightness + settings.tint[channel] + grain
      }
      // Alpha is intentionally untouched. All three Mono channels use the same grain.
    }
  })
  return imageData
}

export async function drawFilteredPhotograph(context, image, frame, filterId, { seed = 0, signal } = {}) {
  checkRenderCancelled(signal)
  if (!getPhotoboothFilter(filterId)) throw new Error('Choose one of the five available photobooth filters.')
  if (filterId === 'original') {
    // Preserve the Phase 4 direct crop/draw path without another resampling step.
    drawImageCover(context, image, frame)
    return
  }
  const photograph = document.createElement('canvas')
  photograph.width = frame.width
  photograph.height = frame.height
  try {
    const photographContext = photograph.getContext('2d', { willReadFrequently: true })
    if (!photographContext) throw new Error('Canvas rendering is unavailable in this browser.')
    photographContext.imageSmoothingEnabled = true
    photographContext.imageSmoothingQuality = 'high'
    drawImageCover(photographContext, image, { x: 0, y: 0, width: frame.width, height: frame.height })
    const pixels = photographContext.getImageData(0, 0, frame.width, frame.height)
    await applyPhotoboothFilter(pixels, filterId, { seed, signal })
    photographContext.putImageData(pixels, 0, 0)
    checkRenderCancelled(signal)
    context.drawImage(photograph, frame.x, frame.y)
  } finally {
    photograph.width = 0
    photograph.height = 0
  }
}
