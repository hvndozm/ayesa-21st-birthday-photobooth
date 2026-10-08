import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import CameraError from '../components/CameraError.jsx'
import CameraView from '../components/CameraView.jsx'
import CaptureComposition from '../components/CaptureComposition.jsx'
import Icon from '../components/Icon.jsx'
import useCamera from '../hooks/useCamera.js'
import useCaptureTimer from '../hooks/useCaptureTimer.js'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import useSelectedBoothDesign from '../hooks/useSelectedBoothDesign.js'
import ActionLink from '../components/ActionLink.jsx'
import { captureMockFrame, captureVideoFrame } from '../utils/cameraCapture.js'
import { createCaptureSearch } from '../utils/captureNavigation.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'
import { isDevelopmentMockCamera } from '../utils/mockCameraMode.js'

const emptyPhotos = [null, null, null, null]

function CaptureSession({ format, design, mockMode, photoSession, savePhotoSession, photosMissing }) {
  const navigate = useNavigate()
  const camera = useCamera(mockMode)
  const timer = useCaptureTimer()
  const cancelTimer = timer.cancel
  const matchesSession = photoSession?.formatId === format.id
    && photoSession?.designId === design.id && photoSession?.mockMode === mockMode
  const photos = matchesSession ? photoSession.photos : emptyPhotos
  const allCaptured = photos.every(Boolean)
  const [activeSlot, setActiveSlot] = useState(() => photos.findIndex((photo) => !photo))
  const [isCapturing, setIsCapturing] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [flash, setFlash] = useState({ slot: -1, number: 0 })
  const [captureError, setCaptureError] = useState(null)
  const [message, setMessage] = useState('')
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const videoRef = useRef(null)
  const shutterRef = useRef(null)
  const confirmRef = useRef(null)
  const panelRef = useRef(null)
  const photosRef = useRef(photos)
  const captureId = useRef(0)
  const captureNumberRef = useRef(Math.max(0, ...photos.map((photo) => photo?.captureNumber ?? 0)))
  const busy = useRef(false)
  const scrollOnOpen = useRef(false)
  const mounted = useRef(false)
  photosRef.current = photos
  const cameraIsOpen = camera.status === 'ready'
  const previewReady = cameraIsOpen && (mockMode || videoReady)
  const isCountingDown = timer.countdown !== null
  const controlsBusy = isCapturing || isCountingDown
  const designsUrl = `/photobooth/designs${createSelectionSearch(format.id, design.id)}`

  // Invalidate an in-flight JPEG encode when the camera closes or the page leaves.
  const cancelCapture = useCallback(() => {
    cancelTimer()
    captureId.current += 1
    busy.current = false
    if (mounted.current) setIsCapturing(false)
  }, [cancelTimer])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelCapture()
    }
  }, [cancelCapture])

  useEffect(() => {
    if (camera.status !== 'ready') cancelCapture()
  }, [camera.status, cancelCapture])

  useEffect(() => {
    if (allCaptured) {
      confirmRef.current?.focus({ preventScroll: true })
    } else if (previewReady && !isCountingDown) {
      shutterRef.current?.focus({ preventScroll: true })
      if (scrollOnOpen.current) {
        panelRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
        scrollOnOpen.current = false
      }
    }
  }, [previewReady, allCaptured, activeSlot, isCountingDown])

  const handleVideoReady = useCallback(() => setVideoReady(true), [])

  function savePhotos(nextPhotos) {
    photosRef.current = nextPhotos
    const { overlayUrl: _previewUrl, ...snapshot } = design
    savePhotoSession({ formatId: format.id, designId: design.id, mockMode, photos: nextPhotos, design: snapshot, filterId: 'original' })
  }

  async function openCamera() {
    setCaptureError(null)
    setNoticeDismissed(true)
    setVideoReady(false)
    scrollOnOpen.current = true
    await camera.openCamera(camera.facingMode)
  }

  async function takePhoto() {
    if (!mounted.current || document.hidden || busy.current || !previewReady || activeSlot < 0 || photosRef.current[activeSlot]) return
    busy.current = true
    const token = ++captureId.current
    const slot = activeSlot
    setIsCapturing(true)
    const stillActive = () => mounted.current && token === captureId.current && !document.hidden

    try {
      const captureNumber = ++captureNumberRef.current
      // Draw immediately on the press or final timer tick. Only Blob encoding is asynchronous.
      const captured = mockMode
        ? await captureMockFrame(slot + 1, captureNumber)
        : await captureVideoFrame(videoRef.current, camera.facingMode === 'user')
      if (!stillActive()) return
      const photo = { ...captured, url: URL.createObjectURL(captured.blob), facingMode: camera.facingMode, captureNumber }
      const nextPhotos = [...photosRef.current]
      nextPhotos[slot] = photo
      savePhotos(nextPhotos)
      const nextSlot = nextPhotos.findIndex((entry) => !entry)
      setVideoReady(false)
      setActiveSlot(nextSlot)
      setFlash((previous) => ({ slot, number: previous.number + 1 }))
      setMessage(nextSlot < 0
        ? 'All four photos are ready. Retake any frame, or choose Use These Photos.'
        : `Photo ${slot + 1} captured. Photo ${nextSlot + 1} is now active.`)
    } catch {
      if (!stillActive()) return
      camera.stopCamera()
      setCaptureError({
        title: 'That photo needs another try',
        message: 'We couldn’t save the camera frame. Your other photos are safe here. Open the camera and try again.',
        retry: true,
      })
    } finally {
      if (mounted.current && token === captureId.current) {
        busy.current = false
        setIsCapturing(false)
      }
    }
  }

  function handleShutter() {
    if (busy.current || !previewReady || activeSlot < 0 || photosRef.current[activeSlot] || timer.isRunning()) return
    if (timer.enabled) {
      panelRef.current?.querySelector('.capture-composition')?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
      setMessage(`5 second timer started for Photo ${activeSlot + 1}. Hold your pose.`)
    }
    timer.trigger(takePhoto)
  }

  function cancelCountdown() {
    timer.cancel()
    setMessage(`Timer cancelled. Photo ${activeSlot + 1} is still active.`)
  }

  async function retakePhoto(slot) {
    if (busy.current || timer.isRunning() || !photosRef.current[slot]) return
    const nextPhotos = [...photosRef.current]
    nextPhotos[slot] = null
    savePhotos(nextPhotos)
    setActiveSlot(slot)
    setVideoReady(false)
    setCaptureError(null)
    setMessage(`Photo ${slot + 1} cleared and active. Your other photos are unchanged.`)
    // Reuse the running stream. A deliberate retake can reopen a closed camera.
    if (!cameraIsOpen) await openCamera()
  }

  function closeCamera() {
    cancelCapture()
    camera.stopCamera()
    setVideoReady(false)
    setMessage('Camera closed. Your captured photos are still here.')
  }

  function confirmPhotos() {
    if (!allCaptured || busy.current || timer.isRunning()) return
    cancelCapture()
    camera.stopCamera()
    navigate(`/photobooth/filter${createCaptureSearch(format.id, design.id, mockMode)}`)
  }

  const displayedError = captureError ?? camera.error
  const capturedCount = photos.filter(Boolean).length

  return (
    <BoothPageLayout currentStep={3} className="camera-page"
      eyebrow="A little pose. A little birthday magic."
      title={<>Frame a little <em>happy.</em></>}
      description="One tap, one little moment. Fill your four frames with birthday love."
      backTo={designsUrl} backLabel="Back to Designs">
      <div className="camera-selection-label"><span>{format.displayName} · {getFormatDimensions(format)}</span><span>{design.name}</span></div>
      <p className="camera-gallery-notice"><Icon name="heart" />Your finished photostrip will be saved privately so Ayesa can keep the birthday memories.</p>
      {mockMode && <p className="camera-mock-label" role="status">Development Mock Camera · generated placeholders only</p>}
      {photosMissing && !noticeDismissed && <p className="booth-notice" role="status">
        Your photos aren’t available in this session. Refreshing clears them from memory. Open the camera to take four new photos.
      </p>}
      <p className="booth-sr-only" role="status" aria-live="polite" aria-atomic="true">{message}</p>
      <div ref={panelRef} className="camera-panel">
        <div className="camera-live-header">
          <span>{allCaptured ? 'All four moments, ready!' : `Photo ${activeSlot + 1} of 4 · Active`}</span>
          <span>{capturedCount}/4 captured</span>
        </div>
        <CaptureComposition format={format} design={design} photos={photos} activeSlot={activeSlot}
          onRetake={retakePhoto} busy={controlsBusy} countdown={timer.countdown} flashSlot={flash.slot} flashNumber={flash.number}
          renderCamera={cameraIsOpen ? () => (
            <CameraView videoRef={videoRef} stream={camera.stream} mockMode={mockMode}
              mirrored={camera.facingMode === 'user'} onReady={handleVideoReady}
              onPlaybackError={camera.playbackFailed} videoReady={videoReady} />
          ) : undefined} />
        <div className="camera-timer-controls">
          <button type="button" className="camera-icon-button camera-timer-toggle" aria-pressed={timer.enabled}
            aria-label={`5 second timer, ${timer.enabled ? 'on' : 'off'}`} disabled={controlsBusy}
            onClick={() => timer.setEnabled(!timer.enabled)}>
            <span>5s Timer</span><strong>{timer.enabled ? 'On' : 'Off'}</strong>
          </button>
          {isCountingDown && <button type="button" className="camera-icon-button" onClick={cancelCountdown}
            aria-label="Cancel countdown">Cancel</button>}
        </div>
        {allCaptured ? <div className="camera-primary-action">
          <button ref={confirmRef} type="button" className="button button--primary camera-confirm" onClick={confirmPhotos}>
            <Icon name="check" />Use These Photos<Icon name="arrow" />
          </button>
        </div> : cameraIsOpen ? <>
          <div className="camera-primary-action">
            <button ref={shutterRef} type="button" className="camera-shutter" disabled={!previewReady || controlsBusy}
              onClick={handleShutter} aria-label={`Capture Photo ${activeSlot + 1}${timer.enabled ? ' with 5 second timer' : ''}`}>
              <span><Icon name="camera" /></span>{isCountingDown ? 'Timer running…' : isCapturing ? 'Saving your moment…' : `Take Photo ${activeSlot + 1}`}
            </button>
          </div>
          <p className="camera-shutter-hint">{timer.enabled
            ? 'Tap for a 5-second countdown, then your next frame is ready.'
            : 'Tap to capture the active frame. Your next frame is ready right after.'}</p>
        </> : <div className="camera-intro">
          <h2>{photos.some(Boolean) ? 'Your next little moment awaits.' : 'A little permission, then a little pose.'}</h2>
          <p>{mockMode ? 'Open the development preview to try these frames with generated photos.'
            : 'Press Open Camera to allow camera access. The four source photos stay in this tab.'}</p>
          {displayedError && <CameraError error={displayedError} />}
          {displayedError?.retry !== false && <button type="button" className="button button--primary camera-open-button"
            disabled={camera.status === 'opening'} onClick={openCamera}>
            <Icon name="camera" />{camera.status === 'opening' ? 'Opening Camera…' : displayedError ? 'Try Camera Again' : 'Open Camera'}
          </button>}
          {camera.status === 'opening' && <button type="button" className="button button--text" onClick={closeCamera}>Cancel camera request</button>}
        </div>}
        {cameraIsOpen && <div className="camera-toolbar">
          {!allCaptured && camera.canSwitch && <button type="button" className="camera-icon-button" disabled={controlsBusy}
            onClick={() => {
              if (busy.current || timer.isRunning()) return
              setVideoReady(false)
              camera.switchCamera()
            }} aria-label="Switch front and rear camera">
            <Icon name="flip" /><span>Switch camera</span>
          </button>}
          <button type="button" className="camera-icon-button" onClick={closeCamera}><Icon name="close" /><span>Close camera</span></button>
        </div>}
        {cameraIsOpen && !allCaptured && <p className="camera-preview-caption">
          {camera.facingMode === 'user' ? 'Front camera · selfie preview and saved photo match.' : 'Rear camera · preview and saved photo match.'}
        </p>}
        {camera.notice && <p className="camera-status-note" role="status">{camera.notice}</p>}
        <p className="camera-privacy-note"><Icon name="heart" />Only your finished photostrip gets a private gallery copy.</p>
      </div>
    </BoothPageLayout>
  )
}

export default function CameraPage({ photoSession, savePhotoSession }) {
  const [searchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const selected = useSelectedBoothDesign(format?.id, searchParams.get('design'), photoSession?.design)
  const mockMode = isDevelopmentMockCamera(searchParams)
  if (!format) return <Navigate to="/photobooth" replace />
  if (selected.status === 'invalid') return <Navigate to={`/photobooth/designs${createSelectionSearch(format.id)}`} replace />
  if (selected.status !== 'ready') return <BoothPageLayout currentStep={3} className="camera-page"
    eyebrow="Your birthday frame" title={<>A little <em>birthday magic.</em></>}
    description="A special frame for your four memories." backTo={`/photobooth/designs${createSelectionSearch(format.id)}`} backLabel="Choose Another Design">
    <div className="result-state" role={selected.status === 'error' ? 'alert' : 'status'}>
      <h2>{selected.status === 'loading' ? 'Getting your frame ready…' : selected.error?.code === 'design-unavailable'
        ? 'This design is no longer available.' : 'We couldn’t load this birthday frame.'}</h2>
      {selected.status === 'error' && <>
        <p>Choose another design, or try loading it again.</p>
        <button type="button" className="button button--secondary" onClick={selected.retry}>Retry Design</button>
        <ActionLink to={`/photobooth/designs${createSelectionSearch(format.id)}`} icon="back">Choose Another Design</ActionLink>
      </>}
    </div>
  </BoothPageLayout>
  const design = selected.design

  return <CaptureSession key={`${format.id}:${design.id}:${mockMode}`}
    format={format} design={design} mockMode={mockMode}
    photoSession={photoSession} savePhotoSession={savePhotoSession}
    photosMissing={searchParams.get('notice') === 'photos-missing'} />
}
