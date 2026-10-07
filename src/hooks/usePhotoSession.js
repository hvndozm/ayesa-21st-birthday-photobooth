import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function usePhotoSession() {
  const [photoSession, setPhotoSession] = useState(null)
  const previousPhotos = useRef([])
  const { pathname } = useLocation()

  useEffect(() => {
    const nextPhotos = photoSession?.photos.filter(Boolean) ?? []
    const retainedUrls = new Set(nextPhotos.map((photo) => photo.url))
    for (const photo of previousPhotos.current) {
      if (!retainedUrls.has(photo.url)) URL.revokeObjectURL(photo.url)
    }
    previousPhotos.current = nextPhotos
  }, [photoSession])

  useEffect(() => () => {
    previousPhotos.current.forEach((photo) => URL.revokeObjectURL(photo.url))
    previousPhotos.current = []
  }, [])

  useEffect(() => {
    if (pathname !== '/photobooth' && !pathname.startsWith('/photobooth/')) {
      setPhotoSession(null)
    }
  }, [pathname])

  return [photoSession, setPhotoSession]
}
