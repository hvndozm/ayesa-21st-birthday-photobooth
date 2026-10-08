import Icon from './Icon.jsx'
import { templateLabels } from '../utils/templateManagement.js'

export default function TemplatePreview({ design, preview, onError, loading = 'eager' }) {
  const labels = templateLabels(design)
  return <div className="admin-template-image">
    {preview?.status === 'ready' ? <img src={preview.url} width={labels.width} height={labels.height} loading={loading} decoding="async"
      alt={`${design.name} template artwork with transparent photo openings, ${labels.formatName}`}
      onError={() => onError(design.id)} />
      : <div className="birthday-preview-unavailable" role="status"><Icon name="sparkle" /><span>
        {!preview || preview.status === 'loading' ? 'Opening template…' : 'Preview unavailable'}
      </span></div>}
  </div>
}
