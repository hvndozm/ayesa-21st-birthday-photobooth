import Icon from './Icon.jsx'

const steps = ['Format', 'Design', 'Photos', 'Filter', 'Result']

export default function BoothSteps({ currentStep }) {
  return (
    <ol className="booth-steps" aria-label="Photobooth progress">
      {steps.map((label, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <li key={label} className={isComplete ? 'is-complete' : ''}
            aria-current={isCurrent ? 'step' : undefined}>
            <span className="booth-step-number" aria-hidden="true">
              {isComplete ? <Icon name="check" /> : stepNumber}
            </span>
            <span className="booth-sr-only">
              {isComplete ? 'Completed: ' : !isCurrent ? 'Upcoming: ' : ''}
            </span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
