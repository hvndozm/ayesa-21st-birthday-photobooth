import { useCallback, useEffect, useRef, useState } from 'react'
import BirthdayDialog from './BirthdayDialog.jsx'
import Icon from './Icon.jsx'
import useTemplateFile from '../hooks/useTemplateFile.js'
import usePrivateResource from '../hooks/usePrivateResource.js'
import { photoboothFormats, getPhotoboothFormat } from '../data/photoboothFormats.js'
import { getCustomDesignCount, uploadTemplateDesign } from '../services/templateDesignService.js'
import { CUSTOM_DESIGNS_PER_FORMAT } from '../data/photoboothDesigns.js'
import { MAX_DESIGN_NAME_LENGTH, validateTemplateName } from '../utils/templateValidation.js'
import { templateErrorMessage } from '../utils/templateManagement.js'

export default function TemplateUploadDialog({ onClose, onUploaded }) {
  const [name, setName] = useState('')
  const [formatId, setFormatId] = useState('2x6')
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const request = useRef(null)
  const nameInput = useRef(null)
  const preview = useTemplateFile(file, formatId)
  const format = getPhotoboothFormat(formatId)
  const loadCount = useCallback(options => getCustomDesignCount(formatId, options), [formatId])
  const slots = usePrivateResource(loadCount)
  const limitReached = slots.status === 'ready' && slots.data >= CUSTOM_DESIGNS_PER_FORMAT
  useEffect(() => () => request.current?.abort(), [])

  async function submit(event) {
    event.preventDefault()
    if (request.current || error?.uncertain || error?.cleanupFailed) return
    if (slots.status !== 'ready' || limitReached) return
    try { validateTemplateName(name) } catch (failure) { setError(failure); nameInput.current?.focus(); return }
    if (preview.status !== 'ready') { setError({ message: 'Choose a valid PNG before uploading.', name: 'TemplateValidationError' }); return }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      await uploadTemplateDesign({ name, formatId, file }, { signal: controller.signal })
      if (!controller.signal.aborted) onUploaded()
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure)
        if (failure?.code === 'custom-limit-reached') slots.retry()
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (request.current === controller) request.current = null
    }
  }
  const close = () => { if (!request.current) onClose() }
  return <BirthdayDialog titleId="template-upload-title" closeLabel="Close template upload" className="admin-upload-dialog" closeDisabled={busy} onClose={close}>
    <p className="eyebrow">Custom birthday artwork</p>
    <h2 id="template-upload-title">Upload a new <em>design</em></h2>
    <form className="admin-upload-form" onSubmit={submit} noValidate aria-busy={busy}>
      <div className="admin-field">
        <label htmlFor="template-name">Design Name</label>
        <input ref={nameInput} id="template-name" required maxLength={MAX_DESIGN_NAME_LENGTH} value={name} disabled={busy}
          aria-invalid={error?.field === 'name'} aria-describedby={error?.field === 'name' ? 'template-upload-error' : undefined}
          onChange={event => { setName(event.target.value); if (!error?.uncertain && !error?.cleanupFailed) setError(null) }} />
      </div>
      <div className="admin-field">
        <label htmlFor="template-format">Format</label>
        <select id="template-format" value={formatId} disabled={busy} onChange={event => { setFormatId(event.target.value); if (!error?.uncertain && !error?.cleanupFailed) setError(null) }}>
          {photoboothFormats.map(option => <option key={option.id} value={option.id}>{option.widthInches} × {option.heightInches} · {option.displayName}</option>)}
        </select>
      </div>
      <div className="admin-artwork-guide" aria-live="polite">
        {slots.status === 'loading' ? <p>Checking custom design slots…</p>
          : slots.status === 'error' ? <>
            <p>We couldn’t check the available slots. Please retry before uploading.</p>
            <button type="button" className="birthday-small-button" onClick={slots.retry}>Retry slot count</button>
          </> : <>
            <strong>{slots.data} of {CUSTOM_DESIGNS_PER_FORMAT} custom design slots used</strong>
            <p>{limitReached ? templateErrorMessage({ code: 'custom-limit-reached' }) : 'Active and inactive designs both use a slot. Deleting a design frees one.'}</p>
          </>}
      </div>
      <div className="admin-artwork-guide" id="template-file-guide">
        <strong>{format.canvasWidth} × {format.canvasHeight} px · PNG · maximum 10 MB</strong>
        <p>The photo openings in your template must be transparent.</p>
        <p>Align all four openings with the standard photo frames. Keep decorative artwork around the openings.</p>
      </div>
      <div className="admin-field">
        <label htmlFor="template-file">PNG File</label>
        <input id="template-file" type="file" accept="image/png" disabled={busy}
          aria-invalid={preview.status === 'error'} aria-describedby={`template-file-guide${preview.status === 'error' ? ' template-file-error' : ''}`}
          onChange={event => { setFile(event.target.files?.[0] ?? null); if (!error?.uncertain && !error?.cleanupFailed) setError(null) }} />
        {preview.status === 'error' && <p id="template-file-error" className="admin-control-error" role="alert">{preview.error}</p>}
        {preview.status === 'validating' && <p className="admin-file-status" role="status">Checking your PNG and its dimensions…</p>}
      </div>
      {preview.status === 'ready' && <figure className="admin-local-preview">
        <div className="admin-template-image"><img src={preview.url} width={preview.width} height={preview.height} alt="Local preview of the selected template artwork and transparent photo openings" /></div>
        <figcaption>Local preview · {preview.width} × {preview.height} px</figcaption>
      </figure>}
      {error && <p className="admin-control-error" id="template-upload-error" role="alert">{templateErrorMessage(error)}</p>}
      <div className="admin-dialog-actions">
        <button type="button" className="button button--secondary" disabled={busy} onClick={close}>Cancel</button>
        <button type="submit" className="button button--primary admin-upload-submit" disabled={busy || preview.status !== 'ready' || slots.status !== 'ready' || limitReached || error?.uncertain || error?.cleanupFailed}>
          <Icon name="sparkle" />{busy ? 'Uploading design…' : 'Upload Design'}
        </button>
      </div>
      <p className="admin-file-status" role="status">{busy ? 'Please keep this window open while your template is saved.' : 'Your active artwork appears beside the built-in birthday designs.'}</p>
    </form>
  </BirthdayDialog>
}
