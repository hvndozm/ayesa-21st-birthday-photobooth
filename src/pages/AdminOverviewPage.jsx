import { Link, useOutletContext } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

function SummaryCard({ title, icon, to, resource, children }) {
  return <article className="admin-summary-card">
    <span className="private-feature-icon"><Icon name={icon} /></span>
    <h2>{title}</h2>
    <div className="admin-summary-counts" aria-live="polite">
      {resource.status === 'loading' ? <p role="status">Loading counts…</p>
        : resource.status === 'error' ? <><p>Counts temporarily unavailable.</p><button type="button" className="birthday-small-button" onClick={resource.retry}>Retry counts</button></>
          : children(resource.data)}
    </div>
    <Link className="button button--secondary" to={to}>Open {title}<Icon name="arrow" /></Link>
  </article>
}

export default function AdminOverviewPage() {
  const { messages, gallery, designs } = useOutletContext()
  return <section aria-labelledby="admin-overview-title">
    <header className="birthday-page-intro">
      <p className="eyebrow">Ayesa's birthday admin</p>
      <h1 id="admin-overview-title">Admin <em>Dashboard</em></h1>
      <p>A tidy little home for birthday letters, memories, and custom artwork.</p>
    </header>
    <div className="admin-summary-grid">
      <SummaryCard title="Birthday Messages" icon="mail" to="/admin/messages" resource={messages}>{value => <>
        <p><strong>{value.total.toLocaleString()}</strong> total messages</p><p><strong>{value.unread.toLocaleString()}</strong> unread</p>
      </>}</SummaryCard>
      <SummaryCard title="Photostrip Gallery" icon="camera" to="/admin/gallery" resource={gallery}>{value =>
        <p><strong>{value.total.toLocaleString()}</strong> saved memories</p>
      }</SummaryCard>
      <SummaryCard title="Template Designs" icon="sparkle" to="/admin/designs" resource={designs}>{value => <>
        <p><strong>{value.total.toLocaleString()}</strong> total designs</p><p><strong>{value.active.toLocaleString()}</strong> active</p>
      </>}</SummaryCard>
    </div>
    <p className="admin-phase-note">Custom templates are managed here. Guests continue to use the current birthday designs.</p>
  </section>
}
