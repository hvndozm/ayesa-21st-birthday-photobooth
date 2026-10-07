import { createSelectionSearch } from './photoboothNavigation.js'

export function createCaptureSearch(formatId, designId, mockMode = false, notice) {
  const parameters = new URLSearchParams(createSelectionSearch(formatId, designId))
  if (mockMode) parameters.set('mockCamera', 'true')
  if (notice) parameters.set('notice', notice)
  return `?${parameters.toString()}`
}
