import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import GeneratedPhotostripPreview from '../components/GeneratedPhotostripPreview.jsx'
import MissingPhotos from '../components/MissingPhotos.jsx'
import Icon from '../components/Icon.jsx'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { photoboothFilters, getPhotoboothFilter } from '../data/photoboothFilters.js'
import { getSessionDesign, hasFourPhotos } from '../utils/photoSessionSelection.js'
import { createCaptureSearch } from '../utils/captureNavigation.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'

export default function FilterPage({ photoSession, savePhotoSession, output }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [seenPreview, setSeenPreview] = useState(null)
  const format = getPhotoboothFormat(searchParams.get('format'))
  const design = getSessionDesign(photoSession, format?.id, searchParams.get('design'))
  const mockMode = import.meta.env.DEV && searchParams.get('mockCamera') === 'true'
  if (!format) return <Navigate to="/photobooth" replace />
  if (!design) return <Navigate to={`/photobooth/designs${createSelectionSearch(format.id)}`} replace />
  if (!hasFourPhotos(photoSession, format.id, design.id, mockMode)) return <MissingPhotos format={format} design={design} mockMode={mockMode} />
  const filter = getPhotoboothFilter(photoSession.filterId)
  const selectionSearch = createCaptureSearch(format.id, design.id, mockMode)
  const ready = output.status === 'ready' && seenPreview === output.result
  function selectFilter(filterId) {
    if (filterId === filter.id) return
    savePhotoSession({ ...photoSession, filterId, confirmedOutput: null })
  }
  function continueToResult() {
    if (!ready) return
    savePhotoSession({ ...photoSession, confirmedOutput: output.result })
    navigate(`/photobooth/result${selectionSearch}`)
  }
  return <BoothPageLayout currentStep={4} className="camera-page result-page filter-page"
    eyebrow="A little mood for your memories" title={<>Find your <em>favorite feeling.</em></>}
    description="One lovely look for all four moments. Preview your complete keepsake before you continue."
    backTo={`/photobooth/camera${selectionSearch}`} backLabel="Retake Photos">
    <div className="camera-selection-label"><span>{format.displayName} · {getFormatDimensions(format)}</span><span>{design.name}</span></div>
    {mockMode && <p className="camera-mock-label">Development Mock Camera · generated placeholders only</p>}
    <div className="result-layout filter-layout">
      <GeneratedPhotostripPreview output={output} format={format} design={design} filterName={filter.name} onPreviewLoaded={setSeenPreview} />
      <div className="filter-details">
        <p className="eyebrow">Choose your filter</p>
        <div className="filter-options" role="group" aria-label="Photostrip filter, select one">
          {photoboothFilters.map(option => <button key={option.id} type="button" className="filter-option"
            data-filter-id={option.id} aria-pressed={filter.id === option.id} aria-describedby={`filter-${option.id}-description`}
            onClick={() => selectFilter(option.id)}>
            <span className={`filter-swatch filter-swatch--${option.id}`} aria-hidden="true"><Icon name={filter.id === option.id ? 'check' : 'camera'} /></span>
            <span><strong>{option.name}</strong><span id={`filter-${option.id}-description`}>{option.description}</span></span>
          </button>)}
        </div>
        <p className="filter-current" role="status" aria-live="polite">{filter.name} {output.status === 'generating' ? '· Developing your preview…' : output.status === 'error' ? '· Preview needs another try' : '· Your chosen look'}</p>
        <button type="button" className="button button--primary filter-continue" disabled={!ready} onClick={continueToResult}>
          Continue to Result<Icon name="arrow" />
        </button>
        <p className="filter-hint">Your frame’s colors stay just as they are. Only the photos get your chosen look.</p>
      </div>
    </div>
  </BoothPageLayout>
}
