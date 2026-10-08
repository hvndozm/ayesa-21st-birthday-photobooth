# Production deployment and launch checklist

The release target is a static React/Vite SPA on Vercel, built from the existing
GitHub repository. Supabase continues to provide Auth, PostgreSQL, and Storage.
The application needs no custom server or Vercel function.

These instructions are for the project owner. They do not mean a deployment,
remote policy change, real-account test, or physical-phone test has been performed.
Keep account credentials, environment values, tokens, signed URLs, private paths,
and birthday content out of shared reports.

## Prepare the release locally

1. Use a Node version supported by this project's installed Vite version, as
   described in the [README](../README.md#run-locally). From the repository root:

   ```sh
   npm ci
   npm test
   npm run lint
   npm run build
   npm run preview
   ```

   On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.
   Open preview's printed URL to test the compiled production application.
   `npm run dev` is the separate development experience.
2. Review actual test/build output and report warnings separately. Confirm the
   resulting `dist/` contains `index.html` and its generated assets.
3. Review the intended Git diff before committing. `.env`, `.env.local`, other
   environment files, `node_modules/`, and `dist/` must stay untracked;
   `.env.example` contains only the two empty entries below. If a credential is
   found in existing Git history, report it and handle rotation with the owner;
   do not rewrite history automatically.
4. Commit and push the reviewed release using your GitHub account. Confirm the
   intended production branch in Vercel before a push; connected Git pushes can
   trigger deployments. See [Vercel's GitHub integration](https://vercel.com/docs/git/vercel-for-github).

The source uses `import.meta.env.DEV` to gate mock capture. Check this URL in the
compiled preview, then on Vercel:

```text
/photobooth/camera?format=2x6&design=2x6-sweet-bow&mockCamera=true
```

Production must show the real camera experience, without Development Mock Camera
or generated mock photos. In `npm run dev`, the same flag remains an explicit
development tool. Use the standard production build; do not set
`NODE_ENV=development` for a Vercel build. Vite substitutes these environment
flags during compilation. See [Vite environment modes](https://vite.dev/guide/env-and-mode).

## Import GitHub into Vercel

1. Sign in to Vercel yourself, choose **Add New → Project**, and import the
   existing GitHub repository. Grant access to that repository as needed.
2. Set the Root Directory to the folder containing `package.json`,
   `package-lock.json`, and `vercel.json`.
3. Confirm these build settings:

   | Setting | Value |
   | --- | --- |
   | Framework Preset | Vite |
   | Node.js Version | 24.x, the current supported default; meets `>=22.12.0` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | Default npm installation using the committed lockfile |

   The package engine requires Node **22.12+**, meeting both installed Vite and
   Supabase requirements. Vercel resolves a broad engine range to its latest
   supported version; review the build's selected version. See
   [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

4. In the project's environment settings, configure **Production** values for
   these names. Obtain both values from your own Supabase project; enter them
   directly in Vercel, without pasting them into chat or committing them:

   ```text
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

   `VITE_SUPABASE_PUBLISHABLE_KEY` must be the browser-safe publishable key.
   A secret key, `service_role` key, or database password must never be used in
   a `VITE_*` variable. These values are bundled into frontend JavaScript;
   private data is protected by RLS and authenticated Storage access, not by
   hiding the browser key. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
5. Choose Preview environment values intentionally if previews need Supabase.
   A preview pointed at the production project can write real records. A preview
   without valid configuration retains built-in local rendering and download,
   while backend-dependent actions explain their unavailability.
6. Select **Deploy** yourself. After success, record the stable production HTTPS
   origin and confirm guests can open it without a Vercel account. Changing
   environment values requires rebuilding/redeploying because Vite embeds them
   at build time. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

## SPA direct navigation and refresh

The root `vercel.json` uses the standard Vercel Vite SPA rewrite:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This serves the SPA entry for deep links while preserving the requested browser
URL. React Router then applies normal selection recovery and private role guards.
It does not grant private access. No redirect, custom server, or serverless API
is needed. See [Vercel's Vite SPA instructions](https://vercel.com/docs/frameworks/frontend/vite).

Open and refresh every route below on the actual deployed origin:

| Area | Routes |
| --- | --- |
| Public | `/`, `/photobooth`, `/photobooth/designs`, `/photobooth/camera`, `/photobooth/filter`, `/photobooth/result`, `/messages` |
| Ayesa | `/ayesa/login`, `/ayesa`, `/ayesa/messages`, `/ayesa/gallery` |
| Admin | `/admin/login`, `/admin`, `/admin/messages`, `/admin/gallery`, `/admin/designs` |

Missing camera selections should recover to selection. Reloading Filter/Result
clears in-memory photos and must show Return to Camera rather than a blank page.
Logged-out private routes should reach their login page. An authenticated refresh
should restore the SDK session and the authorized private area. Check an unknown
path also shows the application's friendly page, and static JS/CSS/favicon assets
load normally. Local preview cannot by itself prove Vercel routing works.

## Configure the Supabase production origin

After obtaining the final Vercel production URL, open
**Supabase → Authentication → URL Configuration**:

1. Set **Site URL** to that exact production HTTPS URL. Keep the domain out of
   source code; there is no known production domain to hardcode in this release.
2. Add only exact production redirect URLs actually used by the project. The
   current private login is email/password and introduces no OAuth callback
   route. Keep the exact Site URL in the allowlist where needed for Auth emails.
   If Auth emails require a particular existing return path, allow that exact
   path as well. Production wildcards are unnecessary for this setup.
3. Retain `http://localhost:5173/**` for local development and
   `http://127.0.0.1:5173/**` only if that origin is used. Add other local ports
   only if intentionally needed. Optional Vercel preview redirect URLs should
   be limited to your project's actual preview origins.
4. Confirm **anonymous sign-ins remain enabled**. They support guest saves,
   messages, and scoped custom-template reads without a visible account.
5. Confirm the permanent Ayesa/Admin users and their own `profiles.role` rows
   still exist. There is no public Register/Create Account/Sign Up UI.

Site URL supplies Auth's default return URL; exact production return paths are
recommended by the [Supabase redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).
Password login itself does not depend on an external browser redirect.

## Confirm real RLS and private Storage before launch

The frontend assumes the existing deployed settings are correct; it does not
change database policies or bucket visibility. Inspect them in the trusted
Supabase Dashboard and verify access using distinct guest/private sessions.
The [existing setup guide](supabase-setup.md) describes the required scopes.

- [ ] RLS remains enabled for `profiles`, `birthday_messages`, `photostrips`,
  `photostrip_designs`, and applicable Storage access.
- [ ] `photostrips` and `template-designs` are both **PRIVATE**. Signed previews
  and authenticated original downloads work; no public bucket is required.
- [ ] Guest message and final-photostrip INSERTs work with the existing owner
  restrictions. Guests cannot list/read other guests' messages or photographs.
- [ ] Guest template metadata/signing/download is limited to active matching
  custom artwork. Guests cannot read inactive artwork or mutate templates.
- [ ] Ayesa/Admin collection reads and message read-status updates follow their
  permanent profile roles. Profile role writes remain unavailable to the client.
- [ ] Template upload/toggle/delete is permanent Admin-only, with scoped
  single-object/record cleanup. Ayesa cannot access Admin management.
- [ ] `photostrips.filter_id` accepts `original`, `blurry`, `digicam`,
  `polaroid`, and `mono`, and new saved rows contain the chosen ID.

Anonymous sessions use the PostgreSQL `authenticated` role; this alone must not
give private dashboard permissions. See [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous).
Compare expected real counts with the trusted Dashboard: a successful empty
SELECT may also mean RLS filtered rows. Browser fixtures cannot certify deployed
policies, permanent users, or bucket flags.

If a live permission check fails, stop that check and report only the operation,
table/bucket, safe error code/status, and a sanitized message. Review the scoped
permission manually. Keep the local PNG download available even if gallery save
fails; do not disable RLS, publish a bucket, or broaden guest collection reads.

## Strongly recommended anonymous-auth abuse protection

Plan Cloudflare Turnstile or hCaptcha through Supabase Auth CAPTCHA protection
before broadly sharing the birthday site. Supabase recommends CAPTCHA for
anonymous sign-ins to reduce abusive user creation. Review configured Auth rate
limits and usage as well. See [anonymous-auth abuse prevention](https://supabase.com/docs/guides/auth/auth-anonymous#abuse-prevention-and-rate-limits).

This release does not have provider site-key/token configuration and adds no
unconfigured CAPTCHA. Prepare the chosen provider and allowed production/local
domains, store the provider secret only in Supabase's server-side Auth settings,
and integrate a fresh client challenge token through Auth's
`options.captchaToken` for the affected anonymous and private sign-in calls.
Test expiry/retry and both guest and permanent login before enabling protection.
Enabling Supabase CAPTCHA while the client still sends tokenless requests can
block guest sessions and private login. Follow
[Supabase CAPTCHA setup](https://supabase.com/docs/guides/auth/auth-captcha) and
[`signInAnonymously` token options](https://supabase.com/docs/reference/javascript/auth-signinanonymously).
Do not invent keys or enable an incomplete configuration.

## Optional custom domain and test-data cleanup

The initial Vercel `*.vercel.app` production URL is acceptable. A custom domain
can be connected later through Vercel's domain settings and its specified DNS
records; update Supabase's exact Site URL/return allowlist and CAPTCHA allowed
domains if the primary origin changes. Core application code does not need a
domain hardcoded. See [Vercel custom domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

Before launch, the owner may manually review and remove identified disposable
mock messages, test photostrips, and custom templates in the trusted Dashboard
or the existing Admin template controls. Back up anything wanted, confirm exact
rows/objects and relationships, and preserve real birthday submissions. Do not
bulk-delete anonymous users or assume every existing record is test data. There
is no automatic remote cleanup in this phase. Deleting a disposable custom design
must leave already flattened historical photostrips intact.

## Physical-phone and launch acceptance checklist

Perform these checks on the **deployed HTTPS origin**, using physical iPhone
Safari and Android Chrome where available. Browser viewport/fake-device checks
do not verify real cameras, operating-system permissions, safe areas, or phone
download behavior. `getUserMedia` requires a secure browser context; no custom
HTTPS implementation is needed. See [MDN camera requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#privacy_and_security).

- [ ] At **320, 375, 390, 430, 768, and 1440 px**, review Welcome, format/design
  cards, custom previews, camera controls, Filter, Result, message form, private
  layouts, gallery lightbox, and Admin upload. There is no horizontal page
  overflow; content remains readable and controls avoid phone safe areas.
- [ ] Complete Home → Start → Format → built-in Design → Open Camera → four
  photos → Filter → Result → Download → private gallery save. Check all four
  built-in designs remain selectable independently of custom-template loading.
- [ ] Test permission denial/retry and no-device behavior where possible. Camera
  access begins only after Open Camera, prefers front camera, switches front/rear,
  mirrors front preview/capture once, and has no countdown. Individual retakes
  preserve other photos. Confirm the camera indicator stops on close, hidden tab,
  confirmation, and navigation away.
- [ ] Repeat essential capture/filter/download checks in every output format:

  | Format | Required final PNG dimensions |
  | --- | --- |
  | 2x6 | 600 × 1800 |
  | 6x4 | 1800 × 1200 |
  | 4x6 | 1200 × 1800 |

- [ ] Try **Original, Blurry, Digicam, Polaroid, Mono**. All four photos share
  the selected effect; colored built-in/custom artwork stays unchanged. The
  loaded Filter preview, Result, downloaded PNG, and uploaded final PNG match.
  Original keeps the established appearance. Fast selections never proceed with
  stale output; no raw photos or filter intermediates are uploaded.
- [ ] Complete the same guest flow with an active custom PNG in each format.
  Confirm camera/output openings align with the [central coordinates](template-artwork.md).
  Inactive designs disappear from new selection; deleted/inactive/wrong-format
  camera links recover. Completed historic strips still download correctly.
- [ ] Confirm Result downloads work even when gallery saving fails. Disconnect
  the network during custom loading, filter/result, saving, messages, and private
  reads; existing friendly loading/error/retry states remain usable. Valid empty
  custom/message/gallery/template collections show their empty states.
- [ ] Send a disposable nickname/message. Confirm one INSERT succeeds and there
  is no guest message list or read-back of other guests' submissions.
- [ ] Sign in yourself as Ayesa: overview counts → messages/read status → gallery
  details/original download → authenticated refresh → Logout. Sign in as Admin:
  overview → messages → gallery/download → designs → disposable upload → toggle
  → confirmed delete → Logout. Follow the [real-account checklist](supabase-setup.md).
- [ ] Four custom rows per format, including inactive rows, block a fifth upload
  before Storage writes; deleting a disposable row frees a slot. Avoid simultaneous
  uploads: the existing frontend count is not an atomic cross-tab database quota.
- [ ] Guests visiting all protected routes reach login with no private content.
  Ayesa visiting Admin routes returns to `/ayesa`; Admin visiting Ayesa routes
  returns to `/admin`. Logout immediately removes private data and access.
- [ ] Keyboard Tab/Enter/Space works; focus is visible; dialogs contain focus,
  close with Escape where appropriate, and restore focus. Form labels, button
  names, alt text, selection states, and reduced-motion behavior remain useful.
- [ ] Refresh/direct-open every route in the route table, test missing-photo
  recovery, confirm production `mockCamera=true` lockout, and check the browser
  console for errors without copying private data into reports.
- [ ] After reviewing any optional disposable-data cleanup, record release commit,
  production URL, tested devices/browsers, completed live permissions, and any
  unresolved issue. Share the birthday URL only after the owner accepts these
  live and physical-device checks.
