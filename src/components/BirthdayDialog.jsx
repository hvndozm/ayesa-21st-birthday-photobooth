import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

export default function BirthdayDialog({ titleId, closeLabel, className = '', onClose, children }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    dialog.querySelector('[data-dialog-close]')?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
      else document.getElementById('main-content')?.focus({ preventScroll: true })
    }
  }, [])

  function keepFocus(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')]
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  return <dialog ref={dialogRef} className={`birthday-dialog ${className}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={keepFocus}>
    <button type="button" className="birthday-dialog-close" data-dialog-close aria-label={closeLabel} onClick={onClose}><Icon name="close" /></button>
    <div className="birthday-dialog-content">{children}</div>
  </dialog>
}
