import Icon from './Icon.jsx'

export default function GeneratedPhotostripPreview({ output, format, design, filterName, onPreviewLoaded }) {
  const { status, result, retry } = output
  return <div className={`result-print-panel result-print-panel--${format.layout}`} aria-busy={status === 'generating'}>
    {status === 'generating' && <div className="result-state result-loading" role="status" aria-live="polite">
      <span className="result-state-art" aria-hidden="true"><Icon name="camera" /></span>
      <h2>Developing your memories…</h2><p>A little birthday magic. Almost ready.</p>
      <span className="result-loading-dots" aria-hidden="true"><span /><span /><span /></span>
    </div>}
    {status === 'error' && <div className="result-state result-error" role="alert">
      <span className="result-state-art" aria-hidden="true"><Icon name="heart" /></span>
      <h2>We couldn’t prepare this filter preview.</h2>
      <p>Your four photos are still here. Try again, or return to the camera.</p>
      <button type="button" className="button button--primary result-retry" onClick={retry}><Icon name="redo" />Retry</button>
    </div>}
    {status === 'ready' && <figure className={`result-preview result-preview--${format.layout}`}>
      <img className="result-image" src={result.url} width={result.width} height={result.height}
        onLoad={() => onPreviewLoaded?.(result)}
        onError={output.previewFailed}
        alt={`Your four birthday photos in the ${design.name} ${format.displayName.toLowerCase()} photostrip, ${filterName} filter`} />
      <figcaption>four little moments, forever memories ♡</figcaption>
    </figure>}
  </div>
}
