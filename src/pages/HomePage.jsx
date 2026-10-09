import ActionLink from '../components/ActionLink.jsx'
import Decoration from '../components/Decoration.jsx'
import Icon from '../components/Icon.jsx'
import PhotostripPreview from '../components/PhotostripPreview.jsx'
import WelcomeModal from '../components/WelcomeModal.jsx'
import StudioMotif from '../components/StudioMotif.jsx'
import StudioSignature from '../components/StudioSignature.jsx'
import mainPhoto from '../assets/Main.jfif?url'
import stripPhoto1 from '../assets/strip1.jfif?url'
import stripPhoto2 from '../assets/strip2.jfif?url'
import stripPhoto3 from '../assets/strip3.jfif?url'
import stripPhoto4 from '../assets/strip4.jfif?url'
import lowerLeftPhoto from '../assets/lower1.jfif?url'
import lowerRightPhoto from '../assets/lower2.jfif?url'

const heroStripPhotos = [stripPhoto1, stripPhoto2, stripPhoto3, stripPhoto4]

function BirthdayCollage() {
  return (
    <div className="birthday-collage">
      <div className="collage-halo" aria-hidden="true" />
      <div className="collage-flyer" aria-hidden="true">
        <span className="flyer-kicker">LIVE / BIRTHDAY SESSION</span>
        <strong>AYESA <span>21</span></strong>
        <span className="flyer-subtitle">A little love. A little noise.</span>
        <StudioMotif type="seven-stars" />
        <span className="flyer-footer">ROOM 707 · ONE NIGHT ONLY</span>
      </div>
      <StudioMotif type="glasses" className="collage-glasses" />
      <StudioMotif type="room-tag" className="collage-room-tag" />
      <StudioMotif type="safety-pin" className="collage-pin" />
      <figure className="hero-polaroid">
        <span className="paper-tape" aria-hidden="true" />
        <div className="homepage-photo-frame">
          <img src={mainPhoto} alt="Ayesa wearing glasses and a red top" decoding="async" />
        </div>
        <figcaption>our birthday girl <span aria-hidden="true">♡</span></figcaption>
      </figure>
      <PhotostripPreview className="hero-photostrip" photos={heroStripPhotos} />
      <StudioMotif type="ticket" className="collage-ticket" />
      <StudioMotif type="lotus" className="collage-lotus" />
      <StudioMotif type="chain" className="collage-chain" />
      <Decoration type="bow" className="collage-bow" />
      <span className="collage-note">
        little moments, forever memories <span aria-hidden="true">♡</span>
      </span>
    </div>
  )
}

export default function HomePage({ showWelcome, onDismissWelcome }) {
  return (
    <>
      <section className="home-hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="birthday-tag">
            <Icon name="sparkle" />A celebration of our favorite girl
          </span>
          <StudioSignature className="hero-signature" />
          <h1 id="hero-title">
            Ayesa’s 21st{' '}
            <span className="hero-birthday">Birthday{' '}<Decoration type="star" /></span>
            Photobooth<span className="heading-dot">.</span>
          </h1>
          <p className="hero-description">
            Twenty-one looks sweet on you.<br />
            Let’s turn a little birthday love into memories that last.
          </p>
          <div className="hero-actions">
            <ActionLink to="/photobooth" id="start-photobooth" icon="camera" arrow>
              Start Photobooth
            </ActionLink>
            <ActionLink to="/messages" variant="secondary" icon="mail">
              Send a Message for Ayesa
            </ActionLink>
          </div>
          <p className="hero-postscript">
            <Icon name="heart" />For Ayesa. From all of us, with love.
          </p>
        </div>
        <BirthdayCollage />
      </section>

      <div className="birthday-ribbon" aria-hidden="true">
        <span>MAKE A MEMORY</span><StudioMotif type="seven-stars" />
        <span>LEAVE A LITTLE LOVE</span><span className="ribbon-room">ROOM 707</span>
        <span>CHAPTER TWENTY-ONE</span>
      </div>

      <section className="celebrate-section container" aria-labelledby="celebrate-title">
        <div className="section-heading">
          <StudioMotif type="lotus" className="section-lotus" />
          <p className="eyebrow">Consider this your party invitation</p>
          <h2 id="celebrate-title">
            Make her day a little sweeter<span className="heading-dot">.</span>
          </h2>
          <p>Two little ways to say, “I’m so glad you exist.”</p>
        </div>
        <div className="celebration-cards">
          <article className="celebration-card celebration-card--pink">
            <StudioMotif type="safety-pin" className="celebration-pin" />
            <div className="card-topline">
              <span className="card-number">01 / A keepsake</span>
              <Decoration type="camera" />
            </div>
            <h3>Strike a pose.<br />Keep the happy.</h3>
            <p>
              Four photos, your favorite smiles, and a cute little photostrip
              to remember the celebration.
            </p>
            <ActionLink to="/photobooth" variant="text" arrow>
              Explore the photobooth
            </ActionLink>
          </article>
          <article className="celebration-card celebration-card--lavender">
            <StudioMotif type="glasses" className="celebration-glasses" />
            <div className="card-topline">
              <span className="card-number">02 / A birthday wish</span>
              <span className="card-mail"><Icon name="mail" /><Decoration type="heart" /></span>
            </div>
            <h3>A few words.<br />A whole lot of love.</h3>
            <p>
              A birthday wish, a favorite memory, or all the lovely things
              you’ve been meaning to tell her.
            </p>
            <ActionLink to="/messages" variant="text" arrow>
              Send a Message for Ayesa
            </ActionLink>
          </article>
        </div>
      </section>

      <section className="birthday-story container" aria-labelledby="story-title">
        <div className="story-copy">
          <div className="story-motifs"><Decoration type="bow" /><StudioMotif type="chain" /><StudioMotif type="lotus" /></div>
          <p className="eyebrow">A little corner of the internet, just for you</p>
          <h2 id="story-title">For Ayesa.<br />For all the happy little moments.</h2>
          <p>
            A birthday gift for <strong>Lyann Ayesa P. Barranta</strong> — our Mia Marie Mae.
            Here’s to a new chapter filled with soft days, big dreams,
            and so much love.
          </p>
          <span className="handwritten">
            happy 21st, pretty girl <span aria-hidden="true">♡</span>
          </span>
        </div>
        <div className="memory-scrapbook">
          <div className="memory-scrapbook-label" aria-hidden="true"><span>THE LOVE NOTES / VOL. 21</span><StudioMotif type="seven-stars" /></div>
          <div className="memory-pair">
            <figure className="memory-photo memory-photo--first">
              <div className="homepage-photo-frame">
                <img src={lowerLeftPhoto} alt="Ayesa posing outdoors in a plaid skirt" loading="lazy" decoding="async" />
              </div>
              <figcaption>the little things</figcaption>
            </figure>
            <figure className="memory-photo memory-photo--second">
              <div className="homepage-photo-frame">
                <img src={lowerRightPhoto} alt="Ayesa wearing glasses with a plush toy" loading="lazy" decoding="async" />
              </div>
              <figcaption>the sweetest memories</figcaption>
            </figure>
          </div>
          <StudioMotif type="ticket" className="memory-ticket" />
        </div>
      </section>

      {showWelcome && <WelcomeModal onDismiss={onDismissWelcome} />}
    </>
  )
}
