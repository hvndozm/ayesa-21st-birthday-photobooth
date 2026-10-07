import ActionLink from './ActionLink.jsx'
import Icon from './Icon.jsx'

export default function SelectionContinue({ summary, hint, to, label }) {
  return (
    <div className="booth-selection-bar">
      <div className="booth-selection-summary">
        <span className="booth-selection-heart" aria-hidden="true"><Icon name="heart" /></span>
        <p role="status" aria-live="polite" aria-atomic="true">
          <strong>{summary}</strong><span id="booth-selection-hint">{hint}</span>
        </p>
      </div>
      {to
        ? <ActionLink to={to} arrow aria-describedby="booth-selection-hint">{label}</ActionLink>
        : <button type="button" className="button button--primary" disabled
            aria-describedby="booth-selection-hint">{label}<Icon name="arrow" /></button>}
    </div>
  )
}
