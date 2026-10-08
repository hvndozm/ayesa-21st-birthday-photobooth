import { getFormatDimensions } from '../data/photoboothFormats.js'
import BoothPreview from './BoothPreview.jsx'
import SelectionCard from './SelectionCard.jsx'
import CustomDesignPreview from './CustomDesignPreview.jsx'
import { isCustomDesign } from '../data/photoboothDesigns.js'

export default function DesignCard({ design, format, isSelected, onSelect, preview, onPreviewError }) {
  return (
    <SelectionCard selectionId={design.id} name={design.name}
      dimensions={`${format.displayName} · ${getFormatDimensions(format)}`}
      description={design.description}
      preview={isCustomDesign(design)
        ? <CustomDesignPreview format={format} design={design} preview={preview} onError={onPreviewError} />
        : <BoothPreview format={format} design={design} />}
      isSelected={isSelected} onSelect={onSelect}
      className="design-card" selectLabel="Select design" />
  )
}
