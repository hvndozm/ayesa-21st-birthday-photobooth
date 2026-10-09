import Decoration from './Decoration.jsx'

const frameDecorations = [
  { theme: 'pink', motif: 'heart' },
  { theme: 'lavender', motif: 'sparkle' },
  { theme: 'cream', motif: 'cloud' },
  { theme: 'pink', motif: 'bow' },
]

export default function PhotostripPreview({ className = '', photos = [] }) {
  return (
    <div className={`photostrip ${className}`} aria-hidden={photos.length ? undefined : true}>
      {frameDecorations.map(({ theme, motif }, index) => (
        <div className={`photostrip-frame photostrip-frame--${theme}`} key={motif}>
          {photos[index]
            ? <img src={photos[index]} alt={`Ayesa, birthday memory ${index + 1}`} decoding="async" />
            : <Decoration type={motif} />}
        </div>
      ))}
      <div className="photostrip-caption">AYESA <span>♡</span> 21</div>
    </div>
  )
}
