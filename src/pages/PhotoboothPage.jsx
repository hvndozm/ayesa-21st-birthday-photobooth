import { useSearchParams } from 'react-router-dom'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import BoothPreview from '../components/BoothPreview.jsx'
import SelectionCard from '../components/SelectionCard.jsx'
import SelectionContinue from '../components/SelectionContinue.jsx'
import { photoboothFormats, getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getPlaceholderDesign } from '../data/placeholderDesigns.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'

export default function PhotoboothPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedFormat = getPhotoboothFormat(searchParams.get('format'))
  const selectedDesign = getPlaceholderDesign(searchParams.get('design'), selectedFormat?.id)

  function selectFormat(format) {
    // Keep a compatible design when revisiting; changing format clears it.
    const compatibleDesign = getPlaceholderDesign(searchParams.get('design'), format.id)
    setSearchParams({
      format: format.id,
      ...(compatibleDesign ? { design: compatibleDesign.id } : {}),
    }, { replace: true })
  }

  return (
    <BoothPageLayout currentStep={1} eyebrow="Four photos. One happy little keepsake."
      title={<>Choose your photobooth <em>format.</em></>}
      description="Tall and sweet, or a lovely little grid? Choose how you’d like your four birthday photos arranged.">
      {searchParams.has('format') && !selectedFormat && (
        <p className="booth-notice" role="status">
          That format isn’t available. Choose one of the three below.
        </p>
      )}
      <div className="booth-format-grid" role="group" aria-label="Photobooth formats, select one">
        {photoboothFormats.map((format) => (
          <SelectionCard key={format.id} selectionId={format.id}
            name={format.displayName} dimensions={getFormatDimensions(format)}
            description={format.description}
            preview={<BoothPreview format={format} />}
            isSelected={selectedFormat?.id === format.id}
            onSelect={() => selectFormat(format)}
            className="format-card" selectLabel="Select format" />
        ))}
      </div>
      <SelectionContinue
        summary={selectedFormat ? `${selectedFormat.displayName} selected` : 'Start with your favorite shape'}
        hint={selectedFormat ? getFormatDimensions(selectedFormat) : 'Choose one format to continue.'}
        to={selectedFormat
          ? `/photobooth/designs${createSelectionSearch(selectedFormat.id, selectedDesign?.id)}`
          : null}
        label="Choose a Design" />
      <p className="booth-bottom-note">A little pose. A little birthday magic. All for Ayesa.</p>
    </BoothPageLayout>
  )
}
