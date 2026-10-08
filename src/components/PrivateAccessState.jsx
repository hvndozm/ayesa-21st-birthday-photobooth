import ActionLink from './ActionLink.jsx'
import Decoration from './Decoration.jsx'
import LogoutButton from './LogoutButton.jsx'
import useAuth from '../hooks/useAuth.js'
import { isPermanentSession } from '../auth/authAccess.js'

export default function PrivateAccessState({ loading = false, area = 'ayesa' }) {
  const auth = useAuth()
  const permanent = isPermanentSession(auth.session)
  return (
    <section className="private-page container">
      <div className="private-state private-card" role="status" aria-live="polite" aria-busy={loading}>
        <Decoration type={area === 'ayesa' ? 'bow' : 'sparkle'} />
        <p className="eyebrow">A private little corner</p>
        <h1>{loading ? 'Opening your little corner…' : permanent ? 'This corner needs an invitation.' : 'Private sign-in is unavailable.'}</h1>
        <p>{loading ? 'Just a moment while we get things ready.'
          : permanent ? 'We couldn’t confirm access to this private space. Please try again or check with the birthday admin.'
          : 'Please try again in a little while. The birthday celebration is still open.'}</p>
        <div className="private-state-actions">
          {!loading && <button type="button" className="button button--primary private-retry" onClick={() => { void auth.retry() }}>Try Again</button>}
          <ActionLink to="/" variant={loading ? 'text' : 'secondary'} icon="heart">Back Home</ActionLink>
          {!loading && permanent && <LogoutButton returnTo={`/${area}/login`} />}
        </div>
      </div>
    </section>
  )
}
