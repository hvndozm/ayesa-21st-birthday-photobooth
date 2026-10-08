# Phase 10 manual verification

Use `npm.cmd run dev` on Windows (or `npm run dev`) and the printed local URL.
`mockCamera=true` is development-only; it never requests webcam permission.
The checklist below describes checks to perform, not completed live checks.
Use disposable birthday artwork/messages for testing. Enter private credentials
yourself locally and keep credentials, keys, private paths, and signed URLs out
of reports.

## Built-in designs and filters

1. Choose **2x6 → Sweet Bow**, then append `&mockCamera=true` to the camera URL.
   Example: `/photobooth/camera?format=2x6&design=2x6-sweet-bow&mockCamera=true`.
2. Open the mock camera and capture four distinct photos. Retake one frame and
   confirm the other three remain intact; **Use These Photos** opens Filter.
3. Confirm Original is selected. Try **Original, Blurry, Digicam, Polaroid, Mono**
   individually and wait for each full-strip preview. All four photos must change
   together; Mono photos are gray while bows/text/background remain colored.
4. Tap filters quickly, then select one deliberately. Continue must stay disabled
   until that selected preview loads. Continue to Result; confirm the complete
   image exactly matches the selected preview and the filter label is correct.
5. Download PNG and confirm **600×1800**. The private gallery status should refer
   to this final output only; changing filters before Result must upload nothing.
6. Repeat the essential capture/filter/result/download checks for **Birthday
   Sparkle, Lavender Dream, and Love Letter**, in **all three formats**:

   | Format | Download dimensions |
   | --- | --- |
   | 2x6 | 600×1800 |
   | 6x4 | 1800×1200 |
   | 4x6 | 1200×1800 |

7. With missing configuration, offline custom loading, or an empty custom catalog,
   confirm all built-ins remain available and local rendering/download works.
   Refresh Filter/Result without local photos: Return to Camera must preserve
   the selected IDs and mock flag. Retake from Result and confirm all retained
   photos remain usable, then capture replacements and return to Filter.

## Real custom PNGs

1. Log in at `/admin/login`; upload a valid **600×1800**, ≤10 MB transparent PNG
   for 2x6. Align all windows with the [artwork coordinates](template-artwork.md).
   Confirm Active and one matching private object/metadata row, then log out.
2. Open public 2x6 selection. Confirm all four built-ins plus the active custom
   card appear. The custom preview should show neutral photos through its openings.
3. Select the custom card and use `mockCamera=true`. Confirm its actual colored
   PNG overlays all four frames, controls remain usable, and no window drifts at
   **320, 375, 390, 430, 768, and desktop widths**.
4. Capture four mock photos; try all five filters. Mono must leave custom artwork
   colored. Continue with one filter; verify Result, Download PNG **600×1800**,
   and successful private final gallery save.
5. Repeat essential overlay/filter/output checks with **1800×1200 6x4** and
   **1200×1800 4x6** custom PNGs. Compare first/last frame alignment in capture
   and output; images must preserve their original aspect ratios.
6. Disable a test design as Admin. Refresh public selection: it disappears.
   Open its old custom camera URL: it must offer recovery, without a capture
   session or silent built-in replacement. Re-enable and verify availability.
7. Delete only a disposable test design. Its old URL must recover, while completed
   private strips remain downloadable. An unknown/deleted custom name should
   display **Custom Birthday Design**. A wrong-format UUID must be rejected.
8. Verify individual failed/expired previews have reload controls, and template
   download/render failures offer retry without clearing captured photos.

## Custom slots, final metadata, and privacy

1. As Admin, verify **four total custom rows per format**, including inactive rows,
   block a fifth upload **before any Storage upload**. Disable one: its slot stays
   occupied. Delete one: the count decreases and a new upload becomes available.
   Avoid simultaneous uploads: the browser count is not an atomic server quota.
2. In the trusted Supabase Dashboard, verify each intentional Result save creates
   one final flattened PNG and one metadata row. No raw photos, intermediate
   filters, thumbnails, or second template copy should be uploaded. Check exact
   dimensions, built-in ID or custom UUID text `design_id`, and chosen `filter_id`.
3. Log in as Ayesa. Verify overview/inbox/read-state behavior, gallery proportions,
   custom design name and filter label, detail preview, and original PNG download.
   Repeat the shared galleries/messages and template management as Admin.
   Legacy rows without a filter in test fixtures should display **Original**.
4. Refresh private pages; verify metadata/read-state persistence. Log out and
   open every Ayesa/Admin route: private content must disappear and guests must
   be sent to login. Wrong-role accounts must go to their own area.
5. Verify **`template-designs` and `photostrips` remain private**, RLS remains
   enabled, guest template access is limited to active matching template artwork,
   and guests cannot read other guests' photos/messages or mutate templates.
   Review [Phase 10 permission requirements](supabase-setup.md#phase-10-hybrid-template-and-filter-permissions)
   in the trusted Dashboard; client format filters alone are not authorization.
6. Check keyboard selection, visible filter state, dialog Tab/Escape/focus return,
   reduced motion, no horizontal page overflow, and no browser console errors.
   Recheck homepage/welcome, message submission, real-camera permission errors,
   front/rear switching, mirroring, and stream cleanup where hardware is available.

If a live operation fails due to RLS, stop that check and report **operation,
table/bucket, error code/status, and sanitized message**. Keep checks that need
the scoped permission pending until it is fixed manually. Do not publish a
bucket, disable RLS, use privileged keys, or grant unrestricted access.
