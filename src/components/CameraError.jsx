export default function CameraError({ error }) {
  return (
    <div className="camera-error" role="alert">
      <h2>{error.title}</h2>
      <p>{error.message}</p>
    </div>
  )
}
