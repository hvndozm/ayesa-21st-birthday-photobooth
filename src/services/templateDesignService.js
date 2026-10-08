import { getSupabaseClient } from '../lib/supabaseClient.js'
import { isPermanentSession } from '../auth/authAccess.js'
import { loadOwnProfile } from './privateAuthService.js'
import { PrivateDashboardError, privateDataRequest } from './privateDashboardService.js'
import { getPhotoboothFormat } from '../data/photoboothFormats.js'
import { CUSTOM_DESIGNS_PER_FORMAT } from '../data/photoboothDesigns.js'
import { validateTemplateName, validateTemplatePng } from '../utils/templateValidation.js'

export const DESIGN_PAGE_SIZE = 24
const table = 'photostrip_designs'
const bucket = 'template-designs'
const fields = 'id,name,slug,format_id,storage_path,is_active,created_at'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const pendingDeletions = new WeakMap()

export class TemplateDesignError extends Error {
  constructor(code, cause) {
    super('The template change could not be completed.')
    this.name = 'TemplateDesignError'
    this.code = code
    this.technicalCause = cause instanceof PrivateDashboardError ? cause.technicalCause : 'Template management could not be completed.'
    this.databaseCode = cause instanceof PrivateDashboardError ? cause.code : null
    this.operation = cause?.operation ?? null
    this.resource = cause?.resource ?? null
    this.status = cause?.status ?? null
    this.uncertain = cause?.uncertain === true
  }
}

const query = (operation, build, options) => privateDataRequest(operation, table, build, options)
const storage = (operation, build, options) => privateDataRequest(operation, `${bucket} Storage`, build, options)

async function requireAdmin(options) {
  const client = options.client === undefined ? getSupabaseClient() : options.client
  const response = await privateDataRequest('SESSION', 'Auth', client => client.auth.getSession(), { ...options, client })
  const session = response.data?.session
  if (!isPermanentSession(session)) throw new TemplateDesignError('admin-required')
  const profile = await loadOwnProfile(session.user, { ...options, client })
  if (profile?.role !== 'admin' || options.signal?.aborted) throw new TemplateDesignError('admin-required')
  return { client, user: session.user }
}

function assertCurrent(options) {
  if (options.signal?.aborted) throw new TemplateDesignError('cancelled')
}

export async function getTemplateDesignCounts(options = {}) {
  const count = async active => {
    const response = await query('COUNT', (client, signal) => {
      let request = client.from(table).select('id', { count: 'exact', head: true })
      if (active) request = request.eq('is_active', true)
      return request.abortSignal(signal)
    }, options)
    if (!Number.isInteger(response.count) || response.count < 0) throw new PrivateDashboardError('COUNT', table)
    return response.count
  }
  const [total, active] = await Promise.all([count(false), count(true)])
  return { total, active }
}

export async function getCustomDesignCount(formatId, options = {}) {
  if (!getPhotoboothFormat(formatId)) throw new TemplateDesignError('invalid-request')
  const response = await query('COUNT custom format slots', (client, signal) => client.from(table)
    .select('id', { count: 'exact', head: true }).eq('format_id', formatId).abortSignal(signal), options)
  // Active and inactive custom rows both occupy a slot; local built-ins never do.
  if (!Number.isInteger(response.count) || response.count < 0) throw new TemplateDesignError('count-check-failed')
  return response.count
}

export async function getTemplateDesigns({ offset = 0, ...options } = {}) {
  if (!Number.isInteger(offset) || offset < 0) throw new TemplateDesignError('invalid-request')
  const response = await query('SELECT', (client, signal) => client.from(table).select(fields, { count: 'exact' })
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(offset, offset + DESIGN_PAGE_SIZE - 1).abortSignal(signal), options)
  if (!Array.isArray(response.data)) throw new PrivateDashboardError('SELECT', table)
  return { items: response.data, nextOffset: offset + response.data.length,
    hasMore: Number.isInteger(response.count) ? offset + response.data.length < response.count : response.data.length === DESIGN_PAGE_SIZE }
}

export async function uploadTemplateDesign({ name: value, formatId, file }, options = {}) {
  const { name, slug } = validateTemplateName(value)
  // Repeat validation at the service boundary, before client/session or network work.
  await validateTemplatePng(file, formatId, options.validation)
  const admin = await requireAdmin(options)
  const settings = { ...options, client: admin.client }
  const customCount = await getCustomDesignCount(formatId, settings)
  if (customCount >= CUSTOM_DESIGNS_PER_FORMAT) throw new TemplateDesignError('custom-limit-reached')
  const duplicate = await query('CHECK duplicate', (client, signal) => client.from(table)
    .select('id', { head: true, count: 'exact' }).eq('format_id', formatId).eq('slug', slug).abortSignal(signal), settings)
  if (!Number.isInteger(duplicate.count)) throw new TemplateDesignError('duplicate-check-failed')
  if (duplicate.count > 0) throw new TemplateDesignError('duplicate-name')
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new TemplateDesignError('secure-name-unavailable')
  const path = `${formatId}/${globalThis.crypto.randomUUID()}.png`
  assertCurrent(settings)
  try {
    await storage('UPLOAD', client => client.storage.from(bucket).upload(path, file, { contentType: 'image/png', upsert: false }), { ...settings, write: true })
  } catch (error) { throw new TemplateDesignError('upload-failed', error) }
  try {
    assertCurrent(settings)
    await query('INSERT', (client, signal) => client.from(table).insert({
      name, slug, format_id: formatId, storage_path: path, is_active: true, created_by: admin.user.id,
    }).abortSignal(signal), { ...settings, write: true })
  } catch (error) {
    const failure = new TemplateDesignError(error?.code === '23505' ? 'duplicate-name' : 'metadata-failed', error)
    // A missing response can hide a committed row. Preserve its file and prevent blind retry.
    if (failure.uncertain) throw failure
    try {
      // Cleanup is bounded independently, even if the upload form was closed.
      const removal = await storage('CLEANUP', client => client.storage.from(bucket).remove([path]), {
        client: admin.client, timeoutMs: options.cleanupTimeoutMs ?? 5000, write: true,
      })
      failure.cleanupFailed = !Array.isArray(removal.data) || !removal.data.some(item => item.name === path || item.name === path.split('/')[1])
    } catch { failure.cleanupFailed = true }
    throw failure
  }
  return { uploaded: true }
}

export async function setTemplateDesignActive(designId, isActive, options = {}) {
  if (!designId || typeof isActive !== 'boolean') throw new TemplateDesignError('invalid-request')
  const admin = await requireAdmin(options)
  const response = await query('UPDATE is_active', (client, signal) => client.from(table)
    .update({ is_active: isActive }).eq('id', designId).select('id,is_active').maybeSingle().abortSignal(signal), {
    ...options, client: admin.client, write: true,
  })
  if (response.data?.id !== designId || response.data?.is_active !== isActive) throw new TemplateDesignError('toggle-unconfirmed')
  return response.data
}

function validDesignPath(design) {
  if (!getPhotoboothFormat(design.format_id) || typeof design.storage_path !== 'string') return false
  const parts = design.storage_path.split('/')
  return parts.length === 2 && parts[0] === design.format_id && parts[1].endsWith('.png') && uuidPattern.test(parts[1].slice(0, -4))
}

export async function deleteTemplateDesign(designId, { confirmed = false, ...options } = {}) {
  if (!confirmed) throw new TemplateDesignError('confirmation-required')
  if (!designId) throw new TemplateDesignError('invalid-request')
  const admin = await requireAdmin(options)
  const settings = { ...options, client: admin.client }
  const response = await query('SELECT for deletion', (client, signal) => client.from(table)
    .select('id,format_id,storage_path').eq('id', designId).maybeSingle().abortSignal(signal), settings)
  const design = response.data
  if (design?.id !== designId || !validDesignPath(design)) throw new TemplateDesignError('unsafe-delete-target')
  let progress = pendingDeletions.get(admin.client)
  if (!progress) { progress = new Map(); pendingDeletions.set(admin.client, progress) }
  let removed = progress.get(designId) === design.storage_path
  try {
    if (!removed) {
      const removal = await storage('DELETE file', client => client.storage.from(bucket).remove([design.storage_path]), { ...settings, write: true })
      if (!Array.isArray(removal.data) || !removal.data.some(item => item.name === design.storage_path || item.name === design.storage_path.split('/')[1])) {
        throw new TemplateDesignError('file-removal-unconfirmed')
      }
      removed = true
      progress.set(designId, design.storage_path)
    }
    assertCurrent(settings)
    const deletion = await query('DELETE row', (client, signal) => client.from(table).delete()
      .eq('id', designId).eq('storage_path', design.storage_path).select('id').maybeSingle().abortSignal(signal), { ...settings, write: true })
    if (deletion.data?.id !== designId) throw new TemplateDesignError('metadata-removal-unconfirmed')
    progress.delete(designId)
    return { deleted: true }
  } catch (error) {
    const failure = error instanceof TemplateDesignError ? error : new TemplateDesignError('delete-failed', error)
    failure.storageRemoved = removed
    throw failure
  }
}
