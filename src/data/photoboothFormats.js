// Shared by selection, capture previews, and the full-resolution Canvas renderer.
// Frame rectangles are the standard for future transparent PNG photo windows.
export const photoboothFormats = [
  {
    id: '2x6',
    displayName: 'Classic Strip',
    widthInches: 2,
    heightInches: 6,
    canvasWidth: 600,
    canvasHeight: 1800,
    layout: 'vertical-strip',
    frames: [
      { x: 50, y: 150, width: 500, height: 355 },
      { x: 50, y: 530, width: 500, height: 355 },
      { x: 50, y: 910, width: 500, height: 355 },
      { x: 50, y: 1290, width: 500, height: 355 },
    ],
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
    frames: [
      { x: 130, y: 80, width: 750, height: 500 },
      { x: 920, y: 80, width: 750, height: 500 },
      { x: 130, y: 620, width: 750, height: 500 },
      { x: 920, y: 620, width: 750, height: 500 },
    ],
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
    frames: [
      { x: 80, y: 180, width: 500, height: 667 },
      { x: 620, y: 180, width: 500, height: 667 },
      { x: 80, y: 887, width: 500, height: 667 },
      { x: 620, y: 887, width: 500, height: 667 },
    ],
    description: 'Four photos in a tall two-by-two birthday print.',
  },
]

export function getPhotoboothFormat(formatId) {
  return photoboothFormats.find((format) => format.id === formatId)
}

export function getFormatDimensions(format) {
  return `${format.widthInches} × ${format.heightInches} inches`
}
