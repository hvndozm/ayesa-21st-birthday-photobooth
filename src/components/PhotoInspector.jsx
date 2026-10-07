import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

export default function PhotoInspector({ photo, photoNumber, onClose }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog ref={dialogRef} className="photo-inspector" aria-labelledby="inspect-title"
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault()
          dialogRef.current.querySelector('button')?.focus()
        }
      }} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div><h2 id="inspect-title">Photo {photoNumber}</h2>
        <button type="button" className="camera-icon-button" onClick={onClose} aria-label="Close photo preview"><Icon name="close" /></button>
      </div>
      <img src={photo.url} alt={`Full preview of captured photo ${photoNumber}`} />
    </dialog>
  )
}
