import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'

export function templateLabels(design) {
  const format = getPhotoboothFormat(design.format_id)
  return { formatName: format?.displayName ?? 'Birthday template',
    dimensions: format ? getFormatDimensions(format) : 'Custom artwork',
    width: format?.canvasWidth ?? 600, height: format?.canvasHeight ?? 1800 }
}

export function templateErrorMessage(error) {
  if (error?.name === 'TemplateValidationError') return error.message
  if (error?.cleanupFailed) return 'The design record couldn’t be saved, and its file cleanup needs checking in Supabase. Please review it before uploading again.'
  if (error?.storageRemoved) return 'The file was removed, but its design record deletion wasn’t confirmed. Retry to finish deleting the record, or refresh to check.'
  if (error?.uncertain) return 'We couldn’t confirm the change. Refresh the designs and check before trying again.'
  if (error?.code === 'custom-limit-reached') return 'You already have 4 custom designs for this format. Delete one before adding another.'
  if (error?.code === 'duplicate-name' || error?.code === '23505' || error?.databaseCode === '23505') return 'A design with this name already exists for that format. Please choose another name.'
  if (error?.code === 'admin-required') return 'Your Admin session is unavailable. Please log in again.'
  if (error?.code === 'file-removal-unconfirmed') return 'File removal wasn’t confirmed. The design record is still here. Check its file and permissions before trying again.'
  return 'We couldn’t complete this change yet. Please try again.'
}

export function createTemplatePreview(file, urlApi = URL) {
  const url = urlApi.createObjectURL(file)
  let released = false
  return { url, release() { if (!released) { released = true; urlApi.revokeObjectURL(url) } } }
}
