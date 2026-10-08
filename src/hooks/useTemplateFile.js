import { useEffect, useState } from 'react'
import { validateTemplatePng, templateFileErrorMessage } from '../utils/templateValidation.js'
import { createTemplatePreview } from '../utils/templateManagement.js'

export default function useTemplateFile(file, formatId) {
  const [state, setState] = useState({ status: 'idle' })
  useEffect(() => {
    let active = true
    let preview
    async function validate() {
      if (!active) return
      if (!file) { setState({ file, formatId, status: 'idle' }); return }
      setState({ file, formatId, status: 'validating' })
      try {
        const dimensions = await validateTemplatePng(file, formatId)
        if (!active) return
        preview = createTemplatePreview(file)
        setState({ file, formatId, status: 'ready', url: preview.url, ...dimensions })
      } catch (error) {
        if (active) setState({ file, formatId, status: 'error', error: templateFileErrorMessage(error) })
      }
    }
    queueMicrotask(validate)
    return () => { active = false; preview?.release() }
  }, [file, formatId])
  return state.file === file && state.formatId === formatId ? state : { status: file ? 'validating' : 'idle' }
}
