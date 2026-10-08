import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { getProtectedAccess } from '../auth/authAccess.js'
import PrivateAccessState from './PrivateAccessState.jsx'

export default function ProtectedRoute({ role, children }) {
  const auth = useAuth()
  const access = getProtectedAccess(auth, role)
  if (access.kind === 'loading') return <PrivateAccessState loading area={role} />
  if (access.kind === 'redirect') return <Navigate to={access.to} replace />
  if (access.kind === 'denied') return <PrivateAccessState area={role} />
  return children
}
