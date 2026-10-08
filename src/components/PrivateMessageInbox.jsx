import { useCallback, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from './Icon.jsx'
import BirthdayLetterDialog from './BirthdayLetterDialog.jsx'
import PrivateDataState from './PrivateDataState.jsx'
import usePrivateCollection from '../hooks/usePrivateCollection.js'
import { getBirthdayMessages } from '../services/privateDashboardService.js'
import { applyReadToPage, formatBirthdayDate } from '../utils/birthdayDashboard.js'

export default function PrivateMessageInbox({ titleId = 'birthday-inbox-title', eyebrow = 'Your birthday inbox',
  title = <>Little letters, <em>lots of love.</em></>, description = 'Take your time. Every word was written for you.' }) {
  const [filter, setFilter] = useState('all')
  const [opened, setOpened] = useState(null)
  const { messages: counts } = useOutletContext()
  const load = useCallback(options => getBirthdayMessages({ ...options, filter }), [filter])
  const letters = usePrivateCollection(load)
  const { updateData: updateLetters } = letters
  const { updateData: updateCounts } = counts
  const onRead = useCallback(id => {
    updateLetters(page => applyReadToPage(page, id, filter))
    updateCounts(value => ({ ...value, unread: Math.max(0, value.unread - 1) }))
    setOpened(previous => previous?.id === id ? { ...previous, is_read: true } : previous)
  }, [updateLetters, updateCounts, filter])

  return <section aria-labelledby={titleId}>
    <header className="birthday-page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
      {counts.data && <p className="birthday-collection-count" aria-live="polite">{counts.data.total.toLocaleString()} total letters · {counts.data.unread.toLocaleString()} unread</p>}
    </header>
    <div className="birthday-filters" role="group" aria-label="Filter birthday letters">
      {['all', 'unread', 'read'].map(value => <button type="button" key={value} aria-pressed={filter === value}
        onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Read'}</button>)}
    </div>
    {letters.status !== 'ready' ? <PrivateDataState status={letters.status} onRetry={letters.retry} />
      : <>
        {!letters.data.items.length ? <PrivateDataState emptyTitle={filter === 'unread' ? 'No unread letters right now ♡'
          : filter === 'read' ? 'Your read letters will live here ♡' : 'No little letters yet ♡'}>
          {filter === 'all' ? 'There’s room here for every lovely birthday wish.' : 'A little space for your birthday love.'}
        </PrivateDataState> : <ul className="birthday-letter-list">
          {letters.data.items.map(message => <li key={message.id}>
            <button type="button" className={`birthday-letter-card${message.is_read ? '' : ' birthday-letter-card--unread'}`}
              onClick={() => setOpened(message)}>
              <span className="birthday-envelope-icon" aria-hidden="true"><Icon name="mail" /></span>
              <span className="birthday-letter-summary">
                <span className="birthday-letter-card-top"><strong>{message.nickname}</strong><span className="birthday-read-badge">{message.is_read ? 'Read' : 'Unread'}</span></span>
                <span className="birthday-letter-preview">{message.message.slice(0, 180)}{message.message.length > 180 ? '…' : ''}</span>
                <time dateTime={message.created_at}>{formatBirthdayDate(message.created_at, true)}</time>
              </span>
              <Icon name="arrow" />
            </button>
          </li>)}
        </ul>}
        {letters.data.hasMore && <div className="birthday-load-more">
          {letters.moreStatus === 'error' && <p role="alert">We couldn’t open the next letters. Please try again.</p>}
          <button type="button" className="button button--secondary" onClick={letters.loadMore} disabled={letters.moreStatus === 'loading'}>
            {letters.moreStatus === 'loading' ? 'Opening more letters…' : letters.moreStatus === 'error' ? 'Retry Load More' : 'Load More Letters'}
          </button>
        </div>}
      </>}
    {opened && <BirthdayLetterDialog key={opened.id} message={opened} onRead={onRead} onClose={() => setOpened(null)} />}
  </section>
}
