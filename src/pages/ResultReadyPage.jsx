import { Navigate, useSearchParams } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import CaptureComposition from '../components/CaptureComposition.jsx'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getPlaceholderDesign } from '../data/placeholderDesigns.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'
import { createCaptureSearch } from '../utils/captureNavigation.js'

export default function ResultReadyPage({ photoSession }) {
  const [searchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const design = getPlaceholderDesign(searchParams.get('design'), format?.id)
  const mockMode = import.meta.env.DEV && searchParams.get('mockCamera') === 'true'
  if (!format) return <Navigate to="/photobooth" replace />
  if (!design) return <Navigate to={`/photobooth/designs${createSelectionSearch(format.id)}`} replace />
  const hasPhotos = photoSession?.formatId === format.id && photoSession?.designId === design.id
    && photoSession?.mockMode === mockMode && photoSession?.photos.length === 4 && photoSession.photos.every(Boolean)
  if (!hasPhotos) return <Navigate
    to={`/photobooth/camera${createCaptureSearch(format.id, design.id, mockMode, 'photos-missing')}`} replace />

  const cameraUrl = `/photobooth/camera${createCaptureSearch(format.id, design.id, mockMode)}`
  return (
    <BoothPageLayout currentStep={4} className="camera-page result-ready-page"
      eyebrow="Four little memories, all yours"
      title={<>Your four memories are <em>ready!</em></>}
      description="Final photostrip generation is coming in Phase 4. For now, your four photos are here to admire."
      backTo={cameraUrl} backLabel="Back / Retake Photos">
      <div className="camera-selection-label"><span>{format.displayName} · {getFormatDimensions(format)}</span><span>{design.name}</span></div>
      {mockMode && <p className="camera-mock-label">Development Mock Camera · generated placeholders only</p>}
      <CaptureComposition format={format} design={design} photos={photoSession.photos} />
      <p className="camera-result-note">These photos are kept only in this tab’s memory. Refreshing or leaving the photobooth clears them.</p>
      <div className="camera-result-actions">
        <ActionLink to={cameraUrl} icon="back">Back / Retake Photos</ActionLink>
        <ActionLink to="/" variant="secondary" icon="heart">Home</ActionLink>
      </div>
    </BoothPageLayout>
  )
}
