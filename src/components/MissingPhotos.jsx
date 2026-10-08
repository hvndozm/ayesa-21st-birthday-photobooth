import ActionLink from './ActionLink.jsx'
import BoothPageLayout from './BoothPageLayout.jsx'
import Icon from './Icon.jsx'
import { createCaptureSearch } from '../utils/captureNavigation.js'

export default function MissingPhotos({ format, design, mockMode, currentStep = 4 }) {
  const cameraUrl = `/photobooth/camera${createCaptureSearch(format.id, design.id, mockMode, 'photos-missing')}`
  return <BoothPageLayout currentStep={currentStep} className="camera-page result-page"
    eyebrow="A fresh little moment awaits" title={<>Let’s make another <em>memory.</em></>}
    description="Your photos live only in this tab. Refreshing starts a fresh session."
    backTo={cameraUrl} backLabel="Return to Camera">
    <div className="result-state result-recovery" role="status">
      <span className="result-state-art" aria-hidden="true"><Icon name="camera" /></span>
      <h2>We don’t have your four photos anymore.</h2>
      <p>Take four new photos to make your keepsake. Your format and design are still selected.</p>
      <ActionLink to={cameraUrl} icon="camera" className="result-recovery-link">Return to Camera</ActionLink>
      <ActionLink to="/" variant="text" icon="heart">Home</ActionLink>
    </div>
  </BoothPageLayout>
}
