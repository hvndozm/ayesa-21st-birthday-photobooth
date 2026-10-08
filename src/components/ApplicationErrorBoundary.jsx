import { Component } from 'react'

// Suspense handles loading; this boundary handles a failed route bundle or an
// unexpected render failure. Full navigation starts a fresh, clean app session.
export default class ApplicationErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch() {
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main id="main-content" className="application-error" tabIndex={-1}>
      <p className="eyebrow">A little birthday pause</p>
      <h1>Let’s try that <em>again.</em></h1>
      <p role="alert">We couldn’t open this part of the celebration. Check your connection, then reload the page.</p>
      <div className="application-error-actions">
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>Reload Page</button>
        <a href="/" className="button button--secondary">Return Home</a>
      </div>
      <p className="application-error-note">Refreshing clears photos held in this tab. Your saved gallery copies stay private.</p>
    </main>
  }
}
