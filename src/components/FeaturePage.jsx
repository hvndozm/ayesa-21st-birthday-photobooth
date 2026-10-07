import ActionLink from './ActionLink.jsx'
import Icon from './Icon.jsx'

export default function FeaturePage({
  eyebrow, title, description, note, illustration, children, otherLink,
}) {
  return (
    <section className="feature-page container">
      <ActionLink to="/" variant="text" icon="back" className="back-link">
        Back to the celebration
      </ActionLink>
      <div className="feature-intro">
        <div className="feature-illustration">{illustration}</div>
        <div className="feature-copy">
          <span className="coming-soon"><Icon name="sparkle" />Coming soon</span>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="feature-description">{description}</p>
          <p className="feature-note">{note}</p>
          <div className="feature-actions">
            <ActionLink to="/" icon="heart">Explore the homepage</ActionLink>
            <ActionLink to={otherLink.to} variant="text" arrow>{otherLink.label}</ActionLink>
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}
