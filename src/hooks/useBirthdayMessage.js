import { useEffect, useRef, useState } from 'react'

async function loadMessageService() {
  let timer
  try {
    return await Promise.race([
      import('../services/birthdayMessageService.js'),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Message sending could not be loaded.')), 12_000) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const initialState = { status: 'idle', uncertain: false }

export default function useBirthdayMessage() {
  const [state, setState] = useState(initialState)
  const inFlight = useRef(false)
  const completed = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  async function submit(values) {
    // Set synchronously: two clicks can arrive before React disables the button.
    if (inFlight.current || completed.current) return
    inFlight.current = true
    setState({ status: 'sending', uncertain: false })
    try {
      const { sendBirthdayMessage } = await loadMessageService()
      await sendBirthdayMessage(values)
      completed.current = true
      if (mounted.current) setState({ status: 'success', uncertain: false })
    } catch (error) {
      if (mounted.current) setState({
        status: error?.code === 'configuration-unavailable' ? 'unavailable' : 'error',
        uncertain: error?.uncertain === true,
      })
    } finally {
      inFlight.current = false
    }
  }

  function reset() {
    if (inFlight.current) return
    completed.current = false
    setState(initialState)
  }

  return { ...state, submit, reset }
}
