import { useEffect, useRef, useState } from 'react'
import { createPhotostripSaveCoordinator, loadPhotostripStorage } from '../services/photostripSaveCoordinator.js'

const startSave = createPhotostripSaveCoordinator(async (result) => {
  // Keep the SDK out of the initial landing/camera bundle. Loading it never
  // delays local PNG generation or the Download action.
  const { savePhotostrip } = await loadPhotostripStorage()
  return savePhotostrip(result)
})
const idle = { status: 'idle', canRetry: false }

export default function usePhotostripGallerySave(photos, result, format, design) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState(idle)
  const consumedAttempt = useRef(0)

  useEffect(() => {
    if (!result) { setState(idle); return }
    let active = true
    const requestedRetry = attempt > consumedAttempt.current
    consumedAttempt.current = attempt
    const entry = startSave(photos, result, format, design, requestedRetry)
    setState(entry.state)
    entry.promise.then((nextState) => { if (active) setState(nextState) })
    // A started save finishes independently of navigation so it can complete
    // both writes/cleanup. Unmount only stops presentation updates.
    return () => { active = false }
  }, [photos, result, format, design, attempt])

  return { ...state, retry: () => { if (state.canRetry) setAttempt((number) => number + 1) } }
}
