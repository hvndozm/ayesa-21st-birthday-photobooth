import StudioMotif from './StudioMotif.jsx'

export default function StudioSignature({ className = '' }) {
  return <div className={`studio-signature ${className}`} aria-hidden="true">
    <span className="studio-signature-room">ROOM <strong>707</strong></span>
    <StudioMotif type="seven-stars" />
    <span className="studio-signature-note">Birthday session / 21</span>
  </div>
}
