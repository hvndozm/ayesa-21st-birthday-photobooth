# Revised Phase 10 implementation

Phase 10 adds custom transparent PNG designs and a local Filter step to the
existing birthday photobooth. The four built-in designs remain permanent local
designs, with their IDs, selection/capture styling, and Canvas decorations intact.
No dependencies, schema, RLS policies, bucket settings, or deployment configuration
were changed.

## Design and capture

The central resolver in `photoboothDesigns.js` distinguishes built-in designs from
custom UUIDs. Each selected format shows four built-ins plus at most four active
custom rows from `photostrip_designs`. Queries select only necessary columns,
filter by the selected format and active status, and limit custom results to four.
An empty or unavailable custom catalog leaves built-ins usable.

Custom selection previews place neutral photo blocks behind the uploaded PNG.
Previews use private 600-second signed URLs, with retry/renewal. Camera entry
independently verifies the custom UUID exists, is active, and matches the format,
then downloads and validates the original private PNG. Missing, inactive, deleted,
wrong-format, and failed designs recover without substituting a built-in.

The live original PNG is a foreground overlay with `pointer-events: none`.
Photo windows use percentages derived from the unchanged centralized Canvas
rectangles in `photoboothFormats.js`. Custom composition has no padding/border
offset, and retake controls remain above the overlay. Built-in capture uses its
existing CSS composition.

Admin counts all active and inactive custom rows for the selected format. Both
the upload dialog and service check the four-slot limit before Storage upload;
deleting a custom record frees a slot. PNG signature, MIME, 10 MB maximum, decoded
dimensions, duplicate checking, original-byte upload, and scoped rollback remain.
This is a frontend preflight, not an atomic quota across simultaneous Admin tabs.

## Filters and final output

`/photobooth/filter` follows four-photo capture and precedes Result. Format,
design, and development mock mode stay in query parameters; photographs and
original template Blobs remain in memory.

The five IDs are `original`, `blurry`, `digicam`, `polaroid`, and `mono`.
Original uses the prior direct cover-crop path. Blurry adds mild blended softening
and gentle brightness; Digicam adds restrained contrast/saturation, a cool cast,
and digital grain; Polaroid warms/fades/lifts photographs; Mono makes equal RGB
grayscale. Grain is deterministic. Native Canvas processes each photograph in
cooperative chunks, then draws unfiltered built-in decorations or the original
custom overlay last.

App owns one active full-resolution generated PNG. Filter changes cancel older
work and release obsolete URLs. Generation signals prevent rapid A → B → A
changes from reviving revoked outputs or stale custom metadata. Continue waits
until the current preview has loaded. Result receives that exact confirmed
Blob and URL, including native download and private save; an unconfirmed Result
URL returns to Filter.

Output sizes remain **600×1800**, **1800×1200**, and **1200×1800**. Retakes retain
selection and the other photos, reset Original when photos change, and release
replaced source URLs. Home/Take Another releases the session/output resources.
Refresh recovery offers Return to Camera with the selected IDs/mock flag.

Only Result starts the final flattened PNG upload. Save coordination includes
the immutable photo set, format, design, and filter, preventing repeated saves
of unchanged selections. New rows include validated `filter_id`. Private
galleries show a subtle filter label, defaulting legacy data to Original.
Custom UUID names resolve in one authorized metadata batch per page, including
inactive records where permitted; deleted or restricted metadata uses
**Custom Birthday Design** and leaves the stored PNG independent.

## Verification completed

- **156 automated tests passed**, including existing auth/messages/private-save
  tests and new catalog, quota, filtering, renderer, geometry, metadata, and
  resource-release coverage.
- **`npm.cmd run build` passed**. Oxlint exits successfully with three existing
  warnings in the photo-session/save hooks and capture-page ref synchronization.
- Browser checks covered all **12 built-in format/design combinations × 5
  filters**. Original PNG bytes match the previous committed renderer for every
  combination. Mono photographs are grayscale while artwork pixels stay colored.
- Built-in Filter/Result/download/upload use matching final bytes. Native PNG
  downloads were checked for all three dimensions; unchanged retakes do not
  duplicate uploads; Home releases all generated/source object URLs.
- Isolated browser fixtures using the real Supabase SDK and real transparent PNGs
  covered custom catalog, private signing/download, camera overlay alignment,
  all five filters in all three formats, identical final upload bytes,
  custom names/filter labels, inactive/deleted/wrong-format recovery, fifth-upload
  prevention, and deletion freeing a slot.
- Layouts were checked at **320, 375, 390, 430, 768, and 1280 px** without
  horizontal page overflow. Camera regression checked individual retakes and
  native getUserMedia capture with a browser fake device, including stream cleanup.
- Recovery checks covered separate-task rapid filter/custom route changes,
  preview failure/retry, manual Original selection, keyboard filter selection,
  reduced motion, and unconfirmed direct Result navigation without a save.
- Final public smoke covered Welcome → Format → every built-in selection →
  four mock captures → Filter, trailing-slash preview retention, and refresh
  recovery. Native media with synthetic facing metadata verified front/rear
  switching, mirrored front/unmirrored rear previews, permission-error recovery,
  and stream release on both switching and navigation.
- Corrected custom gallery fixtures served the exact saved PNG bytes and
  verified natural dimensions for all three formats, names, and Mono labels.
- A **real anonymous guest** scoped active 2x6 template query succeeded (HTTP 200)
  and returned zero visible custom rows. Built-ins remained available.
- A **real final Mono PNG** saved successfully to private photostrips Storage
  (HTTP 200), with metadata INSERT (HTTP 201), correct `filter_id: mono`, exact
  dimensions, and the same SHA-256 as the Filter preview. No raw images uploaded.
- All seven real guest private-route guards redirected to login without fetching
  private collection data. No live RLS failure occurred during these checks.
- Source review found no public-URL API, privileged key, authentication bypass,
  or change to bucket/RLS settings. Environment files remain ignored.

- Complete Ayesa and Admin fixture regressions passed: overview HEAD counts,
  independent retries, 50-letter/24-memory pagination, plain-text messages,
  read-state persistence/count updates, gallery previews/original downloads,
  legacy Original labels, empty/error recovery, logout/session/wrong-role guards,
  dialog Escape/focus, reduced motion, and all requested viewport widths.
  These successful suites reported zero console errors. Fixtures do not certify
  deployed private-account permissions.

## Remaining manual live checks

Use [the complete manual checklist](phase-10-verification.md), which includes
the requested Sweet Bow mock sequence, Admin custom upload/logout/guest capture,
Ayesa gallery name/filter review, and all three formats.

The real project returned no active custom rows during the guest check, so real
custom signing/download, real Admin uploads/deletion, and real Ayesa custom-name
access still need verification with the owner's accounts and artwork. Verify
both private bucket flags and scoped deployed policies in the trusted Dashboard.
Physical phone front/rear cameras, permission UI, and real portrait filter
appearance should also be checked on hardware. No credentials are required in
chat, and no production deployment was started.

## Files created

```text
docs/phase-10-verification.md
src/components/CustomDesignPreview.jsx
src/components/GeneratedPhotostripPreview.jsx
src/components/MissingPhotos.jsx
src/data/photoboothDesigns.js
src/data/photoboothFilters.js
src/hooks/usePublicDesigns.js
src/hooks/useSelectedBoothDesign.js
src/pages/FilterPage.jsx
src/services/publicDesignService.js
src/styles/filters.css
src/utils/frameGeometry.js
src/utils/photoSessionSelection.js
src/utils/photoboothFilterProcessing.js
tests/photoSessionSelection.test.js
tests/photoboothFilters.test.js
tests/photostripRenderer.test.js
tests/publicDesignService.test.js
docs/phase-10-implementation.md
```

## Files modified

```text
README.md
docs/supabase-setup.md
docs/template-artwork.md
public/templates/README.md
src/App.jsx
src/components/BirthdayMemoryDialog.jsx
src/components/BoothSteps.jsx
src/components/CaptureComposition.jsx
src/components/DesignCard.jsx
src/components/PrivateMemoryPreview.jsx
src/components/PrivatePhotostripGallery.jsx
src/components/TemplateUploadDialog.jsx
src/hooks/useGeneratedPhotostrip.js
src/pages/AdminDesignsPage.jsx
src/pages/CameraPage.jsx
src/pages/DesignSelectionPage.jsx
src/pages/PhotoboothPage.jsx
src/pages/ResultReadyPage.jsx
src/services/photostripSaveCoordinator.js
src/services/photostripStorage.js
src/services/privateDashboardService.js
src/services/templateDesignService.js
src/styles/photobooth.css
src/utils/birthdayDashboard.js
src/utils/canvasImageUtils.js
src/utils/photostripRenderer.js
src/utils/templateManagement.js
tests/photostripSaveCoordinator.test.js
tests/photostripStorage.test.js
tests/privateDashboardService.test.js
tests/templateDesignService.test.js
```

