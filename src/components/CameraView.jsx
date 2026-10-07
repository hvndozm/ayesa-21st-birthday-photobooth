import { useEffect } from 'react'
import Icon from './Icon.jsx'

export default function CameraView({
  videoRef, stream, mockMode, mirrored, onReady, onPlaybackError, videoReady,
}) {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    let active = true
    const readinessTimer = setTimeout(() => {
      if (active && video.readyState < 2) onPlaybackError()
    }, 12000)
    video.srcObject = stream
    video.play().catch(() => { if (active) onPlaybackError() })
    return () => {
      active = false
      clearTimeout(readinessTimer)
      video.srcObject = null
    }
  }, [stream, videoRef, onPlaybackError])

  return (
    <div className="camera-view">
      {mockMode
        ? <div className="camera-mock-preview" aria-label="Generated development camera preview">
            <Icon name="camera" /><span>Mock preview</span>
          </div>
        : <video ref={videoRef} className={mirrored ? 'camera-video is-mirrored' : 'camera-video'}
            autoPlay muted playsInline onLoadedData={onReady}
            aria-label={mirrored ? 'Mirrored live front camera preview' : 'Live rear camera preview'} />}
      {!mockMode && !videoReady && <span className="camera-connecting" role="status">Connecting your preview…</span>}
    </div>
  )
}
