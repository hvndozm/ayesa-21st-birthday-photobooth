// Source coordinates for centered object-fit: cover, without stretching.
export function calculateCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (![sourceWidth, sourceHeight, targetWidth, targetHeight].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Image and frame dimensions must be positive numbers.')
  }
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight
  const width = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth
  const height = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio
  return { x: (sourceWidth - width) / 2, y: (sourceHeight - height) / 2, width, height }
}

export function drawImageCover(context, image, frame) {
  const crop = calculateCoverCrop(image.naturalWidth, image.naturalHeight, frame.width, frame.height)
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, frame.x, frame.y, frame.width, frame.height)
}

// Each Blob gets a renderer-owned URL. Navigation may clear the session's URLs
// without invalidating the images being decoded here. release() belongs to the renderer.
export function loadCanvasImage(source, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Rendering cancelled.', 'AbortError')); return }
    const temporaryUrl = source instanceof Blob ? URL.createObjectURL(source) : null
    const image = new Image()
    let settled = false
    let released = false
    const timeoutId = setTimeout(() => fail(new Error('A photostrip image took too long to load.')), 15000)
    image.decoding = 'async'
    image.crossOrigin = 'anonymous'

    function release() {
      if (released) return
      released = true
      image.src = ''
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
    }
    function removeListeners() {
      clearTimeout(timeoutId)
      image.onload = null
      image.onerror = null
      signal?.removeEventListener('abort', abort)
    }
    function fail(error) {
      if (settled) return
      settled = true
      removeListeners()
      release()
      reject(error)
    }
    function abort() { fail(new DOMException('Rendering cancelled.', 'AbortError')) }

    image.onerror = () => fail(new Error('A photostrip image could not be loaded.'))
    image.onload = async () => {
      try {
        if (image.decode) await image.decode()
        if (settled) return
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('The image is empty.')
        settled = true
        removeListeners()
        resolve({ image, release })
      } catch { fail(new Error('A photostrip image could not be decoded.')) }
    }
    signal?.addEventListener('abort', abort, { once: true })
    image.src = temporaryUrl ?? source
  })
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.size) resolve(blob)
      else reject(new Error('The browser could not export the photostrip.'))
    }, 'image/png')
  })
}
