import { getFormatDimensions } from '../data/photoboothFormats.js'
import BoothPreview from './BoothPreview.jsx'
import SelectionCard from './SelectionCard.jsx'

export default function DesignCard({ design, format, isSelected, onSelect }) {
  return (
    <SelectionCard selectionId={design.id} name={design.name}
      dimensions={`${format.displayName} · ${getFormatDimensions(format)}`}
      description={design.description}
      preview={<BoothPreview format={format} design={design} />}
      isSelected={isSelected} onSelect={onSelect}
      className="design-card" selectLabel="Select design" />
  )
}
