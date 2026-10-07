import { useEffect, useRef } from 'react'
import ActionLink from './ActionLink.jsx'
import Decoration from './Decoration.jsx'
import Icon from './Icon.jsx'

export default function WelcomeModal({ onDismiss }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow

    // Native dialog makes the page behind it inert.
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    dialog.querySelector('[data-welcome-start]')?.focus()

    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      const returnTarget = previousFocus !== document.body && previousFocus?.isConnected
        ? previousFocus
        : document.getElementById('start-photobooth')
      returnTarget?.focus({ preventScroll: true })
    }
  }, [])

  function handleCancel(event) {
    event.preventDefault()
    onDismiss()
  }

  function handleKeyDown(event) {
    if (event.key !== 'Tab') return

    const controls = dialogRef.current.querySelectorAll('a[href], button:not([disabled])')
    const firstControl = controls[0]
    const lastControl = controls[controls.length - 1]

    // Keep Tab cycling inside the welcome, including at both ends of the dialog.
    if (event.shiftKey && document.activeElement === firstControl) {
      event.preventDefault()
      lastControl.focus()
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault()
      firstControl.focus()
    }
  }

  return (
    <dialog ref={dialogRef} className="welcome-modal" aria-labelledby="welcome-title"
      aria-describedby="welcome-description" onCancel={handleCancel} onKeyDown={handleKeyDown}>
      <button type="button" className="modal-close" onClick={onDismiss}
        aria-label="Close welcome and explore the homepage"><Icon name="close" /></button>
      <div className="welcome-art" aria-hidden="true">
        <Decoration type="sparkle" className="welcome-sparkle welcome-sparkle--left" />
        <Decoration type="cake" />
        <Decoration type="heart" className="welcome-heart" />
        <Decoration type="sparkle" className="welcome-sparkle welcome-sparkle--right" />
      </div>
      <p className="eyebrow">Happy birthday, Ayesa!</p>
      <h2 id="welcome-title">Welcome to Ayesa’s 21st Birthday Photobooth!</h2>
      <p id="welcome-description">
        Come celebrate our birthday girl with a little love, a little laughter,
        and memories worth keeping.
      </p>
      <ActionLink to="/photobooth" icon="camera" arrow
        onClick={onDismiss} data-welcome-start>Start Photobooth</ActionLink>
      <button type="button" className="welcome-explore" onClick={onDismiss}>
        Let me look around first <Icon name="arrow" />
      </button>
      <p className="welcome-footnote">
        A little birthday magic awaits <span aria-hidden="true">♡</span>
      </p>
    </dialog>
  )
}
