import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import BirthdayMemoryDialog from './BirthdayMemoryDialog.jsx'
import PrivateMemoryPreview from './PrivateMemoryPreview.jsx'
import PrivateDataState from './PrivateDataState.jsx'
import usePrivateCollection from '../hooks/usePrivateCollection.js'
import usePrivatePreviews from '../hooks/usePrivatePreviews.js'
import { getPrivatePhotostrips } from '../services/privateDashboardService.js'
import { formatBirthdayDate, resolveMemoryLabels } from '../utils/birthdayDashboard.js'

export default function PrivatePhotostripGallery({ titleId = 'birthday-gallery-title', eyebrow = 'Your birthday photo album',
  title = <>Memories made <em>for you.</em></>, description = 'Four little moments, a whole lot of happy.' }) {
  const memories = usePrivateCollection(getPrivatePhotostrips)
  const { previews, retry, unavailable } = usePrivatePreviews(memories.data?.items)
  const { gallery: counts } = useOutletContext()
  const [opened, setOpened] = useState(null)
  return <section aria-labelledby={titleId}>
    <header className="birthday-page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={titleId}>{title}</h1>
      <p>{description}</p>
      {counts.data && <p className="birthday-collection-count">{counts.data.total.toLocaleString()} birthday memories</p>}
    </header>
    {memories.status !== 'ready' ? <PrivateDataState status={memories.status} onRetry={memories.retry} />
      : !memories.data.items.length ? <PrivateDataState emptyTitle="No birthday memories have arrived yet ♡">Your little album is waiting for its first smiles.</PrivateDataState>
        : <>
          <ul className="birthday-gallery-grid">
            {memories.data.items.map(memory => {
              const labels = resolveMemoryLabels(memory)
              return <li key={memory.id} className="birthday-memory-card">
                <button type="button" className="birthday-memory-open" onClick={() => setOpened(memory)}
                  aria-label={`Open ${labels.designName}, ${labels.formatName}, ${labels.filterName} filter, ${formatBirthdayDate(memory.created_at)}`}>
                  <span className="birthday-memory-image"><PrivateMemoryPreview memory={memory} preview={previews[memory.id]} onError={unavailable} /></span>
                  <span className="birthday-memory-caption"><strong>{labels.designName}</strong><span>{labels.formatName}</span>
                    <span>{labels.dimensions} · {labels.filterName}</span><time dateTime={memory.created_at}>{formatBirthdayDate(memory.created_at)}</time></span>
                </button>
                {previews[memory.id]?.status === 'unavailable' && <button type="button" className="birthday-small-button" onClick={() => retry(memory)}>Reload preview</button>}
              </li>
            })}
          </ul>
          {memories.data.hasMore && <div className="birthday-load-more">
            {memories.moreStatus === 'error' && <p role="alert">We couldn’t open the next memories. Please try again.</p>}
            <button type="button" className="button button--secondary" onClick={memories.loadMore} disabled={memories.moreStatus === 'loading'}>
              {memories.moreStatus === 'loading' ? 'Opening more memories…' : memories.moreStatus === 'error' ? 'Retry Load More' : 'Load More Memories'}
            </button>
          </div>}
        </>}
    {opened && <BirthdayMemoryDialog memory={opened} preview={previews[opened.id]} onPreviewError={unavailable} onRetryPreview={retry} onClose={() => setOpened(null)} />}
  </section>
}
