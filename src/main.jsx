import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import ApplicationErrorBoundary from './components/ApplicationErrorBoundary.jsx'

createRoot(document.getElementById('root'), {
  // React's default caught-error logger may include raw error details. Keep
  // unexpected failures private while the boundary offers visible recovery.
  onCaughtError: () => {},
}).render(
  <StrictMode>
    <BrowserRouter>
      <ApplicationErrorBoundary>
        <AuthProvider><App /></AuthProvider>
      </ApplicationErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
