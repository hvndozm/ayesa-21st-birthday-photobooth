import { NavLink, Outlet } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import LogoutButton from '../components/LogoutButton.jsx'
import Icon from '../components/Icon.jsx'
import StudioMotif from '../components/StudioMotif.jsx'
import StudioSignature from '../components/StudioSignature.jsx'
import useAuth from '../hooks/useAuth.js'
import usePrivateResource from '../hooks/usePrivateResource.js'
import { getBirthdayMessageCounts, getPhotostripCount } from '../services/privateDashboardService.js'

function BirthdayCorner() {
  const messages = usePrivateResource(getBirthdayMessageCounts)
  const gallery = usePrivateResource(getPhotostripCount)
  return <div className="birthday-corner birthday-corner--ayesa container">
    <div className="birthday-corner-top">
      <ActionLink to="/" variant="text" icon="back">Back to the celebration</ActionLink>
      <LogoutButton returnTo="/ayesa/login" />
    </div>
    <div className="private-studio-masthead" aria-hidden="true">
      <div className="private-studio-label"><span>Your private</span><strong>Memory room.</strong><StudioMotif type="seven-stars" /></div>
      <div className="private-studio-accessories"><StudioMotif type="room-tag" /><StudioMotif type="glasses" /></div>
    </div>
    <nav className="birthday-corner-nav" aria-label="Your birthday corner">
      <NavLink to="/ayesa" end><Icon name="heart" />Overview</NavLink>
      <NavLink to="/ayesa/messages"><Icon name="mail" />Letters</NavLink>
      <NavLink to="/ayesa/gallery"><Icon name="camera" />Gallery</NavLink>
    </nav>
    <Outlet context={{ messages, gallery }} />
    <StudioSignature className="private-studio-signature" />
    <p className="private-bottom-note">For your twenty-first chapter, with love ♡</p>
  </div>
}

export default function AyesaDashboardLayout() {
  const { user } = useAuth()
  // An identity change remounts the entire private corner and discards its data.
  return <BirthdayCorner key={user.id} />
}
