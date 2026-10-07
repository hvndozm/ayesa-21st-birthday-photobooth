import { Navigate, useSearchParams } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import DesignCard from '../components/DesignCard.jsx'
import SelectionContinue from '../components/SelectionContinue.jsx'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getDesignsForFormat, getPlaceholderDesign } from '../data/placeholderDesigns.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'

export default function DesignSelectionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const selectedDesign = getPlaceholderDesign(searchParams.get('design'), format?.id)

  if (!format) return <Navigate to="/photobooth" replace />

  const designs = getDesignsForFormat(format.id)
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
      <p className="booth-preview-note">Mock design previews · a little peek at the possibilities</p>
      {searchParams.has('design') && !selectedDesign && (
        <p className="booth-notice" role="status">
          That design isn’t available for this format. Please choose one below.
        </p>
      )}
      <div className={`booth-design-grid booth-design-grid--${format.layout}`}
        role="group" aria-label="Photostrip designs, select one">
        {designs.map((design) => (
          <DesignCard key={design.id} design={design} format={format}
            isSelected={selectedDesign?.id === design.id}
            onSelect={() => selectDesign(design)} />
        ))}
      </div>
      <SelectionContinue
        summary={selectedDesign ? `${selectedDesign.name} selected` : 'A little style, all yours'}
        hint={selectedDesign ? `For your ${format.displayName}` : 'Choose one mock design to continue.'}
        to={selectedDesign ? `/photobooth/camera${selectionSearch}` : null}
        label="Continue to Camera" />
    </BoothPageLayout>
  )
}
