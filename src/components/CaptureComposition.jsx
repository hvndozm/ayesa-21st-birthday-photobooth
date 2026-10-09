import { useState } from 'react'
import Decoration from './Decoration.jsx'
import Icon from './Icon.jsx'
import PhotoInspector from './PhotoInspector.jsx'
import { isCustomDesign } from '../data/photoboothDesigns.js'
import { framePercentageStyle } from '../utils/frameGeometry.js'

// Live capture and the result placeholder share the Phase 2 design classes.
// This is a CSS preview, not a final composed image.
export default function CaptureComposition({
  format, design, photos, activeSlot = -1, renderCamera, onRetake, busy = false, countdown = null, flashSlot = -1, flashNumber = 0,
}) {
  const [inspectedSlot, setInspectedSlot] = useState(null)
  const custom = isCustomDesign(design)
  const countingDown = countdown !== null && activeSlot >= 0

  return (
    <figure className="capture-composition-stage" aria-label={`${format.displayName} in the ${design.name} design`}>
      {/* Reserve this row so the countdown never moves or covers the photo frames. */}
      <div className="camera-countdown-area" role="status" aria-live="polite" aria-atomic="true">
        {countingDown ? <div className="camera-countdown">
          <span className="camera-countdown-label" aria-hidden="true">Photo {activeSlot + 1}<strong>Hold your pose</strong></span>
          <span key={countdown} className="camera-countdown-number" aria-hidden="true">{countdown}</span>
          <span className="booth-sr-only">Photo {activeSlot + 1} in {countdown} {countdown === 1 ? 'second' : 'seconds'}.</span>
        </div> : <span className="camera-studio-label" aria-hidden="true">Your birthday studio</span>}
      </div>
      <div className={`booth-print capture-composition booth-print--${format.layout} ${custom ? 'capture-composition--custom' : `booth-print--${design.theme}`}`}
        style={{ aspectRatio: `${format.canvasWidth} / ${format.canvasHeight}` }}>
        <ol className="booth-preview-frames capture-frames" aria-label="Four photo frames">
          {photos.map((photo, index) => {
            const active = index === activeSlot
            return (
              <li key={index} className={`capture-frame${active ? ' is-active' : ''}`}
                style={custom ? framePercentageStyle(format, format.frames[index]) : undefined}
                aria-current={active ? 'step' : undefined}
                aria-label={`Photo ${index + 1}: ${photo ? 'captured' : active ? 'active frame' : 'empty frame'}`}>
                <div className="capture-frame-image">
                  {photo ? (
                    <button type="button" className="capture-photo-button" aria-label={`Inspect Photo ${index + 1}`}
                      disabled={busy} onClick={() => setInspectedSlot(index)}>
                      <img src={photo.url} alt={`Captured photo ${index + 1}`} width={photo.width} height={photo.height} />
                    </button>
                  ) : active && renderCamera ? renderCamera(index) : (
                    <div className="capture-empty-frame" aria-hidden="true"><Icon name="camera" /><span>Photo {index + 1}</span></div>
                  )}
                  {index === flashSlot && flashNumber > 0 && <span key={flashNumber} className="camera-flash-overlay" aria-hidden="true" />}
                </div>
                <span className="capture-slot-label" aria-hidden="true">{String(index + 1).padStart(2, '0')}{active && ' · Active'}</span>
                {photo && onRetake && <button type="button" className="capture-retake-button"
                  aria-label={`Retake Photo ${index + 1}`} disabled={busy} onClick={() => onRetake(index)}>
                  <span><Icon name="redo" /></span>
                </button>}
              </li>
            )
          })}
        </ol>
        {custom ? <img className="custom-template-overlay" src={design.overlayUrl} alt="" aria-hidden="true" /> : <>
          <span className="booth-print-caption">AYESA ♡ 21</span>
          <Decoration type={design.motif} className="booth-print-motif" />
          <Decoration type={design.motif} className="booth-print-motif booth-print-motif--bottom" />
        </>}
      </div>
      <figcaption>{onRetake ? 'Tap a photo to look closer. The little arrow lets you retake it.' : 'Four little moments, framed with birthday love.'}</figcaption>
      {inspectedSlot !== null && photos[inspectedSlot] && <PhotoInspector photo={photos[inspectedSlot]}
        photoNumber={inspectedSlot + 1} onClose={() => setInspectedSlot(null)} />}
    </figure>
  )
}
