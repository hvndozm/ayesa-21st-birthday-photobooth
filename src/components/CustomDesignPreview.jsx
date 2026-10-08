import { framePercentageStyle } from '../utils/frameGeometry.js'
import Icon from './Icon.jsx'

export default function CustomDesignPreview({ format, design, preview, onError }) {
  return <span className={`custom-design-preview custom-design-preview--${format.layout}`}
    style={{ aspectRatio: `${format.canvasWidth} / ${format.canvasHeight}` }} aria-hidden="true">
    {format.frames.map((frame, index) => <span key={index} className="custom-preview-window"
      style={framePercentageStyle(format, frame)}><Icon name="camera" /></span>)}
    {preview?.status === 'ready' ? <img className="custom-template-overlay" src={preview.url} alt=""
      onError={() => onError?.(design.id)} /> : <span className="custom-preview-status">
      {preview?.status === 'unavailable' ? 'Preview unavailable' : 'Loading frame…'}
    </span>}
  </span>
}
