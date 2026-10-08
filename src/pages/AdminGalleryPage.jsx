import PrivatePhotostripGallery from '../components/PrivatePhotostripGallery.jsx'

export default function AdminGalleryPage() {
  return <PrivatePhotostripGallery titleId="admin-gallery-title" eyebrow="Birthday admin · Gallery"
    title={<>Photostrip <em>Gallery</em></>} description="Browse the saved birthday memories and download their original PNGs." />
}
