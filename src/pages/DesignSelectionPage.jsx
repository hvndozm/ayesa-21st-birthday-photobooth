import { Navigate, useSearchParams } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import DesignCard from '../components/DesignCard.jsx'
import SelectionContinue from '../components/SelectionContinue.jsx'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getBuiltInDesigns, resolvePhotoboothDesign } from '../data/photoboothDesigns.js'
import usePublicDesigns from '../hooks/usePublicDesigns.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'

export default function DesignSelectionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const custom = usePublicDesigns(format?.id)
  const selectedDesign = resolvePhotoboothDesign(searchParams.get('design'), format?.id, custom.designs)

  if (!format) return <Navigate to="/photobooth" replace />

  const designs = getBuiltInDesigns(format.id)
  const selectionSearch = createSelectionSearch(format.id, selectedDesign?.id)

  function selectDesign(design) {
    setSearchParams({ format: format.id, design: design.id }, { replace: true })
  }

  return (
    <BoothPageLayout currentStep={2} eyebrow="A little ribbon. A little sparkle."
      title={<>Choose your <em>design.</em></>}
      description="Find a little frame that feels like you. Every design holds the same four happy moments."
      backTo={`/photobooth${selectionSearch}`} backLabel="Back to Formats">
      <div className="booth-format-summary">
        <div><span>Your format</span><strong>{format.displayName}</strong><span>{getFormatDimensions(format)}</span></div>
        <ActionLink to={`/photobooth${selectionSearch}`} variant="text" icon="back">Change format</ActionLink>
      </div>
      <p className="booth-preview-note">A little peek at your finished keepsake</p>
      {searchParams.has('design') && !selectedDesign && custom.status !== 'loading' && (
        <p className="booth-notice" role="status">
          That design isn’t available for this format. Please choose one below.
        </p>
      )}
      <h2 className="design-group-title">Built-in Designs</h2>
      <div className={`booth-design-grid booth-design-grid--${format.layout}`}
        role="group" aria-label="Photostrip designs, select one">
        {designs.map((design) => (
          <DesignCard key={design.id} design={design} format={format}
            isSelected={selectedDesign?.id === design.id}
            onSelect={() => selectDesign(design)} />
        ))}
      </div>
      <h2 className="design-group-title">Custom Designs</h2>
      {custom.status === 'loading' && <p className="custom-catalog-note" role="status">Finding your birthday frames…</p>}
      {custom.status === 'error' && <div className="custom-catalog-note" role="status">
        <p>We couldn’t load the custom frames. Choose a built-in favorite, or try again.</p>
        <button type="button" className="button button--text" onClick={custom.retryCatalog}>Retry custom designs</button>
      </div>}
      {custom.status === 'ready' && !custom.designs.length && <p className="custom-catalog-note">More birthday frames may appear here later ♡</p>}
      {custom.designs.length > 0 && <div className={`booth-design-grid booth-design-grid--${format.layout}`}
        role="group" aria-label="Custom photostrip designs, select one">
        {custom.designs.map(design => <div key={design.id} className="custom-design-card-wrap">
          <DesignCard design={design} format={format} isSelected={selectedDesign?.id === design.id}
            onSelect={() => selectDesign(design)} preview={custom.previews[design.id]} onPreviewError={custom.unavailable} />
          {custom.previews[design.id]?.status === 'unavailable' && <button type="button" className="button button--text"
            onClick={() => custom.retryPreview(design)}>Reload {design.name} preview</button>}
        </div>)}
      </div>}
      <SelectionContinue
        summary={selectedDesign ? `${selectedDesign.name} selected` : 'A little style, all yours'}
        hint={selectedDesign ? `For your ${format.displayName}` : 'Choose one design to continue.'}
        to={selectedDesign ? `/photobooth/camera${selectionSearch}` : null}
        label="Continue to Camera" />
    </BoothPageLayout>
  )
}
