import ActionLink from './ActionLink.jsx'
import BoothSteps from './BoothSteps.jsx'

export default function BoothPageLayout({
  currentStep, eyebrow, title, description,
  backTo = '/', backLabel = 'Back to the celebration', children,
}) {
  return (
    <section className="booth-page container">
      <ActionLink to={backTo} variant="text" icon="back" className="back-link">
        {backLabel}
      </ActionLink>
      <BoothSteps currentStep={currentStep} />
      <header className="booth-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {children}
    </section>
  )
}
