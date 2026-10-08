import { useEffect, useRef, useState } from 'react'
import TemplatePreview from './TemplatePreview.jsx'
import { setTemplateDesignActive } from '../services/templateDesignService.js'
import { templateErrorMessage, templateLabels } from '../utils/templateManagement.js'
import { formatBirthdayDate } from '../utils/birthdayDashboard.js'

export default function TemplateDesignCard({ design, preview, onPreviewError, onRetryPreview, onOpen, onDelete, onToggle }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const request = useRef(null)
  const labels = templateLabels(design)
  useEffect(() => () => request.current?.abort(), [])
  async function toggle() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      const result = await setTemplateDesignActive(design.id, !design.is_active, { signal: controller.signal })
      if (!controller.signal.aborted) onToggle(design, result.is_active)
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (request.current === controller) request.current = null
    }
  }
  return <li className="admin-design-card">
    <button type="button" className="admin-design-open" onClick={() => onOpen(design)} aria-label={`Preview ${design.name} template`}>
      <TemplatePreview design={design} preview={preview} onError={onPreviewError} />
      <span className="admin-design-caption"><strong>{design.name}</strong><span>{labels.formatName} · {labels.dimensions}</span></span>
    </button>
    <div className="admin-design-meta"><span className={`admin-design-badge${design.is_active ? ' admin-design-badge--active' : ''}`}>{design.is_active ? 'Active' : 'Inactive'}</span>
      <time dateTime={design.created_at}>{formatBirthdayDate(design.created_at)}</time></div>
    {preview?.status === 'unavailable' && <button type="button" className="birthday-small-button" onClick={() => onRetryPreview(design)}>Reload preview</button>}
    <div className="admin-design-actions">
      <button type="button" className="birthday-small-button admin-toggle-design" disabled={busy} aria-label={`${design.is_active ? 'Disable' : 'Enable'} ${design.name}`}
        onClick={toggle}>{busy ? 'Saving…' : design.is_active ? 'Disable' : 'Enable'}</button>
      <button type="button" className="birthday-small-button admin-delete-design" disabled={busy} onClick={() => onDelete(design)} aria-label={`Delete ${design.name}`}>Delete</button>
    </div>
    {error && <p className="admin-control-error" role="alert">{templateErrorMessage(error)}</p>}
  </li>
}
