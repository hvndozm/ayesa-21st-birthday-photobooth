import { photoboothFormats } from './photoboothFormats.js'

// Mock CSS themes only. Real transparent overlays belong to a later phase.
const designThemes = [
  {
    theme: 'sweet-bow',
    name: 'Sweet Bow',
    motif: 'bow',
    description: 'Blush pink, tiny dots, and a little ribbon of love.',
  },
  {
    theme: 'birthday-sparkle',
    name: 'Birthday Sparkle',
    motif: 'sparkle',
    description: 'Warm cream and golden sparkles for her new chapter.',
  },
  {
    theme: 'lavender-dream',
    name: 'Lavender Dream',
    motif: 'cloud',
    description: 'Soft lavender and a cloud for your daydreams.',
  },
  {
    theme: 'love-letter',
    name: 'Love Letter',
    motif: 'heart',
    description: 'A rosy little frame, sealed with a heart.',
  },
]

// Each format has its own four compatible designs and stable, unique IDs.
export const placeholderDesigns = photoboothFormats.flatMap((format) =>
  designThemes.map((theme) => ({
    id: `${format.id}-${theme.theme}`,
    formatId: format.id,
    ...theme,
  })),
)

export function getDesignsForFormat(formatId) {
  return placeholderDesigns.filter((design) => design.formatId === formatId)
}

export function getPlaceholderDesign(designId, formatId) {
  return placeholderDesigns.find(
    (design) => design.id === designId && design.formatId === formatId,
  )
}
