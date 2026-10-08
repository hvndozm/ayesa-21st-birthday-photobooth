import ActionLink from '../components/ActionLink.jsx'
import Decoration from '../components/Decoration.jsx'
import Icon from '../components/Icon.jsx'
import LogoutButton from '../components/LogoutButton.jsx'
import useAuth from '../hooks/useAuth.js'

const sections = {
  ayesa: [
    { title: 'Birthday Messages', icon: 'mail', description: 'All the little letters written with love. Your private inbox is coming next.' },
    { title: 'Photo Gallery', icon: 'camera', description: 'A home for the happy birthday photostrips. Your private gallery is coming next.' },
  ],
  admin: [
    { title: 'Photostrip Gallery', icon: 'camera', description: 'View and look after the birthday keepsakes in a later phase.' },
    { title: 'Birthday Messages', icon: 'mail', description: 'Private message management will be added in a later phase.' },
    { title: 'Template Designs', icon: 'sparkle', description: 'Upload and organize photostrip designs in a later phase.' },
  ],
}

export default function PrivateDashboardPage({ area }) {
  const { profile } = useAuth()
  const ayesa = area === 'ayesa'
  const name = profile.display_name || (ayesa ? 'Ayesa' : 'birthday admin')
  return (
    <section className={`private-page private-dashboard container private-dashboard--${area}`} aria-labelledby="private-dashboard-title">
      <div className="private-dashboard-top">
        <ActionLink to="/" variant="text" icon="back">Back to the celebration</ActionLink>
        <LogoutButton returnTo={`/${area}/login`} />
      </div>
      <header className="private-dashboard-intro">
        <Decoration type={ayesa ? 'bow' : 'sparkle'} />
        <p className="eyebrow">{ayesa ? 'A little birthday love, just for you' : 'The birthday admin corner'}</p>
        <h1 id="private-dashboard-title">Welcome, <em>{name}</em>{ayesa && ' ♡'}</h1>
        <p>{ayesa ? 'This little corner is just for you. Your birthday letters and happy memories will arrive here in the next phases.'
          : 'The private entrance is ready. The tools for looking after the celebration will arrive in the next phases.'}</p>
      </header>
      <div className="private-placeholder-grid">
        {sections[area].map(section => (
          <article className="private-feature-card" key={section.title}>
            <span className="private-feature-icon"><Icon name={section.icon} /></span>
            <span className="private-coming">Coming next</span>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </div>
      <p className="private-bottom-note">A little celebration. A lot of love.</p>
    </section>
  )
}
