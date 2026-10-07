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
npm run lint        # Run the existing Oxlint checks
```

## Public pages

- `/`: responsive birthday landing page, welcome dialog, and navigation CTAs.
- `/photobooth`: format selection with exactly three CSS layout previews.
- `/photobooth/designs`: four compatible mock designs for the selected format.
- `/photobooth/camera`: explicit permission and immediate capture inside the selected design.
- `/photobooth/result`: four confirmed photos and a Phase 4 generation placeholder.
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
unmounts. Leaving the photobooth for Home/messages clears the session. Nothing
is uploaded, logged, or stored in localStorage. Refresh clears the photos; the
result route recovers to the camera with a readable explanation.

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

## Structure

```text
src/
  App.jsx                 Routes, welcome state, and in-memory photo session
  main.jsx                React entry point and BrowserRouter
  components/             Layout, selection, live composition, and photo inspector
  hooks/                  MediaStream lifecycle and photo-session URL cleanup
  data/                   Central format and placeholder design configuration
  pages/                  Public pages, selection, camera, and result-ready flow
  styles/                 Global, landing, photobooth, and camera styles
  utils/                  Navigation and offscreen individual-frame capture
  assets/                 Reserved for future custom birthday images
public/
  favicon.svg             Original bow favicon
```

Custom birthday images can replace the three labeled homepage placeholders
later; see `src/assets/README.md`. All current decorations are original CSS shapes
and simple line icons, with no copyrighted character artwork or external assets.

Final Canvas photostrip generation, PNG generation, downloading,
message submission, uploads, backend integration, authentication, and dashboards
are reserved for later phases. Phase 3 captures only individual camera frames,
kept entirely inside the browser session.

## Future hosting

Deployment is outside these phases. Since this project uses `BrowserRouter`, a future
host must serve `index.html` for frontend routes such as `/photobooth` and
`/messages`. GitHub Pages will need an appropriate route fallback or a separately
planned routing adjustment. Keep secrets in ignored `.env` files when backend
work is explicitly requested.
