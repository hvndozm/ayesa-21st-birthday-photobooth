// Keep one save per immutable four-photo set, chosen design, and filter. Weak keys let
// completed sessions be collected after the existing photo lifecycle clears them.
// This also covers returning from the camera without changing any photos.
export async function loadPhotostripStorage(load = () => import('./photostripStorage.js'), timeoutMs = 12_000) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Gallery loading timed out.')), timeoutMs) }),
    ])
  } catch {
    // No write has begun. A later-loaded module cannot continue past the rejected
    // await, so a deliberate retry remains safe. Do not expose chunk error URLs.
    throw Object.assign(new Error('Gallery saving could not be loaded.'), { code: 'client-loading-failed', retryable: true })
  } finally {
    clearTimeout(timer)
  }
}

export function createPhotostripSaveCoordinator(savePhotostrip) {
  const saves = new WeakMap()

  return function startSave(photos, result, format, design, retry = false) {
    let selections = saves.get(photos)
    if (!selections) { selections = new Map(); saves.set(photos, selections) }
    const filterId = result.filterId === undefined ? 'original' : result.filterId
    const key = `${format.id}:${design.id}:${filterId}`
    const previous = selections.get(key)
    if (previous && (previous.state.status === 'saving' || previous.state.status === 'success'
      || !retry || !previous.state.canRetry)) return previous

    const entry = { state: { status: 'saving', canRetry: false }, promise: null }
    selections.set(key, entry)
    entry.promise = Promise.resolve()
      .then(() => savePhotostrip({
        blob: result.blob, formatId: format.id, designId: design.id, design,
        width: result.width, height: result.height, filterId,
      }))
      .then(() => {
        entry.state = { status: 'success', canRetry: false }
        return entry.state
      })
      .catch((error) => {
        // Service errors contain sanitized diagnostics only. Keep technical details
        // out of birthday UI; never retain/log SDK responses, tokens, or image data.
        entry.state = {
          status: error?.code === 'configuration-unavailable' ? 'unavailable' : 'error',
          canRetry: error?.retryable === true,
          uncertain: error?.retryable === false && error?.code === 'outcome-unknown',
        }
        return entry.state
      })
    return entry
  }
}
