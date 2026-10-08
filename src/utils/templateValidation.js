import { getPhotoboothFormat } from '../data/photoboothFormats.js'

export const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024
export const MAX_DESIGN_NAME_LENGTH = 80

export class TemplateValidationError extends Error {
  constructor(field, message) { super(message); this.name = 'TemplateValidationError'; this.field = field }
}

export function templateFileErrorMessage(error) {
  return error instanceof TemplateValidationError ? error.message
    : 'We couldn’t check this PNG. Please choose it again.'
}

export function templateSlug(name) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '') || 'birthday-design'
}

export function validateTemplateName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name || name.length > MAX_DESIGN_NAME_LENGTH) {
    throw new TemplateValidationError('name', `Give your design a name of 1–${MAX_DESIGN_NAME_LENGTH} characters.`)
  }
  return { name, slug: templateSlug(name) }
}

export function validateTemplateFileBasics(file, formatId) {
  const format = getPhotoboothFormat(formatId)
  if (!format) throw new TemplateValidationError('format', 'Choose one of the three photobooth formats.')
  if (!(file instanceof Blob) || !file.size) throw new TemplateValidationError('file', 'Choose a PNG template file.')
  if (file.size > MAX_TEMPLATE_BYTES) throw new TemplateValidationError('file', 'Your PNG must be 10 MB or smaller.')
  if (typeof file.name !== 'string' || !/\.png$/i.test(file.name) || file.type && file.type !== 'image/png') {
    throw new TemplateValidationError('file', 'Please choose a PNG file with a .png extension.')
  }
  return format
}

export function readPngDimensions(buffer) {
  const bytes = new Uint8Array(buffer)
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 33 || !signature.every((byte, i) => bytes[i] === byte)
    || new DataView(buffer).getUint32(8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') {
    throw new TemplateValidationError('file', 'This file isn’t a valid PNG. Please export your artwork as PNG.')
  }
  const header = new DataView(buffer)
  return { width: header.getUint32(16), height: header.getUint32(20) }
}

async function decodePngDimensions(file) {
  if (typeof createImageBitmap === 'function') {
    const image = await createImageBitmap(file)
    try { return { width: image.width, height: image.height } } finally { image.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight }
  } finally { URL.revokeObjectURL(url) }
}

export async function validateTemplatePng(file, formatId, { decode = decodePngDimensions } = {}) {
  const format = validateTemplateFileBasics(file, formatId)
  const expected = `This ${format.widthInches} × ${format.heightInches} template must be exactly ${format.canvasWidth} × ${format.canvasHeight} px.`
  const header = readPngDimensions(await file.slice(0, 33).arrayBuffer())
  if (header.width !== format.canvasWidth || header.height !== format.canvasHeight) throw new TemplateValidationError('file', expected)
  let image
  try { image = await decode(file) } catch { throw new TemplateValidationError('file', 'We couldn’t open this PNG. Please export the artwork again.') }
  if (image.width !== header.width || image.height !== header.height) throw new TemplateValidationError('file', expected)
  return { width: image.width, height: image.height }
}
