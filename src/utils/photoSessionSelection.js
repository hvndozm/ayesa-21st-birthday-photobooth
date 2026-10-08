import { getBuiltInDesign, isCustomDesign, isCustomDesignId } from '../data/photoboothDesigns.js'

export function sessionMatchesSelection(session, formatId, designId, mockMode) {
  return !!session && session.formatId === formatId && session.designId === designId && session.mockMode === mockMode
}

export function hasFourPhotos(session, formatId, designId, mockMode) {
  return sessionMatchesSelection(session, formatId, designId, mockMode)
    && Array.isArray(session.photos) && session.photos.length === 4
    && session.photos.every(photo => photo && (photo.blob instanceof Blob || photo.url))
}

export function getSessionDesign(session, formatId, designId) {
  const builtin = getBuiltInDesign(designId, formatId)
  if (builtin) return builtin
  const design = session?.design
  if (isCustomDesign(design) && design.id === designId && design.formatId === formatId && design.overlayBlob instanceof Blob) return design
  // Only a recovery label; it must never reach capture or the renderer.
  return isCustomDesignId(designId) ? { id: designId, formatId, name: 'Custom Birthday Design', source: 'custom' } : null
}
