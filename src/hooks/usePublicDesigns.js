import { useEffect, useMemo, useState } from 'react'
import usePrivatePreviews from './usePrivatePreviews.js'

const empty = []
export default function usePublicDesigns(formatId) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ formatId: null, status: 'loading', designs: empty })
  useEffect(() => {
    if (!formatId) return
    const controller = new AbortController()
    import('../services/publicDesignService.js').then(service => service.getPublicCustomDesigns(formatId, { signal: controller.signal }))
      .then(designs => { if (!controller.signal.aborted) setState({ formatId, attempt, signal: controller.signal, status: 'ready', designs }) })
      .catch(error => { if (!controller.signal.aborted) setState({ formatId, attempt, signal: controller.signal, status: 'error', designs: empty, error }) })
    return () => controller.abort()
  }, [formatId, attempt])
  const current = state.signal && !state.signal.aborted && state.formatId === formatId && state.attempt === attempt ? state : { status: 'loading', designs: empty }
  const records = useMemo(() => current.designs.map(design => ({ id: design.id, storage_path: design.storagePath })), [current.designs])
  const previewState = usePrivatePreviews(records, 'template-designs')
  return { ...current, ...previewState, retryCatalog: () => setAttempt(value => value + 1),
    retryPreview: design => previewState.retry({ id: design.id, storage_path: design.storagePath }) }
}
