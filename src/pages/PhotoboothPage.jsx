import Decoration from '../components/Decoration.jsx'
import FeaturePage from '../components/FeaturePage.jsx'
import PhotostripPreview from '../components/PhotostripPreview.jsx'

const formats = [
  { name: 'The classic strip', dimensions: '2 × 6 inches', layout: 'strip',
    description: 'Four little moments, all in a row.' },
  { name: 'The wide keepsake', dimensions: '6 × 4 inches', layout: 'landscape',
    description: 'A landscape frame for happy memories.' },
  { name: 'The portrait print', dimensions: '4 × 6 inches', layout: 'portrait',
    description: 'A portrait frame, full of birthday love.' },
]

export default function PhotoboothPage() {
  return (
    <FeaturePage
      eyebrow="A little pose. A little birthday magic."
      title={<>The booth is getting<br /><em>party-ready.</em></>}
      description="Your next favorite keepsake is on its way. Soon you’ll choose a format, find a cute design, and capture four happy little moments."
      note="The photobooth experience will arrive in a later phase. For now, have a look around the celebration."
      illustration={
        <div className="booth-preview" aria-hidden="true">
          <PhotostripPreview />
          <Decoration type="camera" className="booth-camera" />
          <Decoration type="sparkle" className="booth-sparkle" />
          <span className="handwritten">smiles coming soon ♡</span>
        </div>
      }
      otherLink={{ to: '/messages', label: 'Visit birthday wishes' }}
    >
      <div className="format-preview-section">
        <p className="eyebrow">A peek at what’s coming</p>
        <h2>Three ways to keep a memory.</h2>
        <p className="format-preview-note">
          Format previews · selection will be available later
        </p>
        <ul className="format-previews">
          {formats.map((format) => (
            <li key={format.layout}>
              <div className="format-art" aria-hidden="true">
                <div className={`format-mini format-mini--${format.layout}`}>
                  {[1, 2, 3, 4].map((number) => <span key={number} />)}
                </div>
              </div>
              <div>
                <h3>{format.name}</h3>
                <span className="format-dimensions">{format.dimensions}</span>
                <p>{format.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </FeaturePage>
  )
}
