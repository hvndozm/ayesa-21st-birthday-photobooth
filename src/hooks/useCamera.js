import { useCallback, useEffect, useRef, useState } from 'react'

function getCameraError(error) {
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { title: 'Camera permission wasn’t allowed', message: 'Allow camera access in your browser’s site settings, then try again.', retry: true }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { title: 'No camera was found', message: 'Connect a camera or open the booth on a phone with a camera, then try again.', retry: true }
    case 'NotReadableError':
    case 'TrackStartError':
      return { title: 'The camera couldn’t be opened', message: 'It may be busy in another app. Close other camera apps or tabs, then try again.', retry: true }
    case 'OverconstrainedError':
      return { title: 'This camera couldn’t use those settings', message: 'Try opening the camera again, or use another camera or browser.', retry: true }
    default:
      return { title: 'The camera needs another try', message: 'Something interrupted camera startup. Please try again.', retry: true }
  }
}

export default function useCamera(mockMode = false) {
  const [status, setStatus] = useState('idle')
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('user')
  const [canSwitch, setCanSwitch] = useState(false)
  const [notice, setNotice] = useState('')
  const streamRef = useRef(null)
  const devicesRef = useRef([])
  const requestId = useRef(0)
  const requesting = useRef(false)
  const mockActive = useRef(false)
  const mounted = useRef(false)

  const releaseStream = useCallback(() => {
    mockActive.current = false
    const previousStream = streamRef.current
    streamRef.current = null
    previousStream?.getTracks().forEach((track) => track.stop())
  }, [])

  const stopCamera = useCallback(() => {
    requestId.current += 1
    requesting.current = false
    releaseStream()
    if (mounted.current) {
      setStream(null)
      setStatus('idle')
    }
  }, [releaseStream])

  const playbackFailed = useCallback(() => {
    stopCamera()
    setError({ title: 'The preview couldn’t start', message: 'Open the camera again to reconnect the preview.', retry: true })
    setStatus('error')
  }, [stopCamera])

  const openCamera = useCallback(async (requestedFacing = 'user', switching = false) => {
    const previousSettings = streamRef.current?.getVideoTracks()[0]?.getSettings?.() ?? {}
    const token = ++requestId.current
    requesting.current = true
    releaseStream()
    setStream(null)
    setError(null)
    setNotice('')
    setStatus('opening')

    if (document.hidden) {
      requesting.current = false
      setStatus('paused')
      setNotice('Camera paused. Return to this tab and tap Open Camera to continue.')
      return
    }
    if (mockMode && import.meta.env.DEV) {
      mockActive.current = true
      requesting.current = false
      setFacingMode(requestedFacing)
      setCanSwitch(true)
      setStatus('ready')
      return
    }
    if (!window.isSecureContext || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      requesting.current = false
      setError({
        title: 'Camera access isn’t available here',
        message: !window.isSecureContext
          ? 'Use an HTTPS address, or localhost when developing, to open your camera.'
          : 'Try opening the booth in a browser that supports camera access.',
        retry: false,
      })
      setStatus('error')
      return
    }

    try {
      const video = {
        facingMode: { ideal: requestedFacing },
        width: { ideal: 1280 },
        height: { ideal: 960 },
      }
      // Desktop webcams may not report facingMode; prefer another device there.
      if (switching && !previousSettings.facingMode) {
        const otherDevice = devicesRef.current.find((device) => device.deviceId !== previousSettings.deviceId)
        if (otherDevice?.deviceId) video.deviceId = { ideal: otherDevice.deviceId }
      }
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: false, video })
      if (!mounted.current || token !== requestId.current || document.hidden) {
        nextStream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = nextStream
      const track = nextStream.getVideoTracks()[0]
      if (!track || track.readyState !== 'live') throw new Error('Camera stream has no live video track.')
      const settings = track?.getSettings?.() ?? {}
      setFacingMode(settings.facingMode === 'environment' ? 'environment' : settings.facingMode === 'user' ? 'user' : requestedFacing)
      setStream(nextStream)
      setStatus('ready')
      requesting.current = false
      if (switching && settings.deviceId && settings.deviceId === previousSettings.deviceId) {
        setNotice('This device is using its available camera. You can still take all four photos.')
      }
      track?.addEventListener('ended', () => {
        if (streamRef.current !== nextStream || !mounted.current) return
        stopCamera()
        setError({ title: 'The camera was disconnected', message: 'Reconnect it and open the camera again. Your captured photos are still here.', retry: true })
        setStatus('error')
      })
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (token !== requestId.current || !mounted.current) return
        devicesRef.current = devices.filter((device) => device.kind === 'videoinput')
        setCanSwitch(devicesRef.current.length > 1)
      } catch {
        if (token === requestId.current && mounted.current) setCanSwitch(false)
      }
    } catch (cameraError) {
      if (!mounted.current || token !== requestId.current) return
      releaseStream()
      requesting.current = false
      setStream(null)
      setError(getCameraError(cameraError))
      setStatus('error')
    }
  }, [mockMode, releaseStream, stopCamera])

  useEffect(() => {
    mounted.current = true
    function handleVisibility() {
      if (!document.hidden || (!streamRef.current && !requesting.current && !mockActive.current)) return
      stopCamera()
      setNotice('Camera paused while this tab was away. Tap Open Camera to continue.')
      setStatus('paused')
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      mounted.current = false
      requestId.current += 1
      requesting.current = false
      releaseStream()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [mockMode, releaseStream, stopCamera])

  return {
    status, stream, error, facingMode, canSwitch, notice,
    openCamera, stopCamera, playbackFailed,
    switchCamera: () => openCamera(facingMode === 'user' ? 'environment' : 'user', true),
  }
}
