# Future photostrip template PNGs

Phase 4 renders all four placeholder themes with native Canvas artwork. This
folder does not need image files yet. Future designs can set `overlaySrc` to a
local asset, for example `/templates/2x6/sweet-bow.png`.

Templates must be **PNG**, with these exact dimensions:

| Format | Template size |
| --- | --- |
| 2x6 | 600 × 1800 px |
| 6x4 | 1800 × 1200 px |
| 4x6 | 1200 × 1800 px |

The file contains decorative artwork only. All four photo windows must be
transparent and match the `frames` rectangles in
`src/data/photoboothFormats.js`. Keep the window positions and sizes synchronized
when changing the layout; the PNG does not determine the crop geometry.

Use the existing design record's `overlaySrc` property. The renderer waits for
the asset to decode, draws the photographs first, then draws the template at
`(0, 0)` at the output dimensions. PNG alpha is preserved, so the photo windows
show the captured images. Template artwork replaces the Canvas placeholder
borders, motifs, and text; the selected background remains below the photos.

Local Vite public assets use paths such as `/templates/4x6/lavender-dream.png`.
Future remotely hosted assets must allow anonymous CORS image loading to keep
Canvas PNG export available. Uploads, admin validation, and storage are later
milestones; no upload or backend functionality is included here.
