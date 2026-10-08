# Admin template artwork

Phase 9 manages custom templates at `/admin/designs`. Uploads and previews stay
private in `template-designs`. Guests still select the existing local placeholder
designs, and Canvas still renders those designs. Connecting uploaded templates
to guest selection/composition belongs to Phase 10.

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
4. Enable/Disable changes only the saved active state. It does not affect the
   guest photobooth in Phase 9.
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
