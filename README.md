# Ayesa’s 21st Birthday Photobooth

A birthday gift for Lyann Ayesa P. Barranta (Ayesa / Eley), built with React,
Vite, JavaScript, React Router, and plain CSS.

## Run locally

Use Node.js 20.19+ or 22.12+, as required by this project's Vite version.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.
On Windows PowerShell, if execution policy blocks `npm`, use `npm.cmd install`
and `npm.cmd run dev` instead.

```sh
npm run build       # Build the production frontend into dist/
npm run preview     # Serve the production build locally
npm test            # Check layouts, cropping, and private-save behavior
npm run lint        # Run the existing Oxlint checks
```

## Public pages

- `/`: responsive birthday landing page, welcome dialog, and navigation CTAs.
- `/photobooth`: format selection with exactly three CSS layout previews.
- `/photobooth/designs`: four compatible mock designs for the selected format.
- `/photobooth/camera`: explicit permission and immediate capture inside the selected design.
- `/photobooth/result`: full-resolution Canvas photostrip preview and PNG download.
- `/messages`: private birthday-message submission, with nickname and letter.
- `/ayesa/login` and `/admin/login`: private email/password entrances.
- `/ayesa`: Ayesa's private overview with live letter/unread/memory counts.
- `/ayesa/messages`: private letter inbox, read status, and All/Unread/Read filters.
- `/ayesa/gallery`: private birthday album, larger previews, and original PNG downloads.
- `/admin`: Admin overview with live message, photostrip, and template counts.
- `/admin/messages` and `/admin/gallery`: private reading and original PNG downloads.
- `/admin/designs`: private template upload, preview, Enable/Disable, and confirmed deletion.
- Unknown paths show a friendly page with a link home.

The welcome dialog appears on the first homepage visit in each app load. It can
be dismissed using Escape, the close button, or “Let me look around first.”
“Start Photobooth” dismisses it and navigates to `/photobooth`. Returning home
does not reopen it; reloading starts a new welcome experience.

The native dialog contains keyboard focus, prevents interaction with the page
behind it, and restores focus when dismissed. Navigation provides active-link
indicators, a skip link, and focus management. Animations respect reduced motion.

## Phase 2 selection flow

Start Photobooth → Choose a format → Choose a Design → Continue to Camera.
The last step opens the Phase 3 camera introduction with your selected format
and mock design intact.

Selections live in URL query parameters, with no shared state library or storage:

```text
/photobooth?format=2x6
/photobooth/designs?format=2x6&design=2x6-sweet-bow
/photobooth/camera?format=2x6&design=2x6-sweet-bow
```

Selecting a card replaces the current URL entry, so Back does not step through
every card tap. Refresh preserves valid selections. Back to Designs and Back
to Formats carry both compatible IDs; changing the format clears incompatible
designs. Browser Back retains the selected format from the previous step.

Missing or invalid formats on design/camera URLs redirect to format selection.
A missing, unknown, or incompatible design on the camera URL redirects to the
selected format's design page. Invalid selections on a selection page leave
the continue button disabled and show a recovery hint.

Format metadata, including physical dimensions, target canvas dimensions, and
layout identifiers, lives in `src/data/photoboothFormats.js`. The twelve mock
design records (four for each format) live in `src/data/placeholderDesigns.js`.
Previews use CSS and the configured aspect ratios, with no image generation.

Selection cards are native keyboard-accessible buttons with `aria-pressed`,
visible checks, selected labels, and focus outlines. The step indicator marks
the current step with `aria-current="step"`; a live summary announces selections.

## Phase 3 camera flow

Press **Open Camera** to request video access (no microphone access). Nothing
requests camera permission on mount. HTTPS or localhost is required by the
browser; a phone visiting a plain HTTP LAN address may not have camera access.

The selected CSS design surrounds all four frames throughout capture. Only the
active frame contains a live video, clipped with `object-fit: cover`. Each
**Take Photo N** press captures one frame immediately, with no countdown or
capture timer. The image stays in that slot and the live preview moves to the
first empty slot. The shutter briefly disables while its JPEG Blob is encoded.

Each captured frame has a **Retake Photo N** arrow. It clears only that slot,
revokes its old object URL, and makes it active; other photos stay intact. Tap
a captured image for a closer look. After four photos, the same composition
remains on screen with retake controls and **Use These Photos**. Confirmation
navigates to `/photobooth/result` with the same format/design parameters. There
is no automatic navigation or separate review screen.

The camera hook starts only on explicit actions, stops the old stream before
switching, and releases all tracks on confirmation, close, hidden tabs, and unmount.
The stream can stay running after Photo 4 so retakes reuse it without reopening.
Pending permission requests are checked against a request ID; streams that
arrive after cancellation or navigation are immediately stopped. Returning to
a hidden/paused camera requires another **Open Camera** action.

Front-camera preview mirroring uses CSS, and capture applies the same horizontal
mirror once to the saved pixels. Rear-camera frames remain unmirrored. Captures
use the actual videoWidth/videoHeight and one high-quality JPEG Blob. The photo
metadata includes `mirrored` and `orientationApplied: true`; Phase 4 should draw
the stored pixels as-is, without applying another mirror. Desktop devices without
facing-mode metadata use a different enumerated device when switching is available.
A single-camera device remains fully usable.

Photos are held in React state above the camera/result routes, as Blobs with
object URLs and dimensions. Retakes replace one array entry; superseded object
URLs are revoked. URLs are also revoked when the session is cleared or the app
unmounts. Leaving the photobooth for Home/messages clears the session. The four
source photos are never uploaded, logged, or stored in localStorage. Phase 5
saves a private copy of the final PNG only. Refresh clears the local photos; the
result route shows a friendly recovery message and a Return to Photobooth link
that retains the selected format and design.

### Development mock camera

Run `npm run dev`, then explicitly visit:

```text
http://localhost:5173/photobooth/camera?format=2x6&design=2x6-sweet-bow&mockCamera=true
```

This displays **Development Mock Camera**, creates labeled placeholder frames,
and uses the exact same composition, immediate shutter, slot progression,
individual retakes, and confirmation. Each slot has a distinct pastel image
labeled “Mock Photo N” and a capture number. It never activates automatically
and does not call getUserMedia.
The query flag is ignored in production (`import.meta.env.DEV` gates the mode).
Mock generation is isolated in `cameraCapture.js` and can be removed later.

## Phase 4 photostrip generation

After **Use These Photos**, the result page decodes all four captured Blobs and
renders a new Canvas at the configured full resolution. The on-screen image is
the resulting PNG, scaled with CSS; its displayed size never changes the export.
All processing remains inside the browser.

The standard rectangles are in `src/data/photoboothFormats.js`. Coordinates are
pixels, in Photo 1 → Photo 4 order (left-to-right, then top-to-bottom for grids):

| Format | PNG size | Frame size | Photo origins `(x, y)` |
| --- | --- | --- | --- |
| 2x6 | 600 × 1800 | 500 × 355 | (50, 150), (50, 530), (50, 910), (50, 1290) |
| 6x4 | 1800 × 1200 | 750 × 500 | (130, 80), (920, 80), (130, 620), (920, 620) |
| 4x6 | 1200 × 1800 | 500 × 667 | (80, 180), (620, 180), (80, 887), (620, 887) |

`canvasImageUtils.js` calculates a centered source crop with the destination's
aspect ratio, then uses the nine-argument `drawImage` API. Photos fill their
frames without stretching. Phase 3 already stores selfie orientation in the
pixels; the renderer never mirrors them again.

`photostripRenderer.js` draws the design background, the four photos, then the
foreground. The design data includes Canvas colors and pattern metadata:
Sweet Bow uses blush dots and bows; Birthday Sparkle uses a cream/gold gradient
and sparkles; Lavender Dream uses lavender dots and clouds; Love Letter uses
rosy lines and hearts. Borders, artwork, and birthday text stay in the margins.

Each design exposes an optional `overlaySrc`. When present, the renderer loads
that image and draws it over the photos at `(0, 0)`, scaled to the exact canvas
dimensions, instead of the placeholder foreground. Transparent windows reveal
the photographs below. See `public/templates/README.md` for the PNG standard.
No real template files are needed for the current designs.

**Download PNG** is a native link to the final Blob URL, with a filename such as
`ayesa-21st-2x6-sweet-bow.png`. The URL remains valid while the result page is
open. A phone browser can download the PNG or open it for saving; no filesystem
path or Web Share API is required. **Retake Photos** preserves the captured
session and camera query. **Take Another** clears it and starts at `/photobooth`;
**Home** returns to `/` and clears the session through the existing hook.

The result hook owns its generated URL and revokes it on replacement or unmount.
The renderer uses temporary URLs for retained Blobs, releases them after export
or failure, and cancels image loading when the result page leaves. It never
revokes the camera session's URLs. Pending results are discarded after leaving;
partial image-load failures also release every successfully loaded resource.

Loading and error states announce progress, keep Download hidden until ready,
and offer Retry and a route back to the camera. Refresh without four photos
shows recovery instead of attempting to render an empty session. No raw image
data is stored in localStorage or IndexedDB.

For an end-to-end test without hardware, use the development mock camera URL
above, take four photos, confirm, and download. Mock photos use the same renderer
and produce a real PNG at the dimensions in the table. Dimensions are shown
quietly on the result page in development only.

## Phase 5 private birthday-gallery copy

The completed PNG Blob also goes to Supabase after generation. Local preview
and **Download PNG** work independently of gallery saving, including offline,
missing configuration, rejected permissions, and network failures. No login or
public gallery is shown to guests.

Configure these variables in ignored `.env.local`, using your own project's
publishable browser key. `.env.example` contains blank variable names only:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never put a secret key, service-role key, or database password in a `VITE_`
variable. The shared client loads lazily through auth/services; Phase 7 resolves
an existing session in the background on app startup. Guest saving still starts
only after the final PNG exists. Missing/invalid configuration reports gallery
saving unavailable while keeping the local photobooth usable. Restart Vite after
changing local configuration.

The save service reuses the browser's current Supabase session, including any
future permanent session. Only when there is no session does it sign in
anonymously, without guest-facing account UI. Concurrent session requests share
one initialization. The SDK persists/refreshes its authentication session;
photos and PNGs are not persisted in browser storage. No sign-out occurs after
saving.

Only one final PNG is uploaded to private bucket `photostrips`, at
`<authenticated-user-uuid>/<random-uuid>.png`, with `image/png` and
`upsert: false`. After successful upload, the service inserts `owner_id`,
`storage_path`, `format_id`, `design_id`, `width`, and `height` into
`public.photostrips`. Database defaults handle `created_at`. It requests no
public URL, gallery listing, or metadata SELECT.

A weakly keyed save record identifies the current immutable photo set and
format/design. StrictMode effects, status updates, repeated renders, and
returning from the camera without editing photos share the same pending or
completed save. A definite failure retries only through **Try Again**; changing
an individual photo creates a new result eligible for a new gallery copy.

For a definite metadata rejection after upload, the service attempts to delete
only the just-uploaded object. Cleanup needs appropriately scoped Storage
permissions and must be verified in the Dashboard. Network requests and service
stages are bounded, with no infinite save retry. When a write's response is lost,
its outcome may be unknown: the UI keeps Download available, reports that the
gallery copy could not be confirmed, and avoids a blind duplicate retry or
destructive cleanup of a possibly successful insert. Check the Dashboard before
repeating that result. This frontend guard is not a cross-device transaction.

A short notice before capture explains the private gallery copy. The result
shows saving, success, unavailable, or failure status without replacing the
finished image or Download action. Mock-camera PNGs follow the same upload path
as real-camera PNGs; use generated test images for development verification.

See [Supabase setup and verification](docs/supabase-setup.md) for required
resources, owner-scoped policy requirements, and manual Dashboard checks. No
database/Storage policies are created or weakened by the application.

## Phase 6 private birthday messages

The homepage's message CTA opens `/messages`. Guests deliberately provide a
nickname and birthday letter. Both fields are required, trimmed before saving,
and validated before any backend work: nickname 1–40 characters, message
1–2,000 characters. Native `maxLength` controls and a quiet letter counter help
with the limits. The service repeats validation; database CHECK constraints
remain the final enforcement layer.

Message sending uses the same lazy Supabase client and Phase 5
`ensureGuestSession` helper, without refactoring photostrip saving. Existing
anonymous or permanent sessions are reused, and missing sessions share the same
anonymous initialization. There is no login UI or sign-out after sending.

An explicit form submission inserts only `owner_id`, trimmed `nickname`, trimmed
`message`, and `is_read: false` into `public.birthday_messages`. Database defaults
generate `id` and `created_at`. There is no `.select()` after insertion and no
message query, feed, count, editing, or deletion. Letters remain plain text;
the app neither renders submitted HTML nor interprets Markdown.

A synchronous in-flight guard blocks repeated clicks before React disables the
button. Sending runs only from the form event, never an effect or automatic
retry. Success replaces the form with a thank-you and Back Home/Send Another
Message actions. Sending another deliberately clears the fields. Errors keep
both fields intact and offer Try Again. If a network response was lost, the UI
explains that retrying might send the message twice. Requests and module loading
are bounded; no background queue or local message persistence is implemented.

Missing configuration reports messages temporarily unavailable without affecting
the rest of the site. Labels, field-associated errors, live statuses, focus
management, mobile input sizes, and reduced-motion support keep the flow usable.
See the setup document for the INSERT-only table policy and manual row checks.

## Phase 7 private authentication foundation

Ayesa/Admin accounts and their matching `public.profiles` rows are created
manually in Supabase. There is no public registration or login link in the
birthday navigation. Use the private URLs above directly. Phase 8 extends only
Ayesa's area; Phase 9 adds the real Admin management area.

`AuthProvider` shares a small in-memory controller through React context. It
resolves the existing SDK session on initialization, observes auth changes, and
loads only a permanent user's own `id, display_name, role` profile with an
owner-ID filter. Anonymous users have no application role and cause no profile
query. An explicit `is_anonymous: false` flag and valid user UUID are required
for private access; missing or invalid identity/profile/role information grants
no access. Roles come from profiles, never email, display name, URLs, or browser
storage. Same-user refresh events reuse the profile; a fresh app load derives
it again. An explicit retry reloads a failed or missing profile.

Profile reads run after the synchronous auth callback returns, following
[Supabase's callback guidance](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).
Revision checks and cancellation discard late responses after an account switch
or logout. StrictMode shares initialization and pending profile work; the auth
listener is removed when the provider is no longer used. Public pages do not
wait for auth initialization.

Both login forms call `signInWithPassword`; the loaded role determines the
destination regardless of which entrance was used. Wrong-role private routes
redirect to the user's own area. Unknown profiles get a friendly access denial.
While the session/profile is resolving, private routes show a loading card.
Passwords live only in the form input/request, are cleared after an attempt or
when the field leaves the page, and are never logged or persisted by the app.

Logout calls the SDK's `signOut` and returns to the appropriate private entrance.
It does not create an anonymous session or manually remove SDK storage entries.
Guest creation and private login/logout share a small operation queue, so an
older guest request cannot replace a permanent login. The existing Phase 5/6
helper still reuses any valid session and creates a guest only for an explicit
public save/send operation when no session exists.

React route guards protect navigation only. Database/Storage RLS remains the
security boundary, as described in the
[Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
No profile write, role selector, privileged key, or database/Storage policy
is added. See the setup document for own-profile permission requirements
and the manual checks for the two real private accounts.

## Structure

```text
src/
  App.jsx                 Routes, welcome state, and in-memory photo session
  main.jsx                React entry point and BrowserRouter
  components/             Layout, selection, live composition, and photo inspector
  hooks/                  Camera/session lifecycle, PNG ownership, and message sending
  auth/                   Shared auth state and private-role access decisions
  lib/                    Lazy publishable-key Supabase client
  services/               Private PNG/message saving and current-result save guard
  data/                   Central format and placeholder design configuration
  pages/                  Public pages, selection, camera, and result-ready flow
  styles/                 Global, landing, photobooth, camera, and result styles
  utils/                  Navigation, frame capture, crop math, and PNG renderer
  assets/                 Reserved for future custom birthday images
public/
  favicon.svg             Original bow favicon
  templates/README.md     Future transparent PNG template standard
```

Custom birthday images can replace the three labeled homepage placeholders
later; see `src/assets/README.md`. All current decorations are original CSS shapes
and simple line icons, with no copyrighted character artwork or external assets.

Ayesa's private inbox/gallery and Admin management use the existing role guard.
Guest selection and Canvas continue using local placeholder designs; uploaded
templates are not connected to that workflow until Phase 10.
Four source frames remain local; only the finished
PNG gets a private gallery copy. The guest can also save it using Download PNG.

## Phase 8 — Ayesa's birthday corner

All three Ayesa routes share the existing `ProtectedRoute` and a nested layout
with Overview/Letters/Gallery navigation and Logout. Admin is redirected to
`/admin`; guests go to `/ayesa/login`. Private pages are lazy-loaded. No new
authentication system or dependency is introduced.

`privateDashboardService.js` owns private queries. The overview uses three
exact HEAD counts (all messages, unread messages, photostrips), without loading
letters, gallery metadata, or images. Each card can fail/retry independently.
Counts stay in the route-scoped layout and update locally when a letter is read.

The inbox fetches only `id,nickname,message,is_read,created_at`, newest first,
50 at a time. All/Unread/Read filters query the whole corresponding collection;
Load More applies the same filter. Nicknames and letters render as plain React
text. Cards show short previews; opening a letter displays the complete text in
a native stationery dialog. An unread letter updates only `is_read: true` for
its ID. Returned `id,is_read` confirms the write; zero matched rows are a failure.
Success removes the badge, decreases the shared unread count, and removes the
letter from Unread without skipping the next pagination row. Failure leaves the
letter readable and unread, with a small Retry read status action.

The gallery fetches only needed metadata, 24 at a time. Batched
[`createSignedUrls`](https://supabase.com/docs/reference/javascript/storage-from-createsignedurls)
previews last 600 seconds, renew before expiry and when the tab becomes visible,
and remain in memory only. Missing previews have individual reload controls.
Images retain their original proportions through `object-fit: contain`;
format/design names come from the existing shared configuration.

The detail dialog's Download PNG uses authenticated
[`download`](https://supabase.com/docs/reference/javascript/storage-from-download)
from the private `photostrips` bucket. It downloads the original Blob without a
resize or UI capture, uses a friendly date/format filename, and releases temporary
object URLs. Download errors keep the dialog open with Retry Download PNG.

Native dialogs make the background inert, contain keyboard focus, close with
Escape, and restore focus. Read status has visible text, images have descriptive
alt text, and animation respects reduced motion. Requests are bounded; page
cleanup aborts/discards late responses. Session loss unmounts private content,
and an identity switch remounts the corner with fresh state.

`npm test` includes count, query/filter/pagination, confirmed read updates,
local read-state/offset, private signed preview, original download/error/timeout,
aspect-ratio label, cancellation, and role-guard checks. Real Supabase private
reads, persisted updates, original downloads, and deployed RLS/bucket settings
still require the real-account checklist in
[Supabase setup and verification](docs/supabase-setup.md#phase-8-private-dashboard-verification).

Phase 8 added these files:

```text
src/pages/AyesaDashboardLayout.jsx
src/pages/AyesaOverviewPage.jsx
src/pages/AyesaMessagesPage.jsx
src/pages/AyesaGalleryPage.jsx
src/components/BirthdayDialog.jsx
src/components/BirthdayLetterDialog.jsx
src/components/BirthdayMemoryDialog.jsx
src/components/PrivateDataState.jsx
src/components/PrivateMemoryPreview.jsx
src/hooks/usePrivateResource.js
src/hooks/usePrivateCollection.js
src/hooks/usePrivatePreviews.js
src/services/privateDashboardService.js
src/utils/birthdayDashboard.js
src/styles/birthday-dashboard.css
tests/privateDashboardService.test.js
```

Modified files: `src/App.jsx`, this README, and `docs/supabase-setup.md`.
In Phase 8, the existing auth/controller/client, guest services, camera, Canvas,
and Admin placeholder remained unchanged. No package or environment change was
needed. Phase 9 replaces that Admin placeholder as described below.

Phase 8 verification: 88 Node tests pass and the production build passes.
Headless Chrome checks used simulated private sessions/API responses to exercise
counts, pagination, filters, full letters/read updates and retries, preview
failures/renewal, mixed aspect ratios, an original 600×1800 PNG download/retry,
empty/error states, logout/session loss, keyboard focus, and reduced motion at
320/375/390/430/768/1280 pixels. No browser console errors were observed. Live
anonymous guest smoke checks successfully saved/downloaded a final strip and
submitted one message without duplicate requests. Mock retakes preserved the
other frames; the native camera path was checked with a simulated media device
and stopped its tracks on navigation. Real private-account/RLS/bucket verification
remains manual; these checks do not certify the deployed Supabase policies.

## Phase 9 — Admin dashboard and template management

`/admin`, `/admin/messages`, `/admin/gallery`, and `/admin/designs` are nested
behind the existing strict Admin role guard. Ayesa redirects to her own area;
guests redirect to `/admin/login`. Identity changes remount the private layout,
and session loss removes its data/dialogs. Auth and the shared Supabase client
are unchanged. No package, environment, policy, or bucket setting is changed.

The Admin overview uses five exact HEAD counts: total/unread letters, total
photostrips, and total/active templates. Cards load and retry independently.
`PrivateMessageInbox` and `PrivatePhotostripGallery` share Phase 8's data,
pagination, read-state updates, signed previews, dialogs, and original downloads.
Thin Ayesa/Admin page wrappers keep each area's headings separate. Message pages
load 50 letters; both galleries and template management load 24 items at a time.
All use Load More.

`templateDesignService` reads only needed `photostrip_designs` fields and manages
template mutations. PNG validation checks extension/MIME, size ≤10 MB, PNG
signature/IHDR, successful browser decoding, and exact configured dimensions:
600×1800, 1800×1200, or 1200×1800. Validation repeats at the service boundary
before session/network work; artwork is never resized. Transparency is explained
and shown over a checkerboard rather than scanned pixel by pixel. Local preview
URLs are released on replacement, format changes, form close, successful upload,
and unmount.

Upload verifies a current permanent Admin session/profile, checks same-format
slug duplicates, then uses private
[`upload`](https://supabase.com/docs/reference/javascript/storage-from-upload)
with `<format>/<random-uuid>.png`, `contentType: image/png`, and `upsert: false`.
Metadata insertion sends only `name,slug,format_id,storage_path,is_active:true,
created_by`. The database generates ID/time. A definite insertion rejection
attempts single-file cleanup. Cleanup failures are reported; uncertain writes
preserve files and block blind form resubmission for manual review.

Template previews reuse batched 600-second signing, renewal, and individual
reload controls. Enable/Disable updates only `is_active`, confirms the returned
row, and updates local cards/counts. Delete opens a native accessible confirmation,
re-reads the selected row, validates its format/UUID path, uses
[`remove`](https://supabase.com/docs/reference/javascript/storage-from-remove)
for exactly one template object, then removes the matching metadata row.
Storage failure preserves metadata; a later metadata failure offers retry that
skips confirmed file removal while its progress remains in memory. Recovery after
a full browser refresh is documented in [template artwork](docs/template-artwork.md).
No guest-photostrip/message deletion is implemented.

The public selection config, its stable guest design IDs, camera flow, and
Canvas renderer remain unchanged. Uploaded templates do not participate in the
guest workflow yet. No Phase 10 integration is included.

Created files:

```text
src/pages/AdminDashboardLayout.jsx
src/pages/AdminOverviewPage.jsx
src/pages/AdminMessagesPage.jsx
src/pages/AdminGalleryPage.jsx
src/pages/AdminDesignsPage.jsx
src/components/PrivateMessageInbox.jsx
src/components/PrivatePhotostripGallery.jsx
src/components/TemplateUploadDialog.jsx
src/components/TemplateDesignCard.jsx
src/components/TemplatePreview.jsx
src/components/TemplateDeleteDialog.jsx
src/hooks/useTemplateFile.js
src/services/templateDesignService.js
src/utils/templateValidation.js
src/utils/templateManagement.js
src/styles/admin.css
tests/templateDesignService.test.js
docs/template-artwork.md
```

Modified: `src/App.jsx`, both Ayesa inbox/gallery wrappers, `BirthdayDialog.jsx`,
`usePrivatePreviews.js`, `privateDashboardService.js`, the existing dashboard
service tests, this README, the Supabase guide, and `public/templates/README.md`.
The unused Phase 7 `PrivateDashboardPage.jsx` placeholder is retired.

Real Admin upload/toggle/delete permissions, metadata persistence, original
downloads, and both private-bucket settings require the
[real Admin checklist](docs/supabase-setup.md#real-admin-checklist). Automated
private browser checks use simulated sessions/API responses; no real permanent
credentials are requested or used.

Phase 9 verification: all 115 Node tests pass and `npm run build` passes.
Headless Chrome checked Admin counts, message/gallery reuse, upload validation
with actual PNG decoding, duplicate errors, original-file upload, metadata-failure
cleanup, local object-URL cleanup, private previews, toggle persistence, confirmed
single-file/row deletion and partial retry, empty/error states, and role denial
at 320/375/390/430/768/1280 pixels. The complete Phase 8 browser regression also
passed. Console errors were zero. Live anonymous guest saving/downloading and
message submission passed, creating one test strip and one test message; mock
retakes and the native camera path with a simulated media device also passed.
These results do not certify real Admin credentials, permissions, or bucket flags.

## Future hosting

Deployment is outside these phases. Since this project uses `BrowserRouter`, a future
host must serve `index.html` for frontend routes such as `/photobooth` and
`/messages`. GitHub Pages will need an appropriate route fallback or a separately
planned routing adjustment. Keep secrets in ignored `.env` files when backend
work is explicitly requested.
