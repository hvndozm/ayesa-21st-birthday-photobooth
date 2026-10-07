import ActionLink from '../components/ActionLink.jsx'
import Decoration from '../components/Decoration.jsx'

export default function NotFoundPage() {
  return (
    <section className="not-found container">
      <Decoration type="cloud" />
      <p className="eyebrow">404 · A little detour</p>
      <h1>Let’s get you back<br />to the party.</h1>
      <p>This page couldn’t be found, but the celebration is right here.</p>
      <ActionLink to="/" icon="back">Back to home</ActionLink>
    </section>
  )
}
