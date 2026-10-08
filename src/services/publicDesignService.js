import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getPhotoboothFormat } from '../data/photoboothFormats.js'
import { CUSTOM_DESIGNS_PER_FORMAT, isCustomDesign, isCustomDesignId,
  isCustomDesignPath, normalizeCustomDesign } from '../data/photoboothDesigns.js'
import { ensureGuestSession } from './photostripStorage.js'
import { PrivateDashboardError, privateDataRequest, getPrivatePreviews } from './privateDashboardService.js'
import { validateTemplatePng } from '../utils/templateValidation.js'

const table = 'photostrip_designs'
const bucket = 'template-designs'
const fields = 'id,name,format_id,storage_path,is_active'

export class PublicDesignError extends Error {
  constructor(code, cause, operation = 'SELECT', resource = table) {
    super(code === 'design-unavailable' ? 'This design is no longer available.' : 'The custom birthday design could not be loaded.')
    this.name = 'PublicDesignError'
    this.code = code
    this.operation = cause instanceof PrivateDashboardError ? cause.operation : operation
    this.resource = cause instanceof PrivateDashboardError ? cause.resource : resource
    this.databaseCode = cause instanceof PrivateDashboardError ? cause.code : null
    this.status = cause instanceof PrivateDashboardError ? cause.status : null
    this.technicalCause = cause instanceof PrivateDashboardError ? cause.technicalCause
      : `${this.resource} ${this.operation} could not be completed.`
  }
}

function assertCurrent(options) {
  if (options.signal?.aborted) throw new PublicDesignError('cancelled')
}

async function sessionSettings(options) {
  assertCurrent(options)
  const client = options.client === undefined ? getSupabaseClient() : options.client
  if (!client) throw new PublicDesignError('configuration-unavailable')
  try {
    // Private template reads use the same existing/lazy anonymous session as
    // guest saving and messages; a permanent session is always preserved.
    await privateDataRequest('SESSION', 'Auth', () => ensureGuestSession({ client,
      timeoutMs: options.timeoutMs }), { ...options, client })
  } catch (error) { throw new PublicDesignError('session-unavailable', error, 'SESSION', 'Auth') }
  assertCurrent(options)
  return { ...options, client }
}

async function request(operation, resource, build, options) {
  try { return await privateDataRequest(operation, resource, build, options) }
  catch (error) { throw new PublicDesignError('load-failed', error, operation, resource) }
}

export async function getPublicCustomDesigns(formatId, options = {}) {
  if (!getPhotoboothFormat(formatId)) throw new PublicDesignError('invalid-format')
  const settings = await sessionSettings(options)
  const response = await request('SELECT active designs', table, (client, signal) => client.from(table)
    .select(fields).eq('format_id', formatId).eq('is_active', true)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .limit(CUSTOM_DESIGNS_PER_FORMAT).abortSignal(signal), settings)
  if (!Array.isArray(response.data)) throw new PublicDesignError('load-failed')
  // Defend against malformed mock/legacy data without replacing other cards.
  return response.data.map(row => normalizeCustomDesign(row)).filter(design => design?.formatId === formatId)
    .slice(0, CUSTOM_DESIGNS_PER_FORMAT)
}

export async function getPublicCustomDesign(designId, formatId, options = {}) {
  if (!getPhotoboothFormat(formatId) || !isCustomDesignId(designId)) throw new PublicDesignError('design-unavailable')
  const settings = await sessionSettings(options)
  const response = await request('SELECT active design', table, (client, signal) => client.from(table)
    .select(fields).eq('id', designId).eq('format_id', formatId).eq('is_active', true)
    .maybeSingle().abortSignal(signal), settings)
  const design = normalizeCustomDesign(response.data)
  if (!design || design.id !== designId || design.formatId !== formatId) throw new PublicDesignError('design-unavailable')
  return design
}

export async function getCustomDesignPreviews(designs, options = {}) {
  if (!designs.length) return {}
  const valid = designs.filter(design => isCustomDesign(design) && design.isActive
    && isCustomDesignPath(design.storagePath, design.formatId))
  const settings = await sessionSettings(options)
  try {
    return await getPrivatePreviews(valid.map(design => ({ id: design.id, storage_path: design.storagePath })), {
      ...settings, bucket,
    })
  } catch (error) { throw new PublicDesignError('preview-failed', error, 'SIGN previews', `${bucket} Storage`) }
}

export async function downloadCustomDesignOverlay(design, options = {}) {
  if (!isCustomDesign(design) || design.isActive !== true || !isCustomDesignPath(design.storagePath, design.formatId)) {
    throw new PublicDesignError('design-unavailable')
  }
  const settings = await sessionSettings(options)
  const response = await request('DOWNLOAD', `${bucket} Storage`, (client, signal) =>
    client.storage.from(bucket).download(design.storagePath, {}, { signal }), settings)
  if (!(response.data instanceof Blob) || !response.data.size) {
    throw new PublicDesignError('invalid-overlay', null, 'DECODE PNG', `${bucket} Storage`)
  }
  try {
    // A local File wrapper supplies a neutral filename for the existing PNG
    // validator. The downloaded bytes remain intact and are returned unchanged.
    const file = new File([response.data], 'birthday-template.png', { type: response.data.type || 'image/png' })
    await privateDataRequest('DECODE PNG', `${bucket} Storage`, async () => {
      await validateTemplatePng(file, design.formatId, options.validation)
      return { data: true }
    }, settings)
  } catch (error) { throw new PublicDesignError('invalid-overlay', error, 'DECODE PNG', `${bucket} Storage`) }
  assertCurrent(settings)
  return response.data
}
