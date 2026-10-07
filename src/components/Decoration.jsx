// These illustrations use CSS shapes only, with no character artwork.
export default function Decoration({ type, className = '' }) {
  return (
    <span className={`decoration decoration--${type} ${className}`} aria-hidden="true">
      {type === 'bow' && <>
        <span className="bow-loop bow-loop--left" />
        <span className="bow-loop bow-loop--right" />
        <span className="bow-tail bow-tail--left" />
        <span className="bow-tail bow-tail--right" />
        <span className="bow-knot" />
      </>}
      {type === 'cake' && <>
        <span className="cake-candle"><span className="cake-flame" /></span>
        <span className="cake-tier">
          <span className="cake-icing" /><span className="cake-sprinkles" />
        </span>
        <span className="cake-plate" />
      </>}
      {type === 'camera' && <>
        <span className="camera-top" />
        <span className="camera-body">
          <span className="camera-lens" /><span className="camera-flash" />
        </span>
      </>}
    </span>
  )
}
