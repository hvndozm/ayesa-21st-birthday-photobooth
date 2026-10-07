import { useEffect, useState } from 'react'
import { generatePhotostrip } from '../utils/photostripRenderer.js'

export default function useGeneratedPhotostrip(format, design, photos) {
  const [attempt, setAttempt] = useState(0)
  const [output, setOutput] = useState({ status: 'generating', result: null })

  useEffect(() => {
    const controller = new AbortController()
    let resultUrl = null
    setOutput({ status: 'generating', result: null })
    generatePhotostrip({ format, design, photos, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        resultUrl = URL.createObjectURL(result.blob)
        setOutput({ status: 'ready', result: { ...result, url: resultUrl } })
      })
      .catch(() => {
        if (!controller.signal.aborted) setOutput({ status: 'error', result: null })
      })
    return () => {
      controller.abort()
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [format, design, photos, attempt])

  return { ...output, retry: () => setAttempt((number) => number + 1) }
}
