import Icon from './Icon.jsx'

export default function PrivateDataState({ status, emptyTitle, onRetry, children }) {
  return <div className="birthday-data-state" role={status === 'error' ? 'alert' : 'status'}>
    <span className="birthday-state-icon"><Icon name={status === 'loading' ? 'sparkle' : 'heart'} /></span>
    <h2>{status === 'loading' ? 'Gathering a little birthday love…'
      : status === 'error' ? 'A little pause in the birthday magic.' : emptyTitle}</h2>
    <p>{status === 'error' ? 'We couldn’t open these keepsakes just yet. Please try again.' : children}</p>
    {status === 'error' && <button type="button" className="button button--secondary" onClick={onRetry}>Try Again</button>}
  </div>
}
