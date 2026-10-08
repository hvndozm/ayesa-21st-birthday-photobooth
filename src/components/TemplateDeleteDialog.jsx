import { useEffect, useRef, useState } from 'react'
import BirthdayDialog from './BirthdayDialog.jsx'
import { deleteTemplateDesign } from '../services/templateDesignService.js'
import { templateErrorMessage } from '../utils/templateManagement.js'

export default function TemplateDeleteDialog({ design, onClose, onDeleted, onPartial }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])
  async function remove() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      await deleteTemplateDesign(design.id, { confirmed: true, signal: controller.signal })
      if (!controller.signal.aborted) onDeleted(design)
    } catch (failure) {
      if (!controller.signal.aborted) { setError(failure); if (failure.storageRemoved) onPartial(design.id) }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (request.current === controller) request.current = null
    }
  }
  const close = () => { if (!request.current) onClose() }
  return <BirthdayDialog titleId="template-delete-title" closeLabel="Cancel template deletion" className="admin-delete-dialog" closeDisabled={busy} onClose={close}>
    <p className="eyebrow">Template design</p>
    <h2 id="template-delete-title">Delete <em>{design.name}</em>?</h2>
    <p>This permanently removes the template file and its design record. Saved birthday photostrips stay safe.</p>
    {error && <p className="admin-control-error" role="alert">{templateErrorMessage(error)}</p>}
    <div className="admin-dialog-actions">
      <button type="button" className="button button--secondary" onClick={close} disabled={busy}>Cancel</button>
      <button type="button" className="button admin-confirm-delete" disabled={busy} onClick={remove}>
        {busy ? 'Deleting…' : error?.storageRemoved ? 'Retry Record Deletion' : error ? 'Retry Delete Design' : 'Delete Design'}
      </button>
    </div>
    {busy && <p role="status" className="admin-file-status">Removing the selected template. Please keep this window open.</p>}
  </BirthdayDialog>
}
