// These settings describe photographs only. Template colors never pass through them.
export const photoboothFilters = [
  {
    id: 'original',
    name: 'Original',
    description: 'Your happy moments, just as they are.',
    previewLabel: 'Natural',
    render: { contrast: 1, brightness: 1, saturation: 1, tint: [0, 0, 0], grain: 0 },
  },
  {
    id: 'blurry',
    name: 'Blurry',
    description: 'A soft little daydream, with a gentle glow.',
    previewLabel: 'Soft & dreamy',
    render: {
      contrast: 0.94, brightness: 1.025, saturation: 0.94, tint: [2, 1, 3], grain: 0,
      softenRadius: 2, softenMix: 0.4,
    },
  },
  {
    id: 'digicam',
    name: 'Digicam',
    description: 'Bright, crisp memories with a hint of Y2K grain.',
    previewLabel: 'Y2K flash',
    render: { contrast: 1.12, brightness: 1.025, saturation: 1.14, tint: [-1, 0, 3], grain: 2.2 },
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description: 'Warm instant-film colors and softly faded shadows.',
    previewLabel: 'Warm & faded',
    render: { contrast: 0.9, brightness: 1.025, saturation: 0.85, tint: [8, 4, -4], grain: 1.8 },
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Timeless black and white, with all your little details.',
    previewLabel: 'Black & white',
    render: { contrast: 1.045, brightness: 1, saturation: 0, tint: [0, 0, 0], grain: 0.8 },
  },
]

export function getPhotoboothFilter(filterId = 'original') {
  return photoboothFilters.find((filter) => filter.id === filterId)
}

export function getFilterDisplayName(filterId) {
  return (getPhotoboothFilter(filterId) ?? photoboothFilters[0]).name
}
