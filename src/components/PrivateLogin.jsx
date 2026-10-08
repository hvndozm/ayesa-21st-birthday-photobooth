import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import ActionLink from './ActionLink.jsx'
import Decoration from './Decoration.jsx'
import Icon from './Icon.jsx'
import PrivateAccessState from './PrivateAccessState.jsx'
import useAuth from '../hooks/useAuth.js'
import { getPrivateArea, isPermanentSession, normalizeOwnProfile } from '../auth/authAccess.js'

export default function PrivateLogin({ area }) {
  const auth = useAuth()
  const emailInput = useRef(null)
  const passwordInput = useRef(null)
  const inFlight = useRef(false)
  const mounted = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalidField, setInvalidField] = useState(null)
  const ayesa = area === 'ayesa'
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const capturePasswordInput = useCallback((element) => {
    if (!element && passwordInput.current) passwordInput.current.value = ''
    passwordInput.current = element
  }, [])

  if (auth.status === 'initializing' || auth.status === 'loading-profile') return <PrivateAccessState loading area={area} />
  if (auth.status === 'unavailable' || auth.status === 'error') return <PrivateAccessState area={area} />
  if (isPermanentSession(auth.session)) {
    const profile = normalizeOwnProfile(auth.profile, auth.user.id)
    const destination = !auth.error && getPrivateArea(profile?.role)
    return destination ? <Navigate to={destination} replace /> : <PrivateAccessState area={area} />
  }

  async function login(event) {
    event.preventDefault()
    if (inFlight.current) return
    const emailElement = emailInput.current
    const passwordElement = passwordInput.current
    if (!emailElement.value.trim() || !emailElement.validity.valid) {
      setInvalidField('email'); setError('Please enter a valid email address.'); emailElement.focus(); return
    }
    if (!passwordElement.value.length) {
      setInvalidField('password'); setError('Please enter your password.'); passwordElement.focus(); return
    }
    inFlight.current = true
    setBusy(true)
    setError('')
    setInvalidField(null)
    try {
      await auth.signIn({ email: emailElement.value.trim(), password: passwordElement.value })
    } catch (failure) {
      if (mounted.current) setError(failure?.code === 'invalid-credentials' ? 'Invalid email or password.' : 'We couldn’t sign you in just yet. Please try again.')
    } finally {
      // Passwords stay in the input/request only, never React state or storage.
      passwordElement.value = ''
      inFlight.current = false
      if (mounted.current) { setBusy(false); setShowPassword(false) }
    }
  }

  return (
    <section className={`private-page private-login-page container private-login-page--${area}`} aria-labelledby="private-login-title">
      <ActionLink to="/" variant="text" icon="back" className="private-back">Back to the celebration</ActionLink>
      <header className="private-intro">
        <Decoration type={ayesa ? 'bow' : 'sparkle'} />
        <p className="eyebrow">{ayesa ? 'For the birthday girl' : 'Behind the birthday magic'}</p>
        <h1 id="private-login-title">{ayesa ? <>A little corner,<br /><em>just for Ayesa.</em></> : <>The birthday<br /><em>admin corner.</em></>}</h1>
        <p>{ayesa ? 'Your birthday memories will have a home here. Sign in to your private space.' : 'A quiet place to look after the celebration. Sign in to continue.'}</p>
      </header>
      <form className="private-card private-login-form" onSubmit={login} noValidate aria-busy={busy}>
        <h2>{ayesa ? 'Welcome back ♡' : 'Welcome back'}</h2>
        <div className="private-field">
          <label htmlFor="private-email">Email</label>
          <input ref={emailInput} id="private-email" name="email" type="email" autoComplete="username" required disabled={busy}
            aria-invalid={invalidField === 'email'} aria-describedby={error ? 'private-login-error' : undefined} />
        </div>
        <div className="private-field">
          <label htmlFor="private-password">Password</label>
          <div className="private-password-wrap">
            <input ref={capturePasswordInput} id="private-password" name="password" type={showPassword ? 'text' : 'password'}
              autoComplete="current-password" required disabled={busy} aria-invalid={invalidField === 'password'}
              aria-describedby={error ? 'private-login-error' : undefined} />
            <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-controls="private-password" aria-pressed={showPassword} disabled={busy} onClick={() => setShowPassword(value => !value)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error && <p id="private-login-error" className="private-error" role="alert">{error}</p>}
        <button type="submit" className="button button--primary private-login-submit" disabled={busy}>
          <Icon name="heart" />{busy ? 'Signing in…' : 'Login'}
        </button>
        <p className="private-login-status" role="status" aria-live="polite">{busy ? 'Opening your private space…' : ''}</p>
      </form>
    </section>
  )
}
