import { photoboothFormats } from './photoboothFormats.js'

// Canvas colors/patterns mirror the existing CSS mock themes approximately.
const designThemes = [
  {
    theme: 'sweet-bow',
    name: 'Sweet Bow',
    motif: 'bow',
    description: 'Blush pink, tiny dots, and a little ribbon of love.',
    canvasStyle: {
      backgroundColor: '#f8dce7', borderColor: '#d9bfcd', accentColor: '#bc7f9c',
      textColor: '#795367', pattern: 'dots', patternColor: '#fff9fc',
    },
  },
  {
    theme: 'birthday-sparkle',
    name: 'Birthday Sparkle',
    motif: 'sparkle',
    description: 'Warm cream and golden sparkles for her new chapter.',
    canvasStyle: {
      backgroundColor: '#fff5dd', backgroundEndColor: '#f6e3bd', borderColor: '#d3b686',
      accentColor: '#b68643', textColor: '#795b31', pattern: 'gradient',
    },
  },
  {
    theme: 'lavender-dream',
    name: 'Lavender Dream',
    motif: 'cloud',
    description: 'Soft lavender and a cloud for your daydreams.',
    canvasStyle: {
      backgroundColor: '#ddcde9', borderColor: '#bb9dce', accentColor: '#9975b3',
      textColor: '#684b7d', pattern: 'dots', patternColor: '#f9f2ff',
    },
  },
  {
    theme: 'love-letter',
    name: 'Love Letter',
    motif: 'heart',
    description: 'A rosy little frame, sealed with a heart.',
    canvasStyle: {
      backgroundColor: '#f3d3dd', borderColor: '#c28a9e', accentColor: '#b87994',
      textColor: '#795367', pattern: 'lines', patternColor: '#f7e2e9',
    },
  },
]

// Each format has its own four compatible designs and stable, unique IDs.
export const placeholderDesigns = photoboothFormats.flatMap((format) =>
  designThemes.map((theme) => ({
    id: `${format.id}-${theme.theme}`,
    formatId: format.id,
    overlaySrc: null, // Future local PNG path, drawn over the photos instead of placeholder artwork.
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
