import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

export default function LogoutButton({ returnTo }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const inFlight = useRef(false)
  const mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  async function logout() {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(false)
    try {
      await auth.logout()
      navigate(returnTo, { replace: true })
    } catch {
      if (mounted.current) setError(true)
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <div className="private-logout">
      <button type="button" className="button button--secondary logout-button" disabled={busy} onClick={logout}>
        {busy ? 'Logging out…' : 'Logout'}
      </button>
      {error && <p className="private-error" role="alert">We couldn’t finish logging out. Please try again.</p>}
    </div>
  )
}
