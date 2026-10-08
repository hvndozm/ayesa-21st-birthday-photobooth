import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import BirthdayDialog from '../components/BirthdayDialog.jsx'
import PrivateDataState from '../components/PrivateDataState.jsx'
import TemplateDesignCard from '../components/TemplateDesignCard.jsx'
import TemplateUploadDialog from '../components/TemplateUploadDialog.jsx'
import TemplateDeleteDialog from '../components/TemplateDeleteDialog.jsx'
import TemplatePreview from '../components/TemplatePreview.jsx'
import usePrivateCollection from '../hooks/usePrivateCollection.js'
import usePrivatePreviews from '../hooks/usePrivatePreviews.js'
import { getTemplateDesigns } from '../services/templateDesignService.js'
import { templateLabels } from '../utils/templateManagement.js'
import { formatBirthdayDate } from '../utils/birthdayDashboard.js'

export default function AdminDesignsPage() {
  const designs = usePrivateCollection(getTemplateDesigns)
  const { designs: counts } = useOutletContext()
  const { previews, retry, unavailable } = usePrivatePreviews(designs.data?.items, 'template-designs')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [opened, setOpened] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState('')
  function uploaded() { setUploadOpen(false); designs.retry(); counts.retry(); setNotice('Your custom design is uploaded and active.') }
  function toggled(design, active) {
    designs.updateData(page => ({ ...page, items: page.items.map(item => item.id === design.id ? { ...item, is_active: active } : item) }))
    counts.updateData(value => ({ ...value, active: Math.max(0, value.active + (active ? 1 : -1)) }))
    setNotice(`${design.name} is now ${active ? 'active' : 'inactive'}.`)
  }
  function deleted() { setDeleting(null); designs.retry(); counts.retry(); setNotice('The template file and its design record were deleted.') }
  return <section aria-labelledby="admin-designs-title">
    <header className="birthday-page-intro">
      <p className="eyebrow">Birthday admin · Custom artwork</p>
      <h1 id="admin-designs-title">Template <em>Designs</em></h1>
      <p>Upload, preview, and organize the artwork for each photobooth format.</p>
    </header>
    <div className="admin-design-toolbar">
      <button type="button" className="button button--primary admin-new-design" onClick={() => setUploadOpen(true)}><Icon name="sparkle" />Upload New Design</button>
      <button type="button" className="birthday-small-button" onClick={() => { designs.retry(); counts.retry() }}>Refresh designs</button>
    </div>
    <p className="admin-phase-note">Custom templates stay in Admin preview for now. The guest photobooth keeps its current designs.</p>
    {notice && <p className="admin-design-notice" role="status">{notice}</p>}
    {designs.status !== 'ready' ? <PrivateDataState status={designs.status} onRetry={designs.retry} />
      : !designs.data.items.length ? <div className="birthday-data-state">
        <span className="birthday-state-icon"><Icon name="sparkle" /></span><h2>No custom templates uploaded yet.</h2>
        <p>A little space for your birthday artwork.</p>
        <button type="button" className="button button--secondary" onClick={() => setUploadOpen(true)}>Upload Your First Design</button>
      </div> : <>
        <ul className="admin-design-grid">{designs.data.items.map(design => <TemplateDesignCard key={design.id} design={design} preview={previews[design.id]}
          onPreviewError={unavailable} onRetryPreview={retry} onOpen={setOpened} onDelete={setDeleting} onToggle={toggled} />)}</ul>
        {designs.data.hasMore && <div className="birthday-load-more">
          {designs.moreStatus === 'error' && <p role="alert">We couldn’t load the next designs. Please try again.</p>}
          <button type="button" className="button button--secondary" disabled={designs.moreStatus === 'loading'} onClick={designs.loadMore}>
            {designs.moreStatus === 'loading' ? 'Loading more designs…' : designs.moreStatus === 'error' ? 'Retry Load More' : 'Load More Designs'}
          </button>
        </div>}
      </>}
    {uploadOpen && <TemplateUploadDialog onClose={() => setUploadOpen(false)} onUploaded={uploaded} />}
    {deleting && <TemplateDeleteDialog design={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} onPartial={unavailable} />}
    {opened && <BirthdayDialog titleId="template-preview-title" closeLabel="Close template preview" className="admin-template-dialog" onClose={() => setOpened(null)}>
      <p className="eyebrow">Custom template preview</p><h2 id="template-preview-title">{opened.name}</h2>
      <p className="admin-file-status">{templateLabels(opened).formatName} · {templateLabels(opened).dimensions}</p>
      <time className="admin-file-status" dateTime={opened.created_at}>{formatBirthdayDate(opened.created_at, true)}</time>
      <TemplatePreview design={opened} preview={previews[opened.id]} onError={unavailable} />
      {previews[opened.id]?.status === 'unavailable' && <button type="button" className="birthday-small-button" onClick={() => retry(opened)}>Reload preview</button>}
    </BirthdayDialog>}
  </section>
}
