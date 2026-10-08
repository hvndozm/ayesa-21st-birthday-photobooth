// One optional countdown per camera session. Capture itself stays in CameraPage.
export function createCaptureTimer({ setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let state = { enabled: false, countdown: null }
  let timeout = null
  let runId = 0
  const listeners = new Set()

  function update(nextState) {
    state = nextState
    listeners.forEach((listener) => listener())
  }

  function cancel() {
    runId += 1
    if (timeout !== null) clearTimer(timeout)
    timeout = null
    if (state.countdown !== null) update({ ...state, countdown: null })
  }

  function trigger(capture) {
    if (state.countdown !== null) return false
    if (!state.enabled) {
      capture()
      return true
    }

    const token = ++runId
    update({ ...state, countdown: 5 })
    function tick() {
      if (token !== runId) return
      timeout = null
      if (state.countdown === 1) {
        const completionToken = ++runId
        update({ ...state, countdown: null })
        if (completionToken === runId) capture()
        return
      }
      update({ ...state, countdown: state.countdown - 1 })
      if (token === runId) timeout = setTimer(tick, 1000)
    }
    if (token === runId) timeout = setTimer(tick, 1000)
    return true
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setEnabled: (enabled) => {
      if (state.countdown !== null || state.enabled === enabled) return
      update({ ...state, enabled })
    },
    isRunning: () => state.countdown !== null,
    trigger,
    cancel,
  }
}
