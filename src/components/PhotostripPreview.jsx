import Decoration from './Decoration.jsx'

export default function PhotostripPreview({ className = '' }) {
  return (
    <div className={`photostrip ${className}`} aria-hidden="true">
      <div className="photostrip-frame photostrip-frame--pink"><Decoration type="heart" /></div>
      <div className="photostrip-frame photostrip-frame--lavender"><Decoration type="sparkle" /></div>
      <div className="photostrip-frame photostrip-frame--cream"><Decoration type="cloud" /></div>
      <div className="photostrip-frame photostrip-frame--pink"><Decoration type="bow" /></div>
      <div className="photostrip-caption">AYESA <span>♡</span> 21</div>
    </div>
  )
}
