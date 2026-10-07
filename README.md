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

## Phase 1

- `/`: responsive birthday landing page, welcome dialog, and navigation CTAs.
- `/photobooth`: coming-soon page with static previews of the three planned formats.
- `/messages`: coming-soon page for future private birthday wishes.
- Unknown paths show a friendly page with a link home.

The welcome dialog appears on the first homepage visit in each app load. It can
be dismissed using Escape, the close button, or “Let me look around first.”
“Start Photobooth” dismisses it and navigates to `/photobooth`. Returning home
does not reopen it; reloading starts a new welcome experience.

The native dialog contains keyboard focus, prevents interaction with the page
behind it, and restores focus when dismissed. Navigation provides active-link
indicators, a skip link, and focus management. Animations respect reduced motion.

## Structure

```text
src/
  App.jsx                 Routes and welcome state
  main.jsx                React entry point and BrowserRouter
  components/             Shared layout, links, icons, dialog, and CSS artwork
  pages/                  Home, photobooth, messages, and not-found pages
  styles/                 Global styles and responsive site styles
  assets/                 Reserved for future custom birthday images
public/
  favicon.svg             Original bow favicon
```

Custom birthday images can replace the three labeled homepage placeholders
later; see `src/assets/README.md`. All current decorations are original CSS shapes
and simple line icons, with no copyrighted character artwork or external assets.

Camera access, format/design selection, Canvas generation, downloading,
message submission, uploads, backend integration, authentication, and dashboards
are reserved for later phases. This phase collects or saves no guest data.

## Future hosting

Deployment is outside Phase 1. Since this project uses `BrowserRouter`, a future
host must serve `index.html` for frontend routes such as `/photobooth` and
`/messages`. GitHub Pages will need an appropriate route fallback or a separately
planned routing adjustment. Keep secrets in ignored `.env` files when backend
work is explicitly requested.
