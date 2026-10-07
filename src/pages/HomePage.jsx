import ActionLink from '../components/ActionLink.jsx'
import Decoration from '../components/Decoration.jsx'
import Icon from '../components/Icon.jsx'
import PhotoPlaceholder from '../components/PhotoPlaceholder.jsx'
import PhotostripPreview from '../components/PhotostripPreview.jsx'
import WelcomeModal from '../components/WelcomeModal.jsx'

function BirthdayCollage() {
  return (
    <div className="birthday-collage">
      <div className="collage-halo" aria-hidden="true" />
      <Decoration type="cloud" className="collage-cloud" />
      <Decoration type="sparkle" className="collage-sparkle" />
      <figure className="hero-polaroid">
        <span className="paper-tape" aria-hidden="true" />
        <PhotoPlaceholder label="Placeholder for a custom birthday portrait of Ayesa" motif="bow" />
        <figcaption>our birthday girl <span aria-hidden="true">♡</span></figcaption>
      </figure>
      <PhotostripPreview className="hero-photostrip" />
      <div className="birthday-stamp" aria-hidden="true">
        <span>hello,</span><strong>21</strong><span>sweet new chapter</span>
      </div>
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
          <h1 id="hero-title">
            Ayesa’s 21st{' '}
            <span className="hero-birthday">Birthday{' '}<Decoration type="sparkle" /></span>
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
        <span>MAKE A MEMORY</span><Decoration type="sparkle" />
        <span>LEAVE A LITTLE LOVE</span><Decoration type="sparkle" />
        <span>CELEBRATE AYESA</span><Decoration type="sparkle" />
        <span>CHAPTER TWENTY-ONE</span>
      </div>

      <section className="celebrate-section container" aria-labelledby="celebrate-title">
        <div className="section-heading">
          <p className="eyebrow">Consider this your party invitation</p>
          <h2 id="celebrate-title">
            Make her day a little sweeter<span className="heading-dot">.</span>
          </h2>
          <p>Two little ways to say, “I’m so glad you exist.”</p>
        </div>
        <div className="celebration-cards">
          <article className="celebration-card celebration-card--pink">
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
          <Decoration type="bow" />
          <p className="eyebrow">A little corner of the internet, just for you</p>
          <h2 id="story-title">For Ayesa.<br />For all the happy little moments.</h2>
          <p>
            A birthday gift for <strong>Lyann Ayesa P. Barranta</strong> — our Eley.
            Here’s to a new chapter filled with soft days, big dreams,
            and so much love.
          </p>
          <span className="handwritten">
            happy 21st, lovely <span aria-hidden="true">♡</span>
          </span>
        </div>
        <div className="memory-pair">
          <figure className="memory-photo memory-photo--first">
            <PhotoPlaceholder label="Placeholder for a favorite birthday memory of Ayesa"
              theme="lavender" motif="cloud" />
            <figcaption>the little things</figcaption>
          </figure>
          <figure className="memory-photo memory-photo--second">
            <PhotoPlaceholder label="Placeholder for another custom birthday photograph"
              theme="peach" motif="heart" />
            <figcaption>the sweetest memories</figcaption>
          </figure>
        </div>
      </section>

      {showWelcome && <WelcomeModal onDismiss={onDismissWelcome} />}
    </>
  )
}
