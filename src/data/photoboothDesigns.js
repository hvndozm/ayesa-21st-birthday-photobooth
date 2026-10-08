import { getPhotoboothFormat } from './photoboothFormats.js'
import { getDesignsForFormat, getPlaceholderDesign } from './placeholderDesigns.js'

export const CUSTOM_DESIGNS_PER_FORMAT = 4
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const builtInDesignsByFormat = new Map()
const emptyDesigns = []

export function isCustomDesignId(designId) {
  return typeof designId === 'string' && uuidPattern.test(designId)
}

export function isCustomDesignPath(storagePath, formatId) {
  if (!getPhotoboothFormat(formatId) || typeof storagePath !== 'string') return false
  const parts = storagePath.split('/')
  return parts.length === 2 && parts[0] === formatId && /\.png$/i.test(parts[1])
    && isCustomDesignId(parts[1].slice(0, -4))
}

// Keep every existing local ID, theme, capture style, and Canvas configuration.
export function getBuiltInDesigns(formatId) {
  if (!getPhotoboothFormat(formatId)) return emptyDesigns
  if (!builtInDesignsByFormat.has(formatId)) {
    builtInDesignsByFormat.set(formatId, getDesignsForFormat(formatId).map(design => ({ ...design, source: 'builtin' })))
  }
  return builtInDesignsByFormat.get(formatId)
}

export function getBuiltInDesign(designId, formatId) {
  return getBuiltInDesigns(formatId).find(design => design.id === designId) ?? null
}

export function isBuiltInDesign(design) {
  return !!design && !!getPlaceholderDesign(design.id, design.formatId)
    && design.source !== 'custom'
}

export function isCustomDesign(design) {
  return !!design && design.source === 'custom' && isCustomDesignId(design.id)
    && !!getPhotoboothFormat(design.formatId)
}

// Database rows are normalized once; URLs and user-provided route values are
// never treated as metadata. Inactive rows are useful only in private galleries.
export function normalizeCustomDesign(row, { requireActive = true } = {}) {
  if (!row || !isCustomDesignId(row.id) || !getPhotoboothFormat(row.format_id)
    || !isCustomDesignPath(row.storage_path, row.format_id)
    || typeof row.is_active !== 'boolean' || requireActive && !row.is_active) return null
  const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
  return {
    id: row.id,
    name: name || 'Custom Birthday Design',
    formatId: row.format_id,
    source: 'custom',
    storagePath: row.storage_path,
    isActive: row.is_active,
    description: 'An original birthday frame for this format.',
  }
}

export function resolvePhotoboothDesign(designId, formatId, customDesigns = []) {
  const builtin = getBuiltInDesign(designId, formatId)
  if (builtin) return builtin
  return customDesigns.find(design => isCustomDesign(design) && design.id === designId
    && design.formatId === formatId && design.isActive === true) ?? null
}
