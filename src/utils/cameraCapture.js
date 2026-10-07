function canvasToPhoto(canvas, mirrored = false) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The browser could not save this camera frame.'))
        return
      }
      // Orientation is already baked into the pixels. Phase 4 must draw them as-is.
      resolve({ blob, width: canvas.width, height: canvas.height, mirrored, orientationApplied: true })
    }, 'image/jpeg', 0.95)
  })
}

export function captureVideoFrame(video, mirrored = false) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('The camera preview is not ready yet. Please try again.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not capture a photo.')

  // Match the selfie preview once, in the saved pixels. Rear cameras stay unchanged.
  if (mirrored) {
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvasToPhoto(canvas, mirrored)
}

export function captureMockFrame(photoNumber, captureNumber) {
  if (!import.meta.env.DEV) throw new Error('Mock camera is development-only.')

  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 960
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create a mock frame.')
  const colors = [
    ['#f6d8e6', '#e8b4ce'], ['#ded0ed', '#bfabd9'],
    ['#fff0cc', '#e9cc91'], ['#d4e9e5', '#a7cdc5'],
  ][photoNumber - 1]
  const gradient = context.createLinearGradient(0, 0, 1280, 960)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(1, colors[1])
  context.fillStyle = gradient
  context.fillRect(0, 0, 1280, 960)
  context.fillStyle = '#fff9f3'
  context.beginPath()
  context.arc(640, 420, 180, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#943b60'
  context.textAlign = 'center'
  context.font = '90px Georgia'
  context.fillText('Mock Photo ' + photoNumber, 640, 440)
  context.font = '26px sans-serif'
  context.fillText('Capture ' + captureNumber, 640, 505)
  context.font = '30px sans-serif'
  context.fillText('DEVELOPMENT MOCK CAMERA', 640, 730)
  context.font = '26px sans-serif'
  context.fillText('Generated placeholder · capture ' + captureNumber, 640, 795)
  return canvasToPhoto(canvas)
}
