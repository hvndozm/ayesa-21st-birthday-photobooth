import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import GeneratedPhotostripPreview from '../components/GeneratedPhotostripPreview.jsx'
import MissingPhotos from '../components/MissingPhotos.jsx'
import Icon from '../components/Icon.jsx'
import GallerySaveStatus from '../components/GallerySaveStatus.jsx'
import usePhotostripGallerySave from '../hooks/usePhotostripGallerySave.js'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getFilterDisplayName } from '../data/photoboothFilters.js'
import { isCustomDesign } from '../data/photoboothDesigns.js'
import { getSessionDesign, hasFourPhotos } from '../utils/photoSessionSelection.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'
import { createCaptureSearch } from '../utils/captureNavigation.js'
import { isDevelopmentMockCamera } from '../utils/mockCameraMode.js'

function PhotostripResult({ format, design, mockMode, photos, clearPhotoSession, output }) {
  const navigate = useNavigate()
  const { result } = output
  const gallerySave = usePhotostripGallerySave(photos, result, format, design)
  const selectionSearch = createCaptureSearch(format.id, design.id, mockMode)
  const cameraUrl = `/photobooth/camera${selectionSearch}`
  const filterName = getFilterDisplayName(result.filterId)
  const filename = isCustomDesign(design) ? `ayesa-21st-custom-${format.id}-${result.filterId}.png`
    : `ayesa-21st-${design.id}-${result.filterId}.png`
  function takeAnother() { clearPhotoSession(); navigate('/photobooth') }
  return <BoothPageLayout currentStep={5} className="camera-page result-page"
    eyebrow="Four little memories, all yours" title={<>Your memories are <em>ready!</em></>}
    description="A little collection of happy, made to keep." backTo={cameraUrl} backLabel="Retake Photos">
    <div className="camera-selection-label"><span>{format.displayName} · {getFormatDimensions(format)}</span><span>{design.name}</span><span>{filterName} filter</span></div>
    {mockMode && <p className="camera-mock-label">Development Mock Camera · generated placeholders only</p>}
    <div className="result-layout">
      <GeneratedPhotostripPreview output={output} format={format} design={design} filterName={filterName} />
      <div className="result-details">
        <p className="result-ready-note" role="status" aria-live="polite"><Icon name="check" />Your birthday keepsake is ready to save.</p>
        <div className="result-actions">
          <a className="button button--primary result-download" href={result.url} download={filename} target="_blank" rel="noopener">
            <Icon name="download" />Download PNG
          </a>
          <button type="button" className="button button--secondary result-take-another" onClick={takeAnother}><Icon name="camera" />Take Another</button>
          <ActionLink to={cameraUrl} variant="secondary" icon="redo" className="result-retake">Retake Photos</ActionLink>
          <ActionLink to={`/photobooth/filter${selectionSearch}`} variant="text" icon="sparkle">Change Filter</ActionLink>
          <ActionLink to="/" variant="text" icon="heart" className="result-home">Home</ActionLink>
        </div>
        <GallerySaveStatus save={gallerySave} />
        <p className="result-save-hint">On your phone, check your browser’s downloads. If it opens the image, press and hold to save it.</p>
        <p className="result-privacy"><Icon name="heart" />Your gallery copy stays private.</p>
        <p className="result-memory-note">Save your keepsake before refreshing or leaving the photobooth.</p>
        {import.meta.env.DEV && <p className="result-dimensions">{result.width} × {result.height} px</p>}
      </div>
    </div>
  </BoothPageLayout>
}

export default function ResultReadyPage({ photoSession, clearPhotoSession, output }) {
  const [searchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const design = getSessionDesign(photoSession, format?.id, searchParams.get('design'))
  const mockMode = isDevelopmentMockCamera(searchParams)
  if (!format) return <Navigate to="/photobooth" replace />
  if (!design) return <Navigate to={`/photobooth/designs${createSelectionSearch(format.id)}`} replace />
  if (!hasFourPhotos(photoSession, format.id, design.id, mockMode)) return <MissingPhotos format={format} design={design} mockMode={mockMode} currentStep={5} />
  // A typed Result URL or stale browser-forward entry cannot save an unseen
  // output. The confirmed object is the very same PNG shown on Filter.
  if (output.status !== 'ready' || photoSession.confirmedOutput !== output.result) {
    return <Navigate to={`/photobooth/filter${createCaptureSearch(format.id, design.id, mockMode)}`} replace />
  }
  return <PhotostripResult format={format} design={photoSession.design} mockMode={mockMode}
    photos={photoSession.photos} clearPhotoSession={clearPhotoSession} output={output} />
}
