import { useEffect, useState, useSyncExternalStore } from 'react'
import { createCaptureTimer } from '../utils/captureTimer.js'

// The effect returns this same cleanup for route changes and unmount.
export function registerCaptureTimerCleanup(timer, pageDocument = document, pageWindow = window) {
  function pauseTimer() {
    if (pageDocument.hidden) timer.cancel()
  }
  pageDocument.addEventListener('visibilitychange', pauseTimer)
  pageWindow.addEventListener('pagehide', timer.cancel)
  return () => {
    timer.cancel()
    pageDocument.removeEventListener('visibilitychange', pauseTimer)
    pageWindow.removeEventListener('pagehide', timer.cancel)
  }
}

export default function useCaptureTimer() {
  const [timer] = useState(() => createCaptureTimer())
  const state = useSyncExternalStore(timer.subscribe, timer.getSnapshot, timer.getSnapshot)

  useEffect(() => registerCaptureTimerCleanup(timer), [timer])

  return { ...state, trigger: timer.trigger, cancel: timer.cancel, setEnabled: timer.setEnabled, isRunning: timer.isRunning }
}
