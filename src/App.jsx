import { useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import PhotoboothPage from './pages/PhotoboothPage.jsx'
import MessagesPage from './pages/MessagesPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import './styles/site.css'

const pageTitles = {
  '/': "Ayesa's 21st Birthday Photobooth",
  '/photobooth': "Photobooth · Ayesa's 21st Birthday",
  '/messages': "Birthday wishes · Ayesa's 21st Birthday",
}

function RouteEffects() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    document.title = pageTitles[pathname] ?? "Page not found · Ayesa's 21st Birthday"
    if (previousPath.current !== pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      document.getElementById('main-content')?.focus({ preventScroll: true })
      previousPath.current = pathname
    }
  }, [pathname])

  return null
}

export default function App() {
  // A refresh starts a new welcome experience; navigating home does not.
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  return (
    <>
      <RouteEffects />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={
            <HomePage
              showWelcome={!welcomeDismissed}
              onDismissWelcome={() => setWelcomeDismissed(true)}
            />
          } />
          <Route path="/photobooth" element={<PhotoboothPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
