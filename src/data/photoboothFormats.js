// Shared by selection previews and the future camera/Canvas phases.
export const photoboothFormats = [
  {
    id: '2x6',
    displayName: 'Classic Strip',
    widthInches: 2,
    heightInches: 6,
    canvasWidth: 600,
    canvasHeight: 1800,
    layout: 'vertical-strip',
    description: 'Four happy little moments, stacked from top to bottom.',
  },
  {
    id: '6x4',
    displayName: 'Landscape Grid',
    widthInches: 6,
    heightInches: 4,
    canvasWidth: 1800,
    canvasHeight: 1200,
    layout: 'landscape-grid',
    description: 'Four photos in a wide, lovely two-by-two keepsake.',
  },
  {
    id: '4x6',
    displayName: 'Portrait Grid',
    widthInches: 4,
    heightInches: 6,
    canvasWidth: 1200,
    canvasHeight: 1800,
    layout: 'portrait-grid',
    description: 'Four photos in a tall two-by-two birthday print.',
  },
]

export function getPhotoboothFormat(formatId) {
  return photoboothFormats.find((format) => format.id === formatId)
}

export function getFormatDimensions(format) {
  return `${format.widthInches} × ${format.heightInches} inches`
}
