import { useEffect, useRef, useState } from 'react'
import ActionLink from '../components/ActionLink.jsx'
import Decoration from '../components/Decoration.jsx'
import Icon from '../components/Icon.jsx'
import useBirthdayMessage from '../hooks/useBirthdayMessage.js'
import { validateBirthdayMessage, NICKNAME_MAX_LENGTH, MESSAGE_MAX_LENGTH } from '../utils/birthdayMessageValidation.js'
import '../styles/messages.css'

function LetterIllustration() {
  return (
    <div className="message-illustration" aria-hidden="true">
      <div className="letter-preview">
        <div className="letter-paper">
          <span className="handwritten">Dear Ayesa,</span>
          <span className="letter-line" /><span className="letter-line" />
          <span className="letter-line letter-line--short" />
          <Decoration type="heart" />
        </div>
        <div className="letter-envelope"><Decoration type="heart" /></div>
        <Decoration type="sparkle" className="letter-sparkle" />
        <span className="letter-caption handwritten">sealed with a little love ♡</span>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const [nickname, setNickname] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const nicknameInput = useRef(null)
  const messageInput = useRef(null)
  const successHeading = useRef(null)
  const sending = useBirthdayMessage()
  const busy = sending.status === 'sending'
  const failed = sending.status === 'error' || sending.status === 'unavailable'

  useEffect(() => {
    if (sending.status === 'success') successHeading.current?.focus({ preventScroll: true })
  }, [sending.status])

  function handleSubmit(event) {
    event.preventDefault()
    if (busy || sending.status === 'success') return
    const validation = validateBirthdayMessage({ nickname, message })
    setErrors(validation.errors)
    if (Object.keys(validation.errors).length) {
      (validation.errors.nickname ? nicknameInput : messageInput).current?.focus()
      return
    }
    sending.submit(validation.values)
  }

  function sendAnother() {
    sending.reset()
    setNickname('')
    setMessage('')
    setErrors({})
    requestAnimationFrame(() => nicknameInput.current?.focus())
  }

  return (
    <section className="messages-page container" aria-labelledby="messages-title">
      <ActionLink to="/" variant="text" icon="back" className="message-back">Back to the celebration</ActionLink>
      <div className="messages-layout">
        <header className="message-intro">
          <span className="birthday-tag"><Icon name="mail" />A birthday wish, just for her</span>
          <h1 id="messages-title">Leave a little love<br /><em>for Ayesa.</em><span className="heading-dot"> ♡</span></h1>
          <p>A sweet birthday wish. A memory that still makes you smile. All the lovely things you’ve been meaning to say.</p>
          <LetterIllustration />
        </header>

        <div className={`message-card${sending.status === 'success' ? ' message-card--success' : ''}`}>
          {sending.status === 'success' ? (
            <div className="message-success" role="status" aria-live="polite">
              <div className="message-success-art" aria-hidden="true">
                <Icon name="mail" />
                <Decoration type="heart" className="message-heart message-heart--one" />
                <Decoration type="heart" className="message-heart message-heart--two" />
                <Decoration type="sparkle" className="message-heart message-heart--three" />
              </div>
              <p className="eyebrow">A little love, delivered</p>
              <h2 ref={successHeading} tabIndex={-1}>Your message is on its way to Ayesa ♡</h2>
              <p>Thank you for leaving a little birthday love.</p>
              <div className="message-success-actions">
                <ActionLink to="/" icon="heart">Back Home</ActionLink>
                <button type="button" className="button button--secondary message-another" onClick={sendAnother}>Send Another Message</button>
              </div>
            </div>
          ) : (
            <form className="message-form" onSubmit={handleSubmit} noValidate aria-busy={busy}>
              <div className="message-card-heading">
                <div><p className="eyebrow">For her twenty-first chapter</p><h2>A note from you</h2></div>
                <Decoration type="bow" />
              </div>
              <div className="message-field">
                <label htmlFor="message-nickname">Nickname</label>
                <p id="nickname-hint" className="message-field-hint">What should Ayesa call you?</p>
                <input ref={nicknameInput} id="message-nickname" name="nickname" type="text"
                  required maxLength={NICKNAME_MAX_LENGTH} autoComplete="nickname" value={nickname} disabled={busy}
                  aria-invalid={!!errors.nickname} aria-describedby={`nickname-hint${errors.nickname ? ' nickname-error' : ''}`}
                  onChange={(event) => { setNickname(event.target.value); setErrors((previous) => ({ ...previous, nickname: undefined })) }} />
                {errors.nickname && <p id="nickname-error" className="message-field-error">{errors.nickname}</p>}
              </div>
              <div className="message-field">
                <label htmlFor="birthday-message">Birthday Message</label>
                <p id="message-hint" className="message-field-hint">A little wish or a whole letter. Make it yours.</p>
                <textarea ref={messageInput} id="birthday-message" name="message" rows={9}
                  required maxLength={MESSAGE_MAX_LENGTH} value={message} disabled={busy}
                  aria-invalid={!!errors.message} aria-describedby={`message-hint message-counter${errors.message ? ' message-error' : ''}`}
                  onChange={(event) => { setMessage(event.target.value); setErrors((previous) => ({ ...previous, message: undefined })) }} />
                <p id="message-counter" className="message-counter">{message.length.toLocaleString()} / 2,000<span className="message-counter-label"> characters</span></p>
                {errors.message && <p id="message-error" className="message-field-error">{errors.message}</p>}
              </div>
              {Object.values(errors).some(Boolean) && <p className="message-validation-summary" role="alert">Please check your nickname and birthday message.</p>}
              {failed && (
                <div className="message-send-error" role="alert">
                  <p>{sending.status === 'unavailable' ? 'Messages are temporarily unavailable.'
                    : sending.uncertain ? 'We couldn’t confirm your message was sent.' : 'We couldn’t send your message just yet.'}</p>
                  <p>{sending.uncertain ? 'Your message may already have arrived. Trying again could send it twice.'
                    : 'Your words are still here. Give it another try when you’re ready.'}</p>
                </div>
              )}
              <p className="message-privacy"><Icon name="heart" />Your message will be kept private for Ayesa.</p>
              <button className="button button--primary message-submit" type="submit" disabled={busy}>
                <Icon name={failed ? 'redo' : 'mail'} />{busy ? 'Sending your message…' : failed ? 'Try Again' : 'Send to Ayesa'}
              </button>
              <p className="message-sending-status" role="status" aria-live="polite">{busy ? 'Sending your message. A little love is on its way…' : ''}</p>
            </form>
          )}
        </div>
      </div>
      <p className="message-bottom-note">A few words. A whole lot of love.</p>
    </section>
  )
}
