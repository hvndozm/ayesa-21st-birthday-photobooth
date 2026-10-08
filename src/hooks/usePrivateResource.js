import { useCallback, useEffect, useState } from 'react'

const initial = { data: null, status: 'loading', error: null }

// Route-scoped data: abort and discard every late response when a page leaves.
export default function usePrivateResource(load) {
  const [state, setState] = useState(initial)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const run = async () => {
      if (controller.signal.aborted) return
      setState({ ...initial, load })
      try {
        const data = await load({ signal: controller.signal })
        if (!controller.signal.aborted) setState({ data, status: 'ready', error: null, load })
      } catch (error) {
        if (!controller.signal.aborted) setState({ data: null, status: 'error', error, load })
      }
    }
    // StrictMode's abandoned effect cannot start a second request.
    queueMicrotask(run)
    return () => controller.abort()
  }, [load, revision])
  const retry = useCallback(() => setRevision(value => value + 1), [])
  const updateData = useCallback(update => setState(current => current.data
    ? { ...current, data: update(current.data) } : current), [])
  return { ...(state.load === load ? state : initial), retry, updateData }
}
