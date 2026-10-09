import { NavLink, Outlet } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import LogoutButton from '../components/LogoutButton.jsx'
import Icon from '../components/Icon.jsx'
import StudioMotif from '../components/StudioMotif.jsx'
import StudioSignature from '../components/StudioSignature.jsx'
import useAuth from '../hooks/useAuth.js'
import usePrivateResource from '../hooks/usePrivateResource.js'
import { getBirthdayMessageCounts, getPhotostripCount } from '../services/privateDashboardService.js'
import { getTemplateDesignCounts } from '../services/templateDesignService.js'
import '../styles/admin.css'

function AdminCorner() {
  const messages = usePrivateResource(getBirthdayMessageCounts)
  const gallery = usePrivateResource(getPhotostripCount)
  const designs = usePrivateResource(getTemplateDesignCounts)
  return <div className="birthday-corner admin-corner container">
    <div className="birthday-corner-top">
      <ActionLink to="/" variant="text" icon="back">Back to the celebration</ActionLink>
      <LogoutButton returnTo="/admin/login" />
    </div>
    <div className="admin-studio-masthead" aria-hidden="true"><StudioMotif type="safety-pin" /><span className="admin-studio-caption">Birthday studio <strong>Control room</strong></span><StudioMotif type="room-tag" /></div>
    <nav className="birthday-corner-nav admin-nav" aria-label="Birthday admin navigation">
      <NavLink to="/admin" end><Icon name="heart" />Overview</NavLink>
      <NavLink to="/admin/messages"><Icon name="mail" />Messages</NavLink>
      <NavLink to="/admin/gallery"><Icon name="camera" />Gallery</NavLink>
      <NavLink to="/admin/designs"><Icon name="sparkle" />Designs</NavLink>
    </nav>
    <Outlet context={{ messages, gallery, designs }} />
    <StudioSignature className="private-studio-signature" />
    <p className="private-bottom-note">Looking after a little birthday magic.</p>
  </div>
}

export default function AdminDashboardLayout() {
  const { user } = useAuth()
  return <AdminCorner key={user.id} />
}
