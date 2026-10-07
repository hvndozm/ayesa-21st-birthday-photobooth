import Icon from './Icon.jsx'

export default function SelectionCard({
  selectionId, name, dimensions, description, preview, isSelected, onSelect,
  className = '', selectLabel = 'Select',
}) {
  return (
    <button type="button" className={`selection-card ${className} ${isSelected ? 'is-selected' : ''}`}
      aria-pressed={isSelected} aria-label={`${name}, ${dimensions}`}
      aria-describedby={`${selectionId}-description`}
      data-selection-id={selectionId} onClick={onSelect}>
      <span className="booth-preview-stage">{preview}</span>
      <span className="selection-card-content">
        <span className="selection-card-title">{name}</span>
        <span className="selection-card-dimensions">{dimensions}</span>
        <span className="selection-card-description" id={`${selectionId}-description`}>
          {description}
        </span>
        <span className="selection-card-state" aria-hidden="true">
          {isSelected ? <Icon name="check" /> : <span className="selection-circle" />}
          {isSelected ? 'Selected' : selectLabel}
        </span>
      </span>
    </button>
  )
}
