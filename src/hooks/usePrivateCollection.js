import { useEffect, useRef, useState } from 'react'
import usePrivateResource from './usePrivateResource.js'

export default function usePrivateCollection(load) {
  const resource = usePrivateResource(load)
  const request = useRef(null)
  const [moreState, setMoreState] = useState({ load, status: 'idle' })
  useEffect(() => () => { request.current?.abort(); request.current = null }, [load])

  async function loadMore() {
    if (request.current || !resource.data?.hasMore) return
    const controller = new AbortController()
    request.current = controller
    setMoreState({ load, status: 'loading' })
    try {
      const page = await load({ offset: resource.data.nextOffset, signal: controller.signal })
      if (!controller.signal.aborted) {
        resource.updateData(previous => {
          const existing = new Set(previous.items.map(item => item.id))
          return { ...page, items: [...previous.items, ...page.items.filter(item => !existing.has(item.id))] }
        })
        setMoreState({ load, status: 'idle' })
      }
    } catch {
      if (!controller.signal.aborted) setMoreState({ load, status: 'error' })
    } finally {
      if (request.current === controller) request.current = null
    }
  }
  return { ...resource, loadMore, moreStatus: moreState.load === load ? moreState.status : 'idle' }
}
