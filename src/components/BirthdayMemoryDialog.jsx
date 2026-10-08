import { useEffect, useRef, useState } from 'react'
import BirthdayDialog from './BirthdayDialog.jsx'
import PrivateMemoryPreview from './PrivateMemoryPreview.jsx'
import Icon from './Icon.jsx'
import { downloadPrivatePhotostrip } from '../services/privateDashboardService.js'
import { formatBirthdayDate, memoryDownloadName, resolveMemoryLabels } from '../utils/birthdayDashboard.js'

export default function BirthdayMemoryDialog({ memory, preview, onPreviewError, onRetryPreview, onClose }) {
  const labels = resolveMemoryLabels(memory)
  const [status, setStatus] = useState('idle')
  const request = useRef(null)
  const urls = useRef(new Map())
  useEffect(() => {
    const downloads = urls.current
    return () => {
      request.current?.abort()
      for (const [url, timer] of downloads) { clearTimeout(timer); URL.revokeObjectURL(url) }
      downloads.clear()
    }
  }, [])

  async function download() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setStatus('loading')
    try {
      const blob = await downloadPrivatePhotostrip(memory.storage_path, { signal: controller.signal })
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const timer = setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url) }, 30_000)
      urls.current.set(url, timer)
      const link = document.createElement('a')
      link.href = url
      link.download = memoryDownloadName(memory)
      document.body.append(link)
      link.click()
      link.remove()
      setStatus('success')
    } catch {
      if (!controller.signal.aborted) setStatus('error')
    } finally {
      if (request.current === controller) request.current = null
    }
  }
  return <BirthdayDialog titleId="birthday-memory-title" closeLabel="Close birthday memory" className="birthday-memory-dialog" onClose={onClose}>
    <p className="eyebrow">A happy little keepsake</p>
    <h2 id="birthday-memory-title">{labels.designName}</h2>
    <p className="birthday-memory-info">{labels.formatName} · {labels.dimensions}</p>
    <time dateTime={memory.created_at}>{formatBirthdayDate(memory.created_at, true)}</time>
    <div className="birthday-memory-large"><PrivateMemoryPreview memory={memory} preview={preview} onError={onPreviewError} /></div>
    {preview?.status === 'unavailable' && <button type="button" className="birthday-small-button" onClick={() => onRetryPreview(memory)}>Reload preview</button>}
    <button type="button" className="button button--primary birthday-memory-download" onClick={download} disabled={status === 'loading'}>
      <Icon name="download" />{status === 'loading' ? 'Getting your PNG…' : status === 'error' ? 'Retry Download PNG' : 'Download PNG'}
    </button>
    <p className="birthday-download-status" role={status === 'error' ? 'alert' : 'status'}>
      {status === 'error' ? 'We couldn’t download this memory yet. Please try again.'
        : status === 'success' ? 'Your original PNG is ready. Check your browser’s downloads.' : 'The original full-resolution birthday memory, yours to keep.'}
    </p>
  </BirthdayDialog>
}
