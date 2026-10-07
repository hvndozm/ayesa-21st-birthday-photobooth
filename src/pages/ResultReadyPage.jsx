import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import Icon from '../components/Icon.jsx'
import useGeneratedPhotostrip from '../hooks/useGeneratedPhotostrip.js'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getPlaceholderDesign } from '../data/placeholderDesigns.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'
import { createCaptureSearch } from '../utils/captureNavigation.js'

function MissingPhotos({ format, design }) {
  const boothUrl = `/photobooth${createSelectionSearch(format.id, design.id)}`
  return (
    <BoothPageLayout currentStep={4} className="camera-page result-page"
      eyebrow="A fresh little moment awaits"
      title={<>Let’s make another <em>memory.</em></>}
      description="Your photos live only in this tab. Refreshing starts a fresh session."
      backTo={boothUrl} backLabel="Return to Photobooth">
      <div className="result-state result-recovery" role="status">
        <span className="result-state-art" aria-hidden="true"><Icon name="camera" /></span>
        <h2>We don’t have your four photos anymore.</h2>
        <p>Choose your format and design, then take four new photos. Your last choices are still selected.</p>
        <ActionLink to={boothUrl} icon="camera" className="result-recovery-link">Return to Photobooth</ActionLink>
        <ActionLink to="/" variant="text" icon="heart">Home</ActionLink>
      </div>
    </BoothPageLayout>
  )
}

function PhotostripResult({ format, design, mockMode, photos, clearPhotoSession }) {
  const navigate = useNavigate()
  const { status, result, retry } = useGeneratedPhotostrip(format, design, photos)
  const cameraUrl = `/photobooth/camera${createCaptureSearch(format.id, design.id, mockMode)}`

  function takeAnother() {
    clearPhotoSession()
    navigate('/photobooth')
  }

  return (
    <BoothPageLayout currentStep={4} className="camera-page result-page"
      eyebrow="Four little memories, all yours"
      title={status === 'ready' ? <>Your memories are <em>ready!</em></>
        : status === 'error' ? <>A little more <em>birthday magic.</em></>
          : <>Developing your <em>memories.</em></>}
      description="A little collection of happy, made to keep."
      backTo={cameraUrl} backLabel="Retake Photos">
      <div className="camera-selection-label"><span>{format.displayName} · {getFormatDimensions(format)}</span><span>{design.name}</span></div>
      {mockMode && <p className="camera-mock-label">Development Mock Camera · generated placeholders only</p>}
      <div className="result-layout">
        <div className={`result-print-panel result-print-panel--${format.layout}`} aria-busy={status === 'generating'}>
          {status === 'generating' && <div className="result-state result-loading" role="status" aria-live="polite">
            <span className="result-state-art" aria-hidden="true"><Icon name="camera" /></span>
            <h2>Developing your memories…</h2>
            <p>A little ribbon, four little moments. Almost ready.</p>
            <span className="result-loading-dots" aria-hidden="true"><span /><span /><span /></span>
          </div>}
          {status === 'error' && <div className="result-state result-error" role="alert">
            <span className="result-state-art" aria-hidden="true"><Icon name="heart" /></span>
            <h2>Your photostrip needs another try.</h2>
            <p>We couldn’t put the image together. Your four photos are still here. Try again, or return to the camera.</p>
            <button type="button" className="button button--primary result-retry" onClick={retry}><Icon name="redo" />Retry</button>
          </div>}
          {status === 'ready' && <figure className={`result-preview result-preview--${format.layout}`}>
            <img className="result-image" src={result.url} width={result.width} height={result.height}
              alt={`Your four birthday photos in the ${design.name} ${format.displayName.toLowerCase()} photostrip`} />
            <figcaption>four little moments, forever memories ♡</figcaption>
          </figure>}
        </div>
        <div className="result-details">
          <p className="result-ready-note" role="status" aria-live="polite">
            <Icon name={status === 'ready' ? 'check' : 'heart'} />
            {status === 'ready' ? 'Your birthday keepsake is ready to save.' : status === 'error' ? 'Your photos are safe in this tab.' : 'Making a little something to treasure.'}
          </p>
          <div className="result-actions">
            {status === 'ready' && <a className="button button--primary result-download"
              href={result.url} download={`ayesa-21st-${design.id}.png`} target="_blank" rel="noopener">
              <Icon name="download" />Download PNG
            </a>}
            <button type="button" className="button button--secondary result-take-another" onClick={takeAnother}><Icon name="camera" />Take Another</button>
            <ActionLink to={cameraUrl} variant="secondary" icon="redo" className="result-retake">Retake Photos</ActionLink>
            <ActionLink to="/" variant="text" icon="heart" className="result-home">Home</ActionLink>
          </div>
          {status === 'ready' && <p className="result-save-hint">On your phone, check your browser’s downloads. If it opens the image, press and hold to save it.</p>}
          <p className="result-privacy"><Icon name="heart" />Just for you. Nothing is uploaded.</p>
          <p className="result-memory-note">Save your keepsake before refreshing or leaving the photobooth.</p>
          {import.meta.env.DEV && status === 'ready' && <p className="result-dimensions">{result.width} × {result.height} px</p>}
        </div>
      </div>
    </BoothPageLayout>
  )
}

export default function ResultReadyPage({ photoSession, clearPhotoSession }) {
  const [searchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const design = getPlaceholderDesign(searchParams.get('design'), format?.id)
  const mockMode = import.meta.env.DEV && searchParams.get('mockCamera') === 'true'
  if (!format) return <Navigate to="/photobooth" replace />
  if (!design) return <Navigate to={`/photobooth/designs${createSelectionSearch(format.id)}`} replace />

  const hasPhotos = photoSession?.formatId === format.id && photoSession?.designId === design.id
    && photoSession?.mockMode === mockMode && Array.isArray(photoSession.photos) && photoSession.photos.length === 4
    && photoSession.photos.every((photo) => photo && (photo.blob instanceof Blob || photo.url))
  if (!hasPhotos) return <MissingPhotos format={format} design={design} />

  return <PhotostripResult key={`${format.id}:${design.id}:${mockMode}`}
    format={format} design={design} mockMode={mockMode} photos={photoSession.photos} clearPhotoSession={clearPhotoSession} />
}
