# Phase 11 production-readiness report

The repository is prepared for the owner's Vercel deployment. Phase 1–10
functionality remains on React, Vite, React Router, Supabase, plain CSS, and native
browser APIs. No hosting deployment, remote cleanup, schema/policy change, or
credential-based account administration was performed. The owner's pre-existing
AGENTS.md changes were preserved.

## Production changes

- Root `vercel.json` uses the requested `/(.*)` → `/index.html` rewrite. It
  serves the SPA entry without an HTTP redirect or custom server. React Router
  still applies selection recovery and private role guards. See
  [Vercel's Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite).
- A shared mock-mode predicate now keeps the route/session decision consistent.
  Production requires real camera capture even with `mockCamera=true`; local
  development retains the explicit mock tool. Existing hook/capture DEV checks
  remain defense in depth.
- A minimal application error boundary replaces blank screens after a rejected
  lazy route bundle or unexpected render error with friendly Reload/Home actions.
  It focuses the recovery main element and never displays/logs raw caught error
  details. Reload restores a valid private SDK session.
- Unexpected local PNG-read failures now receive fixed friendly copy. Known
  validation errors retain their useful format/type/size messages.
- Long custom names wrap in cards, selected summaries, and camera/filter/result
  labels. Result controls gain bottom safe-area spacing. Offscreen private gallery
  and Admin template card images use native lazy loading and async decoding;
  visible lightbox images remain eager.
- Package and lockfile metadata now require **Node 22.12+**, satisfying the
  installed Supabase (22+) and Vite requirements. Dependency versions are unchanged.
  Vercel resolves broad engine ranges to a supported version; review its chosen
  version in the build log. See
  [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Environment and security review

Production needs only these browser-side names:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Use the project's HTTPS URL and browser-safe publishable key. Vite embeds
`VITE_*` values at build time; never configure a service-role/secret key or
database password. The existing client rejects missing/invalid settings and
unsupported key types. Environment files remain ignored; `.env.example`
contains exactly the two blank entries. No tracked sensitive environment/private
key files were found. A targeted review of 227 historical Git blobs found only
deliberately invalid secret-key test fixtures, with no actual credential detected.

Source review confirmed:

- Private access requires a permanent session plus an owner-matched
  `profiles.role` of `ayesa` or `admin`. Cross-role redirects, logout,
  restored sessions, and stale-response protection remain.
- No public account-registration UI, public gallery, direct stored-role
  authorization, public-URL Storage API call, or raw diagnostic UI was added.
- Guests submit messages/final strips using INSERT without read-back. Raw camera
  photos/filter intermediates remain local. Only the final flattened PNG is saved.
- Private previews use short-lived signed URLs and original authenticated
  downloads. Both buckets are assumed **PRIVATE**; no bucket/RLS settings changed.
- Existing request deadlines, safe diagnostics, friendly failure/empty/loading
  states, and independent local PNG download remain.
- Camera tracks and captured/generated/custom-template URLs retain their existing
  cancellation, navigation, replacement, visibility, and unmount cleanup.

Actual deployed RLS, bucket flags, permanent accounts, and denied guest/private
operations must still be verified by the owner in the trusted Supabase Dashboard.
The four-custom limit remains a frontend preflight, not an atomic concurrent-upload
database quota. The launch guide preserves that limitation.

## Verification completed

- **162 automated tests passed**. Six new production tests cover SPA configuration,
  mock gating, compatible engine/lock metadata, actual Vite production compilation,
  missing production environment behavior, and unexpected PNG error sanitization.
- **`npm.cmd run build` passed**, producing the standard `dist/` output.
  Existing private route groups remain lazy. Main JS is about **353 kB
  (109 kB gzip)**, with the shared SDK about **216 kB (56 kB gzip)**; no new
  optimization framework or dependency was added.
- **Oxlint passed with three pre-existing warnings**: render-time ref
  synchronization in CameraPage and effect-driven state in usePhotoSession and
  usePhotostripGallerySave. No new warning was introduced.
- **`git diff --check` passed**.
- Compiled-production browser smoke checked all **16 server deep links**, preserved
  requested HTTP URLs, and normal JS/CSS/favicon asset responses. This local SPA
  check does not certify Vercel routing before an actual deployment.
- Production `mockCamera=true` was ignored. Four captures used native
  `getUserMedia` with a Chrome fake device; streams stopped on Filter.
  A separate real development-server check generated four mock photos and a
  ready Filter preview with **zero camera requests**.
- A deliberately blocked Admin route chunk showed the friendly focused fallback;
  Reload restored the authorized session. A simulated private-save rejection left
  the exact local PNG downloadable.
- The unchanged compiled production app was tested with isolated Supabase fixtures:
  all three custom formats, all five filters, exact preview/Result/upload hashes,
  unchanged colored artwork, true Mono photos, correct `filter_id`, and the
  three PNG dimensions **600×1800 / 1800×1200 / 1200×1800**.
- Custom tests covered active-only hybrid catalog, inactive/deleted/wrong-format
  recovery, original private overlays, four-slot blocking, deletion freeing a
  slot, upload/toggle/refresh, and correct stored-image gallery proportions.
- Public message submission sent one POST, with no returned-row SELECT or guest
  collection read; repeated submit did not duplicate the message.
- Complete Ayesa/Admin compiled-production fixture suites passed overview counts,
  50-letter/24-memory pagination, plain-text messages/read updates, gallery preview
  renewal/original downloads/retry, empty/error states, authenticated refresh,
  wrong-role/logout/session-loss guards, keyboard/dialog Escape/focus, and reduced
  motion.
- Major flows were checked at **320, 375, 390, 430, 768, and 1440 px**, including
  80-character unbroken custom names. No horizontal page overflow was found.
  Offscreen images were scrolled into view for lazy-loading checks.
- Completed browser suites reported **zero console errors**.

Production browser tests used the actual compiled application plus simulated
backend responses and browser fake-camera hardware. QA-only module shims
re-exported the bundled client/format getters for harness access; application
bundles were not replaced. No real credentials or remote writes were used.

## Owner deployment and launch steps

Follow [deployment.md](deployment.md) for the complete manual instructions:

1. Review/commit/push the intended release yourself, then import the existing
   GitHub repository into Vercel.
2. Select **Vite**, build **npm run build**, output **dist**, a compatible Node
   version, and configure the two Production environment variables privately.
3. Deploy yourself; record the stable production HTTPS origin.
4. Set Supabase Authentication → URL Configuration → **Site URL** to that exact
   HTTPS origin and keep only required production/local redirect allowlist entries.
   Verify anonymous sign-ins, permanent profile roles, enabled/scoped RLS, and both
   private bucket flags.
5. Run the full deployed-origin launch checklist on physical iPhone Safari and
   Android Chrome: permissions/no camera, front/rear switching, selfie orientation,
   retakes, safe areas, all formats/filters, PNG downloads, private saves/messages,
   custom templates, private accounts, and every deep-link refresh.
6. Prepare Turnstile/hCaptcha provider/token integration as strongly recommended
   anonymous-auth hardening. Do not enable incomplete CAPTCHA protection: this
   tokenless release needs client token integration before that setting is enabled.
7. Remove identified disposable test records/templates only if desired, manually,
   while preserving actual birthday submissions. A custom domain is optional.

Actual Vercel deployment, final production domain/settings, real account/Storage
RLS certification, and physical phone acceptance remain owner launch work.

## Files created

```text
docs/deployment.md
src/components/ApplicationErrorBoundary.jsx
src/utils/mockCameraMode.js
tests/productionReadiness.test.js
vercel.json
docs/phase-11-implementation.md
```

## Files modified

```text
README.md
package-lock.json
package.json
src/App.jsx
src/components/PrivateMemoryPreview.jsx
src/components/PrivatePhotostripGallery.jsx
src/components/TemplateDesignCard.jsx
src/components/TemplatePreview.jsx
src/hooks/useTemplateFile.js
src/main.jsx
src/pages/CameraPage.jsx
src/pages/FilterPage.jsx
src/pages/ResultReadyPage.jsx
src/styles/camera.css
src/styles/photobooth.css
src/styles/result.css
src/styles/site.css
src/utils/templateValidation.js
```

