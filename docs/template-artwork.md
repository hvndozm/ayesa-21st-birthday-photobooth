# Admin template artwork

Admin manages custom templates at `/admin/designs`. Uploads remain in PRIVATE
`template-designs`; selection previews use temporary signed URLs. Phase 10 adds
active custom PNGs alongside Sweet Bow, Birthday Sparkle, Lavender Dream, and
Love Letter. These four built-in designs remain local CSS/Canvas designs and
must not be uploaded, replaced, or migrated into the custom table.

Each format has up to **four custom slots**, counting both Active and Inactive
rows. Deleting a custom design frees a slot; disabling it does not. The upload
dialog counts the selected format and the service checks again before any
Storage upload. A fifth design is blocked. Concurrent uploads from different
tabs/accounts can race this browser count; no server-side quota transaction or
schema/policy change is implemented.

Export a **PNG** with these exact pixel dimensions:

| Format | PNG dimensions |
| --- | --- |
| 2 × 6 inches | 600 × 1800 px |
| 6 × 4 inches | 1800 × 1200 px |
| 4 × 6 inches | 1200 × 1800 px |

The maximum file size is **10 MB (10,485,760 bytes)**. Artwork is never resized.
Keep the four photo openings transparent and place decorative artwork around
them. A checkerboard preview helps inspect transparency; the app does not
scan every pixel or certify that the openings are transparent.

Photo placement is defined centrally in `src/data/photoboothFormats.js`.
Coordinates below are pixels measured from the PNG's top-left corner. Keep
the artwork aligned with this configuration rather than inventing new windows.

| Format | Photo | x | y | Width | Height |
| --- | --- | --- | --- | --- | --- |
| 2 × 6 | 1 | 50 | 150 | 500 | 355 |
| 2 × 6 | 2 | 50 | 530 | 500 | 355 |
| 2 × 6 | 3 | 50 | 910 | 500 | 355 |
| 2 × 6 | 4 | 50 | 1290 | 500 | 355 |
| 6 × 4 | 1 | 130 | 80 | 750 | 500 |
| 6 × 4 | 2 | 920 | 80 | 750 | 500 |
| 6 × 4 | 3 | 130 | 620 | 750 | 500 |
| 6 × 4 | 4 | 920 | 620 | 750 | 500 |
| 4 × 6 | 1 | 80 | 180 | 500 | 667 |
| 4 × 6 | 2 | 620 | 180 | 500 | 667 |
| 4 × 6 | 3 | 80 | 887 | 500 | 667 |
| 4 × 6 | 4 | 620 | 887 | 500 | 667 |

1. Open Template Designs as Admin and choose Upload New Design.
2. Give the artwork a name (1–80 characters), select its matching format, and
   choose the PNG. Check the local preview and transparent openings.
3. Upload. The original PNG is stored without overwriting another file; its
   metadata defaults to Active. A duplicate normalized name in the same format
   requires another name. Names that normalize to an empty Latin slug use
   `birthday-design`, with the same duplicate check.
4. Enable/Disable changes only the saved active state. Active custom designs
   appear in new public selection for their matching format; disabled designs
   disappear. Old direct URLs are revalidated and offer Choose Another Design.
5. Delete requires an accessible confirmation. It removes one template file
   and then its matching design record. Saved guest photostrips are untouched.

Successful uploads refresh the list. A definite metadata rejection attempts
cleanup of the newly uploaded file. If cleanup fails, review the private bucket
in Supabase before another upload. If a network response is lost, a write may
already have succeeded: refresh/review rather than blindly submitting again.

If the file was removed but record deletion fails, the confirmation dialog
offers Retry Record Deletion. Confirmed progress is retained in memory so the
retry skips file removal. After a full browser refresh that progress is gone;
verify the remaining record/file in the trusted Supabase Dashboard before
recovering manually. Empty file-removal acknowledgements are not accepted as
proof that deletion succeeded.

Signed preview URLs last 600 seconds and renew while the page is open or when
returning to the tab. They are never stored in the table. A missing preview can
be reloaded without preventing the other templates from being managed.

The capture composition places your unmodified PNG over live/captured photos
using percentages derived from the coordinates above. For final output, the
renderer downloads the original private PNG, checks its full dimensions, draws
the four filtered photographs, then draws your colored artwork last. The selected
filter affects photo pixels only; even Mono preserves colored template artwork.
The same full-resolution flattened PNG is previewed in Filter, displayed in
Result, downloaded, and saved separately in PRIVATE `photostrips`.

See the [Phase 10 verification checklist](phase-10-verification.md) for all three
formats, inactive/deleted recovery, original downloads, and four-slot checks.
