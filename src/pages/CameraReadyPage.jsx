import { Navigate, useSearchParams } from 'react-router-dom'
import ActionLink from '../components/ActionLink.jsx'
import BoothPageLayout from '../components/BoothPageLayout.jsx'
import BoothPreview from '../components/BoothPreview.jsx'
import Icon from '../components/Icon.jsx'
import { getPhotoboothFormat, getFormatDimensions } from '../data/photoboothFormats.js'
import { getPlaceholderDesign } from '../data/placeholderDesigns.js'
import { createSelectionSearch } from '../utils/photoboothNavigation.js'

export default function CameraReadyPage() {
  const [searchParams] = useSearchParams()
  const format = getPhotoboothFormat(searchParams.get('format'))
  const design = getPlaceholderDesign(searchParams.get('design'), format?.id)

  if (!format) return <Navigate to="/photobooth" replace />
  if (!design) {
    return <Navigate to={`/photobooth/designs${createSelectionSearch(format.id)}`} replace />
  }

  const designsUrl = `/photobooth/designs${createSelectionSearch(format.id, design.id)}`

  return (
    <BoothPageLayout currentStep={3} eyebrow="One lovely little keepsake, coming right up"
      title={<>Your booth is <em>ready!</em></>}
      description="You’ve found your format and your frame. Here’s a little look at your birthday booth."
      backTo={designsUrl} backLabel="Back to Designs">
      <div className="booth-ready">
        <figure className="booth-ready-preview">
          <BoothPreview format={format} design={design} />
          <figcaption>Mock preview <span aria-hidden="true">♡</span></figcaption>
        </figure>
        <div className="booth-ready-details">
          <span className="coming-soon"><Icon name="camera" />Photos coming next</span>
          <h2>Your happy little combination.</h2>
          <dl>
            <div><dt>Format</dt><dd>{format.displayName}<span>{getFormatDimensions(format)}</span></dd></div>
            <div><dt>Design</dt><dd>{design.name}<span>{design.description}</span></dd></div>
          </dl>
          <p className="booth-camera-note">
            The camera experience will be added in the next phase.
            Your selections are ready; photo taking isn’t available just yet.
          </p>
          <div className="booth-ready-actions">
            <ActionLink to={designsUrl} icon="back">Back to Designs</ActionLink>
            <ActionLink to="/" variant="secondary" icon="heart">Back Home</ActionLink>
          </div>
        </div>
      </div>
    </BoothPageLayout>
  )
}
