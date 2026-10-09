import { Link, NavLink, Outlet } from 'react-router-dom'
import Decoration from './Decoration.jsx'
import Icon from './Icon.jsx'
import StudioMotif from './StudioMotif.jsx'

export default function SiteLayout() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="announcement">
        <Decoration type="star" /><span>A little celebration. A lot of love.</span><Icon name="heart" />
      </div>
      <header className="site-header container">
        <Link className="brand" to="/" aria-label="Ayesa's birthday photobooth home">
          <span className="brand-mark"><Decoration type="bow" /></span>
          <span className="brand-wordmark">ayesa’s<span>BIRTHDAY PHOTOBOOTH</span></span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/photobooth">Photobooth</NavLink>
          <NavLink to="/messages"><Icon name="heart" />Birthday wishes</NavLink>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}><Outlet /></main>
      <footer className="site-footer container">
        <div className="footer-studio" aria-hidden="true"><StudioMotif type="seven-stars" /><span>ROOM <strong>707</strong> / WITH LOVE, 21</span></div>
        <p>Made with <Icon name="heart" /> for Eley.</p>
        <span>A happy little keepsake for chapter 21.</span>
        <Link to="/">Back to home <Icon name="arrow" /></Link>
      </footer>
    </div>
  )
}
