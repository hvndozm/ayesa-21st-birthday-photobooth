import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getPlaceholderDesign } from '../data/placeholderDesigns.js'

export function formatBirthdayDate(timestamp, includeTime = false) {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return 'A birthday moment'
  return new Intl.DateTimeFormat(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

export function resolveMemoryLabels(memory) {
  const format = getPhotoboothFormat(memory.format_id)
  const design = getPlaceholderDesign(memory.design_id, format?.id)
  return {
    formatName: format?.displayName ?? 'Birthday photostrip',
    dimensions: format ? getFormatDimensions(format) : 'A little keepsake',
    designName: design?.name ?? 'Birthday design',
    width: memory.width > 0 ? memory.width : format?.canvasWidth ?? 600,
    height: memory.height > 0 ? memory.height : format?.canvasHeight ?? 1800,
  }
}

export function memoryDownloadName(memory) {
  const format = getPhotoboothFormat(memory.format_id)
  const date = new Date(memory.created_at)
  const datePart = Number.isFinite(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : 'birthday'
  return `ayesa-memory-${format?.id ?? 'photostrip'}-${datePart}.png`
}

export function applyReadToPage(page, messageId, filter) {
  const found = page.items.find(item => item.id === messageId)
  if (!found || found.is_read) return page
  return {
    ...page,
    items: filter === 'unread' ? page.items.filter(item => item.id !== messageId)
      : page.items.map(item => item.id === messageId ? { ...item, is_read: true } : item),
    // A row leaves the server's Unread collection, so its pagination offset shrinks too.
    nextOffset: filter === 'unread' ? Math.max(0, page.nextOffset - 1) : page.nextOffset,
  }
}
