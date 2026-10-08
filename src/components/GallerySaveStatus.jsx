import Icon from './Icon.jsx'

export default function GallerySaveStatus({ save }) {
  const messages = {
    idle: 'Saving a copy to Ayesa’s birthday gallery…',
    saving: 'Saving a copy to Ayesa’s birthday gallery…',
    success: 'Saved to Ayesa’s private birthday gallery ♡',
    unavailable: 'Gallery saving is unavailable right now, but your photo is still ready to download.',
    error: save.uncertain
      ? 'We couldn’t confirm the gallery copy, but your photo is still ready to download.'
      : 'We couldn’t save a gallery copy, but your photo is still ready to download.',
  }

  return (
    <div className={`gallery-save-status gallery-save-status--${save.status}`} role="status" aria-live="polite" aria-atomic="true">
      <p><Icon name={save.status === 'success' ? 'check' : 'heart'} />{messages[save.status]}</p>
      {save.uncertain && <p className="gallery-save-note">A gallery copy may already be there. You can still keep your PNG.</p>}
      {save.canRetry && <button type="button" className="gallery-save-retry" onClick={save.retry}><Icon name="redo" />Try Again</button>}
    </div>
  )
}
