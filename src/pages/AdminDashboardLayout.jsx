import { NavLink, Outlet } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import LogoutButton from '../components/LogoutButton.jsx'
import Icon from '../components/Icon.jsx'
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
    <nav className="birthday-corner-nav admin-nav" aria-label="Birthday admin navigation">
      <NavLink to="/admin" end><Icon name="heart" />Overview</NavLink>
      <NavLink to="/admin/messages"><Icon name="mail" />Messages</NavLink>
      <NavLink to="/admin/gallery"><Icon name="camera" />Gallery</NavLink>
      <NavLink to="/admin/designs"><Icon name="sparkle" />Designs</NavLink>
    </nav>
    <Outlet context={{ messages, gallery, designs }} />
    <p className="private-bottom-note">Looking after a little birthday magic.</p>
  </div>
}

export default function AdminDashboardLayout() {
  const { user } = useAuth()
  return <AdminCorner key={user.id} />
}
