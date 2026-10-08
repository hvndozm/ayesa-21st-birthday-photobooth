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
- `/messages`: coming-soon page for future private birthday wishes.
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
variable. The client loads lazily when a final result needs saving; missing or
invalid configuration reports gallery saving unavailable while keeping the
local photobooth usable. Restart Vite after changing local configuration.

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

## Structure

```text
src/
  App.jsx                 Routes, welcome state, and in-memory photo session
  main.jsx                React entry point and BrowserRouter
  components/             Layout, selection, live composition, and photo inspector
  hooks/                  Camera/session lifecycle and generated-PNG ownership
  lib/                    Lazy publishable-key Supabase client
  services/               Private PNG saving and current-result save guard
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

Message submission, template uploads, permanent login UI, and dashboards are
reserved for later phases. Four source frames remain local; only the finished
PNG gets a private gallery copy. The guest can also save it using Download PNG.

## Future hosting

Deployment is outside these phases. Since this project uses `BrowserRouter`, a future
host must serve `index.html` for frontend routes such as `/photobooth` and
`/messages`. GitHub Pages will need an appropriate route fallback or a separately
planned routing adjustment. Keep secrets in ignored `.env` files when backend
work is explicitly requested.
