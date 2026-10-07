import Decoration from '../components/Decoration.jsx'
import FeaturePage from '../components/FeaturePage.jsx'

export default function MessagesPage() {
  return (
    <FeaturePage
      eyebrow="For the things only a little letter can say"
      title={<>A little love,<br /><em>just for Ayesa.</em></>}
      description="A sweet birthday wish. That one memory that still makes you smile. A little reminder of how loved she is. There’ll be a place for all of it here."
      note="Birthday message submission is coming in a later phase. Once available, your note will be visible only to Ayesa and the admin."
      illustration={
        <div className="letter-preview" aria-hidden="true">
          <div className="letter-paper">
            <span className="handwritten">Dear Ayesa,</span>
            <span className="letter-line" />
            <span className="letter-line" />
            <span className="letter-line letter-line--short" />
            <Decoration type="heart" />
          </div>
          <div className="letter-envelope"><Decoration type="heart" /></div>
          <Decoration type="sparkle" className="letter-sparkle" />
          <span className="letter-caption handwritten">sealed with a little love ♡</span>
        </div>
      }
      otherLink={{ to: '/photobooth', label: 'Visit the photobooth' }}
    />
  )
}
