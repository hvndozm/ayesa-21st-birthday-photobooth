import { Link, useOutletContext } from 'react-router-dom'
import Decoration from '../components/Decoration.jsx'
import Icon from '../components/Icon.jsx'
import StudioMotif from '../components/StudioMotif.jsx'
import useAuth from '../hooks/useAuth.js'

function CountStatus({ resource, children }) {
  if (resource.status === 'loading') return <p className="birthday-count-status" role="status">Gathering your keepsakes…</p>
  if (resource.status === 'error') return <div className="birthday-count-status" role="status">
    <p>Count temporarily unavailable.</p>
    <button className="birthday-small-button" type="button" onClick={resource.retry}>Retry count</button>
  </div>
  return children(resource.data)
}

export default function AyesaOverviewPage() {
  const { profile } = useAuth()
  const { messages, gallery } = useOutletContext()
  return <section aria-labelledby="birthday-overview-title">
    <header className="birthday-page-intro birthday-overview-intro">
      <div className="birthday-welcome-art" aria-hidden="true"><Decoration type="bow" /><StudioMotif type="lotus" /></div>
      <p className="eyebrow">A little birthday love, just for you</p>
      <h1 id="birthday-overview-title">Welcome, <em>{profile.display_name || 'Ayesa'}</em> ♡</h1>
      <p>This little corner is filled with memories made for you.</p>
      <span className="birthday-intro-note handwritten">twenty-one looks lovely on you</span>
    </header>
    <div className="birthday-overview-grid">
      <article className="birthday-overview-card birthday-overview-card--letters">
        <StudioMotif type="safety-pin" className="birthday-card-pin" />
        <div className="birthday-card-art" aria-hidden="true"><Icon name="mail" /><Decoration type="heart" /></div>
        <p className="eyebrow">Sealed with love</p>
        <h2>Birthday Messages</h2>
        <p>Little wishes, lovely words, and letters to keep close.</p>
        <CountStatus resource={messages}>{counts => <div className="birthday-counts">
          <span><strong>{counts.total.toLocaleString()}</strong> total letters</span>
          <span className="birthday-unread-count"><strong>{counts.unread.toLocaleString()}</strong> unread</span>
        </div>}</CountStatus>
        <Link className="button button--primary" to="/ayesa/messages"><Icon name="mail" />Open your letters<Icon name="arrow" /></Link>
      </article>
      <article className="birthday-overview-card birthday-overview-card--gallery">
        <StudioMotif type="seven-stars" className="birthday-card-stars" />
        <div className="birthday-card-art" aria-hidden="true"><Icon name="camera" /><Decoration type="sparkle" /></div>
        <p className="eyebrow">Happy moments, forever</p>
        <h2>Birthday Gallery</h2>
        <p>A little album of smiles from everyone celebrating you.</p>
        <CountStatus resource={gallery}>{counts => <div className="birthday-counts">
          <span><strong>{counts.total.toLocaleString()}</strong> birthday memories</span>
        </div>}</CountStatus>
        <Link className="button button--secondary" to="/ayesa/gallery"><Icon name="camera" />Browse your memories<Icon name="arrow" /></Link>
      </article>
    </div>
  </section>
}
