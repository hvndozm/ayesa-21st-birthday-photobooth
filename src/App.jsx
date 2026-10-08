import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import PhotoboothPage from './pages/PhotoboothPage.jsx'
import DesignSelectionPage from './pages/DesignSelectionPage.jsx'
import CameraPage from './pages/CameraPage.jsx'
import ResultReadyPage from './pages/ResultReadyPage.jsx'
import usePhotoSession from './hooks/usePhotoSession.js'
import MessagesPage from './pages/MessagesPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PrivateLogin from './components/PrivateLogin.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PrivateAccessState from './components/PrivateAccessState.jsx'
import './styles/site.css'
import './styles/photobooth.css'
import './styles/camera.css'
import './styles/result.css'
import './styles/auth.css'
import './styles/birthday-dashboard.css'

const AyesaDashboardLayout = lazy(() => import('./pages/AyesaDashboardLayout.jsx'))
const AyesaOverviewPage = lazy(() => import('./pages/AyesaOverviewPage.jsx'))
const AyesaMessagesPage = lazy(() => import('./pages/AyesaMessagesPage.jsx'))
const AyesaGalleryPage = lazy(() => import('./pages/AyesaGalleryPage.jsx'))
const AdminDashboardLayout = lazy(() => import('./pages/AdminDashboardLayout.jsx'))
const AdminOverviewPage = lazy(() => import('./pages/AdminOverviewPage.jsx'))
const AdminMessagesPage = lazy(() => import('./pages/AdminMessagesPage.jsx'))
const AdminGalleryPage = lazy(() => import('./pages/AdminGalleryPage.jsx'))
const AdminDesignsPage = lazy(() => import('./pages/AdminDesignsPage.jsx'))

const pageTitles = {
  '/': "Ayesa's 21st Birthday Photobooth",
  '/photobooth': "Photobooth · Ayesa's 21st Birthday",
  '/photobooth/designs': "Choose a design · Ayesa's 21st Birthday",
  '/photobooth/camera': "Camera · Ayesa's 21st Birthday",
  '/photobooth/result': "Your four memories · Ayesa's 21st Birthday",
  '/messages': "Birthday wishes · Ayesa's 21st Birthday",
  '/ayesa/login': "Ayesa's private entrance · Ayesa's 21st Birthday",
  '/admin/login': "Admin entrance · Ayesa's 21st Birthday",
  '/ayesa': "Ayesa's little corner · Ayesa's 21st Birthday",
  '/ayesa/messages': "Your birthday letters · Ayesa's 21st Birthday",
  '/ayesa/gallery': "Your birthday memories · Ayesa's 21st Birthday",
  '/admin': "Birthday admin · Ayesa's 21st Birthday",
  '/admin/messages': "Admin messages · Ayesa's 21st Birthday",
  '/admin/gallery': "Admin gallery · Ayesa's 21st Birthday",
  '/admin/designs': "Template designs · Ayesa's 21st Birthday",
}

function RouteEffects() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    const pagePath = pathname.replace(/\/+$/, '') || '/'
    document.title = pageTitles[pagePath] ?? "Page not found · Ayesa's 21st Birthday"
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
  const [photoSession, setPhotoSession] = usePhotoSession()

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
          <Route path="/photobooth/designs" element={<DesignSelectionPage />} />
          <Route path="/photobooth/camera" element={
            <CameraPage photoSession={photoSession} savePhotoSession={setPhotoSession} />
          } />
          <Route path="/photobooth/result" element={
            <ResultReadyPage photoSession={photoSession} clearPhotoSession={() => setPhotoSession(null)} />
          } />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/ayesa/login" element={<PrivateLogin area="ayesa" />} />
          <Route path="/admin/login" element={<PrivateLogin area="admin" />} />
          <Route path="/ayesa" element={<ProtectedRoute role="ayesa">
            <Suspense fallback={<PrivateAccessState loading area="ayesa" />}><AyesaDashboardLayout /></Suspense>
          </ProtectedRoute>}>
            <Route index element={<AyesaOverviewPage />} />
            <Route path="messages" element={<AyesaMessagesPage />} />
            <Route path="gallery" element={<AyesaGalleryPage />} />
          </Route>
          <Route path="/admin" element={<ProtectedRoute role="admin">
            <Suspense fallback={<PrivateAccessState loading area="admin" />}><AdminDashboardLayout /></Suspense>
          </ProtectedRoute>}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="messages" element={<AdminMessagesPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            <Route path="designs" element={<AdminDesignsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
