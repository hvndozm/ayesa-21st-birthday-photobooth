import assert from 'node:assert/strict'
import test from 'node:test'
import { createCaptureTimer } from '../src/utils/captureTimer.js'
import { registerCaptureTimerCleanup } from '../src/hooks/useCaptureTimer.js'

function createClock() {
  let now = 0
  let sequence = 0
  const pending = new Map()
  const callbacks = []
  return {
    setTimer(callback, delay) {
      const id = ++sequence
      pending.set(id, { at: now + delay, callback })
      callbacks.push(callback)
      return id
    },
    clearTimer: (id) => pending.delete(id),
    advance(milliseconds) {
      const end = now + milliseconds
      for (;;) {
        const next = [...pending.entries()].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        now = next[1].at
        pending.delete(next[0])
        next[1].callback()
      }
      now = end
    },
    get pending() { return pending.size },
    callbacks,
  }
}

test('timer defaults Off and calls the existing capture synchronously without a timeout', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  let captures = 0
  assert.deepEqual(timer.getSnapshot(), { enabled: false, countdown: null })
  assert.equal(timer.trigger(() => captures++), true)
  assert.equal(captures, 1)
  assert.equal(clock.pending, 0)
  assert.equal(timer.isRunning(), false)
})

test('enabled timer shows only 5,4,3,2,1 and captures once at exactly five seconds', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  const numbers = []
  let captures = 0
  timer.subscribe(() => numbers.push(timer.getSnapshot().countdown))
  timer.setEnabled(true)
  numbers.length = 0
  timer.trigger(() => captures++)
  assert.deepEqual(numbers, [5])
  for (const number of [4, 3, 2, 1]) {
    clock.advance(999)
    assert.equal(captures, 0)
    clock.advance(1)
    assert.equal(timer.getSnapshot().countdown, number)
    assert.equal(clock.pending, 1)
  }
  clock.advance(999)
  assert.equal(captures, 0)
  clock.advance(1)
  assert.equal(captures, 1)
  assert.deepEqual(numbers, [5, 4, 3, 2, 1, null])
  assert.equal(clock.pending, 0)
  clock.advance(10000)
  clock.callbacks.at(-1)()
  assert.equal(captures, 1)
  assert.equal(timer.getSnapshot().countdown, null)
})

test('rapid duplicate shutter presses and mode changes cannot restart an active countdown', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  let captures = 0
  timer.setEnabled(true)
  timer.trigger(() => captures++)
  clock.advance(1000)
  for (let press = 0; press < 20; press++) assert.equal(timer.trigger(() => captures++), false)
  timer.setEnabled(false)
  assert.deepEqual(timer.getSnapshot(), { enabled: true, countdown: 4 })
  assert.equal(clock.pending, 1)
  clock.advance(4000)
  assert.equal(captures, 1)
})

test('timer stays enabled between four frames and an individual retake replaces only its target', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  const photos = [null, null, null, null]
  let capture = 0
  timer.setEnabled(true)
  for (let slot = 0; slot < 4; slot++) {
    timer.trigger(() => { photos[slot] = ++capture })
    clock.advance(5000)
    assert.equal(timer.getSnapshot().enabled, true)
  }
  assert.deepEqual(photos, [1, 2, 3, 4])
  photos[1] = null
  timer.trigger(() => { photos[1] = ++capture })
  clock.advance(4999)
  assert.deepEqual(photos, [1, null, 3, 4])
  clock.advance(1)
  assert.deepEqual(photos, [1, 5, 3, 4])
  assert.equal(timer.getSnapshot().enabled, true)
})

test('turning the timer Off restores immediate capture and a new session defaults Off', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  let captures = 0
  timer.setEnabled(true)
  timer.trigger(() => captures++)
  clock.advance(5000)
  timer.setEnabled(false)
  timer.trigger(() => captures++)
  assert.equal(captures, 2)
  assert.equal(clock.pending, 0)
  assert.equal(createCaptureTimer(clock).getSnapshot().enabled, false)
})

test('cancel releases the timeout without capture or resetting the session choice', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  let captures = 0
  timer.setEnabled(true)
  timer.trigger(() => captures++)
  clock.advance(2200)
  timer.cancel()
  timer.cancel()
  assert.deepEqual(timer.getSnapshot(), { enabled: true, countdown: null })
  assert.equal(clock.pending, 0)
  clock.advance(10000)
  assert.equal(captures, 0)
})

test('a callback already queued before cleanup cannot capture or disturb a new countdown', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  let oldCaptures = 0
  let newCaptures = 0
  timer.setEnabled(true)
  timer.trigger(() => oldCaptures++)
  clock.advance(4000)
  const queuedFinalTick = clock.callbacks.at(-1)
  timer.cancel()
  timer.trigger(() => newCaptures++)
  queuedFinalTick()
  assert.equal(timer.getSnapshot().countdown, 5)
  assert.equal(clock.pending, 1)
  clock.advance(5000)
  assert.equal(oldCaptures, 0)
  assert.equal(newCaptures, 1)
})

test('cleanup on the last tick prevents its capture even if a subscriber cancels synchronously', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  let captures = 0
  timer.setEnabled(true)
  timer.subscribe(() => { if (!timer.isRunning()) timer.cancel() })
  timer.trigger(() => captures++)
  clock.advance(5000)
  assert.equal(captures, 0)
  assert.equal(clock.pending, 0)
})

test('React subscriptions receive stable snapshots and unsubscribe cleanly', () => {
  const timer = createCaptureTimer()
  const initial = timer.getSnapshot()
  assert.equal(timer.getSnapshot(), initial)
  let changes = 0
  const unsubscribe = timer.subscribe(() => changes++)
  timer.setEnabled(true)
  assert.notEqual(timer.getSnapshot(), initial)
  timer.setEnabled(true)
  assert.equal(changes, 1)
  unsubscribe()
  timer.setEnabled(false)
  assert.equal(changes, 1)
})

test('camera effect cleanup cancels pending capture and removes page listeners on unmount/navigation', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  const pageDocument = new EventTarget()
  const pageWindow = new EventTarget()
  pageDocument.hidden = true
  let captures = 0
  const cleanup = registerCaptureTimerCleanup(timer, pageDocument, pageWindow)
  timer.setEnabled(true)
  timer.trigger(() => captures++)
  clock.advance(4000)
  const queuedFinalTick = clock.callbacks.at(-1)
  cleanup()
  assert.equal(clock.pending, 0)
  queuedFinalTick()
  clock.advance(10000)
  assert.equal(captures, 0)
  // A reused store remains usable (React StrictMode); old listeners are gone.
  timer.trigger(() => captures++)
  pageDocument.dispatchEvent(new Event('visibilitychange'))
  pageWindow.dispatchEvent(new Event('pagehide'))
  assert.equal(timer.getSnapshot().countdown, 5)
  clock.advance(5000)
  assert.equal(captures, 1)
})

test('hidden pages and pagehide cancel the timer, while returning to a visible page never captures', () => {
  const clock = createClock()
  const timer = createCaptureTimer(clock)
  const pageDocument = new EventTarget()
  const pageWindow = new EventTarget()
  pageDocument.hidden = false
  let captures = 0
  const cleanup = registerCaptureTimerCleanup(timer, pageDocument, pageWindow)
  timer.setEnabled(true)
  timer.trigger(() => captures++)
  pageDocument.dispatchEvent(new Event('visibilitychange'))
  assert.equal(timer.getSnapshot().countdown, 5)
  pageDocument.hidden = true
  pageDocument.dispatchEvent(new Event('visibilitychange'))
  assert.equal(clock.pending, 0)
  pageDocument.hidden = false
  pageDocument.dispatchEvent(new Event('visibilitychange'))
  clock.advance(10000)
  assert.equal(captures, 0)
  timer.trigger(() => captures++)
  pageWindow.dispatchEvent(new Event('pagehide'))
  assert.equal(clock.pending, 0)
  clock.advance(10000)
  assert.equal(captures, 0)
  assert.equal(timer.getSnapshot().enabled, true)
  cleanup()
})
