import { useEffect, useState } from 'react'
import { generatePhotostrip } from '../utils/photostripRenderer.js'

// App owns one active output across Filter -> Result. Input identity gates
// readiness before an effect can cancel its predecessor after a selection.
export default function useGeneratedPhotostrip(format, design, photos, filterId = 'original', enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [output, setOutput] = useState(null)
  useEffect(() => {
    if (!enabled) {
      let active = true
      queueMicrotask(() => { if (active) setOutput(null) })
      return () => { active = false }
    }
    const controller = new AbortController()
    let resultUrl
    const inputs = { format, design, photos, filterId, attempt, signal: controller.signal }
    generatePhotostrip({ format, design, photos, filterId, signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        resultUrl = URL.createObjectURL(result.blob)
        setOutput({ ...inputs, status: 'ready', result: { ...result, url: resultUrl } })
      })
      .catch(() => { if (!controller.signal.aborted) setOutput({ ...inputs, status: 'error', result: null }) })
    return () => { controller.abort(); if (resultUrl) URL.revokeObjectURL(resultUrl) }
  }, [format, design, photos, filterId, enabled, attempt])
  // An aborted A output cannot reappear after A -> B -> A, even while the new
  // A render is pending: cleanup has invalidated its URL and generation lease.
  const matches = enabled && output && !output.signal.aborted && output.format === format && output.design === design && output.photos === photos
    && output?.filterId === filterId && output?.attempt === attempt
  return { status: matches ? output.status : enabled ? 'generating' : 'idle', result: matches ? output.result : null,
    retry: () => setAttempt(value => value + 1),
    previewFailed: () => setOutput(current => current === output ? { ...current, status: 'error', result: null } : current) }
}
