# Photostrip template PNGs

The four built-in themes render with their existing native Canvas artwork and
CSS previews. This public folder needs no template images. Sweet Bow, Birthday
Sparkle, Lavender Dream, and Love Letter must remain built-in designs; do not
convert or migrate them to PNGs.

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

Admin uploads live in the PRIVATE `template-designs` bucket and are previewed
with 600-second signed URLs. Do not copy uploaded artwork into this public folder.
Phase 10 combines all four built-ins with up to four active custom PNGs per format.
PNG validation, format assignment, Enable/Disable, and confirmed deletion are
available at `/admin/designs`; inactive custom rows also occupy a custom slot.

Final rendering uses an original authenticated private download attached as
`overlayBlob`, never a signed preview URL. The renderer draws locally filtered
photographs first and the unfiltered full-resolution template last at `(0, 0)`.
PNG alpha reveals the photos. Completed strips are flattened and independently
stored in PRIVATE `photostrips`, so template deletion never deletes saved memories.

See [Admin template artwork](../../docs/template-artwork.md) for the maximum
10 MB size, exact dimensions, transparent photo windows, and all frame positions.
See the [Phase 10 verification checklist](../../docs/phase-10-verification.md)
for the public custom-template and filter workflow.
