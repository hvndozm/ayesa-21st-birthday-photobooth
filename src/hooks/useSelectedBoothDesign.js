import { useEffect, useState } from 'react'
import { getBuiltInDesign, isCustomDesignId } from '../data/photoboothDesigns.js'

// A new custom capture always checks current active metadata, including on a
// direct URL. Canvas retains the original Blob, never a signed preview URL.
export default function useSelectedBoothDesign(formatId, designId, retainedDesign) {
  const builtin = getBuiltInDesign(designId, formatId)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    if (builtin || !formatId || !isCustomDesignId(designId)) return
    const controller = new AbortController()
    let url
    async function load() {
      const service = await import('../services/publicDesignService.js')
      const metadata = await service.getPublicCustomDesign(designId, formatId, { signal: controller.signal })
      const overlayBlob = retainedDesign?.id === designId && retainedDesign?.formatId === formatId
        && retainedDesign?.storagePath === metadata.storagePath && retainedDesign?.overlayBlob instanceof Blob
        ? retainedDesign.overlayBlob : await service.downloadCustomDesignOverlay(metadata, { signal: controller.signal })
      if (controller.signal.aborted) return
      url = URL.createObjectURL(overlayBlob)
      setState({ status: 'ready', formatId, designId, attempt, signal: controller.signal, design: { ...metadata, overlayBlob, overlayUrl: url } })
    }
    load().catch(error => { if (!controller.signal.aborted) setState({ status: 'error', formatId, designId, attempt, signal: controller.signal, error }) })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
    // Retained snapshots change on capture. Only revalidate on entry/selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builtin, formatId, designId, attempt])
  if (builtin) return { status: 'ready', design: builtin }
  if (!isCustomDesignId(designId)) return { status: 'invalid' }
  const current = state.signal && !state.signal.aborted && state.formatId === formatId && state.designId === designId && state.attempt === attempt ? state : { status: 'loading' }
  return { ...current, retry: () => setAttempt(value => value + 1) }
}
