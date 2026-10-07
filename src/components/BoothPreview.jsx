import Decoration from './Decoration.jsx'
import Icon from './Icon.jsx'

export default function BoothPreview({ format, design }) {
  return (
    <span className={`booth-print booth-print--${format.layout} ${design ? `booth-print--${design.theme}` : ''}`}
      style={{ aspectRatio: `${format.canvasWidth} / ${format.canvasHeight}` }}
      aria-hidden="true">
      <span className="booth-preview-frames">
        {[1, 2, 3, 4].map((number) => (
          <span className="booth-preview-frame" key={number}>
            <Icon name="camera" />
            <span>0{number}</span>
          </span>
        ))}
      </span>
      <span className="booth-print-caption">AYESA ♡ 21</span>
      {design && <>
        <Decoration type={design.motif} className="booth-print-motif" />
        <Decoration type={design.motif} className="booth-print-motif booth-print-motif--bottom" />
      </>}
    </span>
  )
}
