import Decoration from './Decoration.jsx'

export default function PhotoPlaceholder({ label, theme = 'pink', motif = 'heart' }) {
  return (
    <div className={`photo-placeholder photo-placeholder--${theme}`}
      role="img" aria-label={label}>
      <div className="placeholder-content" aria-hidden="true">
        <Decoration type={motif} />
        <span>A little memory<br />goes here</span>
        <small>Birthday photo coming soon</small>
      </div>
    </div>
  )
}
