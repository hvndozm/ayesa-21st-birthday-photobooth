import Icon from './Icon.jsx'
import { resolveMemoryLabels } from '../utils/birthdayDashboard.js'

export default function PrivateMemoryPreview({ memory, preview, onError, loading = 'eager' }) {
  const labels = resolveMemoryLabels(memory)
  return preview?.status === 'ready'
    ? <img src={preview.url} width={labels.width} height={labels.height} loading={loading} decoding="async"
      alt={`${labels.designName} birthday photostrip in the ${labels.formatName.toLowerCase()} format with the ${labels.filterName} filter`}
      onError={() => onError(memory.id)} />
    : <div className="birthday-preview-unavailable" role="status"><Icon name="camera" />
      <span>{!preview || preview.status === 'loading' ? 'Opening this memory…' : 'Preview unavailable'}</span>
    </div>
}
