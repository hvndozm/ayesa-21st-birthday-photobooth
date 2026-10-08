import { getSupabaseClient } from '../lib/supabaseClient.js'
import { isCustomDesignId } from '../data/photoboothDesigns.js'

export const MESSAGE_PAGE_SIZE = 50
export const GALLERY_PAGE_SIZE = 24
export const PREVIEW_LIFETIME_SECONDS = 600
const messageFields = 'id,nickname,message,is_read,created_at'
const galleryFields = 'id,storage_path,format_id,design_id,filter_id,width,height,created_at'
const safeCodes = new Set(['42501', '23505', '23503', '23514', '42P01', '42703', 'PGRST204', 'PGRST205', 'PGRST301', 'PGRST302', 'AccessDenied', 'Unauthorized', 'not_found'])

export class PrivateDashboardError extends Error {
  constructor(operation, resource, error = {}) {
    super('This birthday keepsake is temporarily unavailable.')
    this.name = 'PrivateDashboardError'
    this.operation = operation
    this.resource = resource
    this.code = safeCodes.has(error.code) ? error.code : null
    const status = Number(error.status ?? error.statusCode)
    this.status = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null
    this.technicalCause = `${resource} ${operation} failed${this.code ? ` (code ${this.code})` : ''}${this.status ? ` (HTTP ${this.status})` : ''}.`
  }
}

// The route guard grants UI access; existing database/Storage RLS grants reads.
// Never create a guest session here, change policies, or use a privileged key.
export async function privateDataRequest(operation, resource, build, options = {}) {
  const client = options.client === undefined ? getSupabaseClient() : options.client
  if (!client) throw new PrivateDashboardError(operation, resource)
  const controller = new AbortController()
  let timer
  let cancel
  try {
    const deadline = new Promise((_, reject) => {
      cancel = () => { controller.abort(); reject(new PrivateDashboardError(operation, resource)) }
      timer = setTimeout(cancel, options.timeoutMs ?? 15_000)
      if (options.signal?.aborted) cancel()
      else options.signal?.addEventListener('abort', cancel, { once: true })
    })
    if (controller.signal.aborted) return await deadline
    // Includes Storage's response body consumption, not just response headers.
    const response = await Promise.race([Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new PrivateDashboardError(operation, resource)
      return build(client, controller.signal)
    }), deadline])
    if (!response || response.error) {
      const failure = new PrivateDashboardError(operation, resource, {
        code: response?.error?.code, status: response?.error?.status ?? response?.error?.statusCode ?? response?.status,
      })
      failure.uncertain = !!options.write && (!failure.status && !failure.code || failure.status >= 500)
      throw failure
    }
    return response
  } catch (error) {
    const failure = error instanceof PrivateDashboardError ? error : new PrivateDashboardError(operation, resource, error)
    if (options.write && failure.uncertain === undefined) failure.uncertain = !failure.status && !failure.code || failure.status >= 500
    throw failure
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', cancel)
  }
}

const request = privateDataRequest

async function countRows(table, unreadOnly, options) {
  const response = await request('COUNT', table, (client, signal) => {
    let query = client.from(table).select('id', { count: 'exact', head: true })
    if (unreadOnly) query = query.eq('is_read', false)
    return query.abortSignal(signal)
  }, options)
  if (!Number.isInteger(response.count) || response.count < 0) throw new PrivateDashboardError('COUNT', table)
  return response.count
}

export async function getBirthdayMessageCounts(options = {}) {
  const [total, unread] = await Promise.all([
    countRows('birthday_messages', false, options), countRows('birthday_messages', true, options),
  ])
  return { total, unread }
}

export async function getPhotostripCount(options = {}) {
  return { total: await countRows('photostrips', false, options) }
}

async function getPage(table, fields, pageSize, { offset = 0, filter = 'all', ...options } = {}) {
  if (!Number.isInteger(offset) || offset < 0 || !['all', 'unread', 'read'].includes(filter)) {
    throw new PrivateDashboardError('SELECT', table)
  }
  const response = await request('SELECT', table, (client, signal) => {
    let query = client.from(table).select(fields, { count: 'exact' })
    if (table === 'birthday_messages' && filter !== 'all') query = query.eq('is_read', filter === 'read')
    return query.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + pageSize - 1).abortSignal(signal)
  }, options)
  if (!Array.isArray(response.data)) throw new PrivateDashboardError('SELECT', table)
  const items = response.data
  return { items, nextOffset: offset + items.length,
    hasMore: Number.isInteger(response.count) ? offset + items.length < response.count : items.length === pageSize }
}

export const getBirthdayMessages = (options) => getPage('birthday_messages', messageFields, MESSAGE_PAGE_SIZE, options)

// A page may contain many memories using the same custom frame. Resolve their
// display names once as a batch, including inactive rows visible to this role.
// No names are persisted beyond the protected gallery's in-memory page data.
export async function getPrivateDesignNames(designIds, options = {}) {
  const ids = [...new Set(designIds.filter(isCustomDesignId))]
  if (!ids.length) return {}
  const response = await request('SELECT design names', 'photostrip_designs', (client, signal) =>
    client.from('photostrip_designs').select('id,name').in('id', ids).abortSignal(signal), options)
  if (!Array.isArray(response.data)) throw new PrivateDashboardError('SELECT design names', 'photostrip_designs')
  const requested = new Set(ids)
  return Object.fromEntries(response.data.filter(row => requested.has(row?.id) && typeof row.name === 'string' && row.name.trim())
    .map(row => [row.id, row.name.trim().slice(0, 80)]))
}

export async function getPrivatePhotostrips(options = {}) {
  const page = await getPage('photostrips', galleryFields, GALLERY_PAGE_SIZE, options)
  if (!page.items.some(item => isCustomDesignId(item.design_id))) return page
  let names = {}
  let designNamesError = null
  try {
    names = await getPrivateDesignNames(page.items.map(item => item.design_id), options)
  } catch (error) {
    // A missing/deleted/restricted template must never hide its already-flattened
    // memory. Preserve only safe diagnostics; cancelled private work cannot win.
    if (options.signal?.aborted) throw error
    designNamesError = error
  }
  return {
    ...page,
    items: page.items.map(item => isCustomDesignId(item.design_id)
      ? { ...item, customDesignName: names[item.design_id] ?? null } : item),
    ...(designNamesError ? { designNamesError } : {}),
  }
}

export async function markBirthdayMessageRead(messageId, options = {}) {
  if (!messageId) throw new PrivateDashboardError('UPDATE is_read', 'birthday_messages')
  const response = await request('UPDATE is_read', 'birthday_messages', (client, signal) =>
    client.from('birthday_messages').update({ is_read: true }).eq('id', messageId)
      .select('id,is_read').maybeSingle().abortSignal(signal), options)
  // RLS can silently match zero rows. Do not claim success without confirmation.
  if (response.data?.id !== messageId || response.data?.is_read !== true) {
    throw new PrivateDashboardError('UPDATE is_read', 'birthday_messages')
  }
  return { id: messageId, is_read: true }
}

export async function getPrivatePreviews(items, options = {}) {
  if (!items.length) return {}
  const paths = [...new Set(items.map(item => item.storage_path).filter(path => typeof path === 'string' && path))]
  const bucket = options.bucket ?? 'photostrips'
  const response = paths.length ? await request('SIGN previews', `${bucket} Storage`, (client) =>
    client.storage.from(bucket).createSignedUrls(paths, PREVIEW_LIFETIME_SECONDS), options) : { data: [] }
  const byPath = new Map((response.data ?? []).map(item => [item.path, item]))
  const expiresAt = Date.now() + PREVIEW_LIFETIME_SECONDS * 1000
  return Object.fromEntries(items.map(item => {
    const signed = byPath.get(item.storage_path)
    return [item.id, signed?.signedUrl && !signed.error
      ? { url: signed.signedUrl, expiresAt, status: 'ready' }
      : { status: 'unavailable' }]
  }))
}

export async function downloadPrivatePhotostrip(storagePath, options = {}) {
  if (typeof storagePath !== 'string' || !storagePath) throw new PrivateDashboardError('DOWNLOAD', 'photostrips Storage')
  const response = await request('DOWNLOAD', 'photostrips Storage', (client, signal) =>
    client.storage.from('photostrips').download(storagePath, {}, { signal }), options)
  if (!(response.data instanceof Blob) || !response.data.size) throw new PrivateDashboardError('DOWNLOAD', 'photostrips Storage')
  return response.data
}
