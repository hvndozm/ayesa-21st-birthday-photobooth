import { useCallback, useEffect, useRef, useState } from 'react'
import BirthdayDialog from './BirthdayDialog.jsx'
import Decoration from './Decoration.jsx'
import { markBirthdayMessageRead } from '../services/privateDashboardService.js'
import { formatBirthdayDate } from '../utils/birthdayDashboard.js'

export default function BirthdayLetterDialog({ message, onRead, onClose }) {
  const [status, setStatus] = useState(message.is_read ? 'read' : 'saving')
  const pending = useRef(null)
  const mounted = useRef(false)
  const markRead = useCallback(async () => {
    if (pending.current || message.is_read || !mounted.current) return
    const controller = new AbortController()
    pending.current = controller
    setStatus('saving')
    try {
      await markBirthdayMessageRead(message.id, { signal: controller.signal })
      if (!controller.signal.aborted) { setStatus('read'); onRead(message.id) }
    } catch {
      if (!controller.signal.aborted) setStatus('error')
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }, [message.id, message.is_read, onRead])
  useEffect(() => {
    mounted.current = true
    queueMicrotask(() => { if (mounted.current) markRead() })
    return () => { mounted.current = false; pending.current?.abort(); pending.current = null }
  }, [markRead])
  return <BirthdayDialog titleId="birthday-letter-title" closeLabel="Close birthday letter" className="birthday-letter-dialog" onClose={onClose}>
    <Decoration type="bow" />
    <p className="eyebrow">A little letter, just for you</p>
    <h2 id="birthday-letter-title">With love, from <em>{message.nickname}</em></h2>
    <time className="birthday-letter-date" dateTime={message.created_at}>{formatBirthdayDate(message.created_at, true)}</time>
    <p className="birthday-letter-salutation handwritten">Dear Ayesa,</p>
    <div className="birthday-letter-body" tabIndex={0} aria-label="Full birthday letter">{message.message}</div>
    <p className="birthday-letter-signoff handwritten">a little love for chapter 21 ♡</p>
    <div className="birthday-read-status" role="status" aria-live="polite">
      {message.is_read || status === 'read' ? 'Read · safely tucked into your letters'
        : status === 'saving' ? 'Unread · saving read status…' : 'Unread · we couldn’t save the read status. Your letter is still here.'}
      {status === 'error' && <button type="button" className="birthday-small-button" onClick={markRead}>Retry read status</button>}
    </div>
  </BirthdayDialog>
}
