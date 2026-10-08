import { useCallback, useEffect, useRef, useState } from 'react'
import { getPrivatePreviews } from '../services/privateDashboardService.js'

const emptyItems = []

export default function usePrivatePreviews(items = emptyItems) {
  const [previews, setPreviews] = useState({})
  const [revision, setRevision] = useState(0)
  const requests = useRef(new Set())
  const mounted = useRef(false)
  const refresh = useCallback(async (batch, signal) => {
    if (!batch.length || signal.aborted) return
    setPreviews(previous => ({ ...previous, ...Object.fromEntries(batch.map(item => [item.id,
      previous[item.id]?.status === 'ready' ? previous[item.id] : { status: 'loading' }])) }))
    try {
      const result = await getPrivatePreviews(batch, { signal })
      if (mounted.current && !signal.aborted) setPreviews(previous => ({ ...previous, ...result }))
    } catch {
      if (mounted.current && !signal.aborted) setPreviews(previous => ({ ...previous,
        ...Object.fromEntries(batch.map(item => [item.id, { status: 'unavailable' }])) }))
    }
  }, [])
  useEffect(() => {
    const pending = requests.current
    mounted.current = true
    return () => { mounted.current = false; pending.forEach(controller => controller.abort()); pending.clear() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => refresh(items, controller.signal))
    // Renew before the ten-minute expiry, and on returning to a background tab.
    const timer = setInterval(() => setRevision(value => value + 1), 540_000)
    const onVisible = () => { if (!document.hidden) setRevision(value => value + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [items, revision, refresh])
  const retry = useCallback(async item => {
    const controller = new AbortController()
    requests.current.add(controller)
    await refresh([item], controller.signal)
    requests.current.delete(controller)
  }, [refresh])
  const unavailable = useCallback(id => setPreviews(previous => ({ ...previous, [id]: { status: 'unavailable' } })), [])
  return { previews, retry, unavailable }
}
