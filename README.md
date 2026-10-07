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
- `/photobooth/camera`: selection confirmation and a camera-ready placeholder.
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
The last step confirms the selected format and mock design; photo taking is
reserved for the next phase.

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

## Structure

```text
src/
  App.jsx                 Routes and welcome state
  main.jsx                React entry point and BrowserRouter
  components/             Layout, dialog, selection cards, progress, and previews
  data/                   Central format and placeholder design configuration
  pages/                  Public pages and the three-step photobooth flow
  styles/                 Global, landing, and scoped photobooth styles
  utils/                  URL query construction for selection navigation
  assets/                 Reserved for future custom birthday images
public/
  favicon.svg             Original bow favicon
```

Custom birthday images can replace the three labeled homepage placeholders
later; see `src/assets/README.md`. All current decorations are original CSS shapes
and simple line icons, with no copyrighted character artwork or external assets.

Camera access, photo capture, Canvas generation, downloading,
message submission, uploads, backend integration, authentication, and dashboards
are reserved for later phases. The frontend collects no photos or messages.

## Future hosting

Deployment is outside these phases. Since this project uses `BrowserRouter`, a future
host must serve `index.html` for frontend routes such as `/photobooth` and
`/messages`. GitHub Pages will need an appropriate route fallback or a separately
planned routing adjustment. Keep secrets in ignored `.env` files when backend
work is explicitly requested.
