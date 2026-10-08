# Supabase setup for Phases 5–7

The frontend uses the installed `@supabase/supabase-js` SDK. It saves one copy
of the existing high-resolution final PNG; it never uploads the four source
frames. Guests see no login UI, and downloading does not depend on Supabase.

## Local environment

Put your own values in ignored `.env.local` for these names:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Copy variable names from `.env.example`, never actual values into source,
documentation, tests, screenshots, or Git. Use only a publishable browser key.
Each line must use the exact `NAME=value` dotenv format above. Bare values,
JSON properties, bullet points, and `NAME: value` entries will not configure
Vite. Keep the variable names unchanged and unquoted.
Never use a secret/service-role key or database password in the frontend.
Missing/invalid configuration leaves the local workflow usable. Vite must be
restarted when the environment changes. `dist/` is ignored and is a frontend
build artifact; the publishable configuration is intended for browser use.

## Required existing resources

- Enable anonymous sign-ins in Supabase Authentication. Existing sessions are
  reused; no permanent session is replaced with an anonymous one. Anonymous
  signed-in guests use PostgreSQL's `authenticated` role, as described in the
  [official anonymous sign-in documentation](https://supabase.com/docs/guides/auth/auth-anonymous).
- Keep Storage bucket `photostrips` **private**. Allow `image/png`; its file-size
  limit must accommodate full-resolution exports. Never make it public to fix
  a failed save.
- Keep RLS enabled on `public.photostrips` and on Storage's object access. The
  table must accept `owner_id` (UUID), `storage_path` (text), `format_id` (text),
  `design_id` (text), `width` and `height` (integers). `created_at` and any other
  required database-generated fields need defaults.
- Prefer a unique constraint on `storage_path` so one path cannot receive
  duplicate metadata. The frontend does not modify schema or policies.

The exact metadata sizes are 600 × 1800 for 2x6, 1800 × 1200 for 6x4, and
1200 × 1800 for 4x6. The uploaded file path uses the current authenticated
owner UUID followed by a random UUID and `.png`, never guest-provided text.

## Policy requirements

Review the existing project policies in the Dashboard. Apply these rules to
`authenticated`, since that includes anonymous sign-ins:

| Operation | Required scope |
| --- | --- |
| Storage INSERT | `bucket_id = 'photostrips'`, first folder of `name` equals `auth.uid()::text` |
| Metadata INSERT | `owner_id = auth.uid()`, `storage_path` begins with that same owner's UUID folder |
| Storage DELETE for rollback | Only `photostrips` objects in the current owner's folder |
| Storage SELECT needed by rollback | Same owner/bucket restriction; restrict to the deletion operation rather than general listing/download |

Normal saving needs Storage INSERT and table INSERT. Table insertion requests
no `.select()`, so it needs no metadata read policy. Keep UPDATE and unrelated
guest SELECT access unavailable. Do not add an unrestricted SELECT policy or
disable RLS. A publishable key cannot enforce privacy on its own.

If anonymous sign-in succeeds but Storage upload reports a row-level security
rejection (which Storage can return as HTTP 400), review the Storage INSERT
policy's role, bucket, and owner-folder condition. An anonymous signed-in guest
uses `authenticated`, not the unauthenticated `anon` role. A failed upload does
not start the metadata insert. After correcting a scoped policy, use **Try
Again** on the existing result to reuse its session and final PNG.

The SDK's `remove([path])` operation also needs scoped Storage SELECT permission.
Where supported by the hosted project, use the official
`storage.allow_only_operation('object.delete_many')` helper in that SELECT
policy, alongside the owner-folder and bucket conditions, to allow cleanup
without allowing a gallery list or downloads. Confirm the helper and operation
are available in your project. See the
[Storage access-control guide](https://supabase.com/docs/guides/storage/security/access-control)
and [operation helper documentation](https://supabase.com/docs/guides/storage/schema/helper-functions).
Never broaden read access merely to make cleanup succeed.

Future Ayesa/Admin policies will deliberately extend read access after their
private authentication/dashboard phases. No guest gallery or read UI exists in
Phase 5. Test access from two distinct browser sessions; a guest must not be able
to read another guest's file or row.

## Failure behavior

Auth or upload rejection creates no metadata insert. A definite metadata
rejection triggers a bounded attempt to remove that result's uploaded object.
An empty or denied deletion response does not prove the file was removed;
inspect the Dashboard and cleanup policy if a failure leaves an orphan.

Lost/aborted write responses cannot prove whether the server committed a file
or row. The client reports an unconfirmed gallery copy and leaves its PNG
download usable. It avoids blind duplicate retries and does not delete an object
after an uncertain metadata outcome, since a row may already refer to it.
Dashboard inspection is needed to reconcile that case. No background queue,
automatic infinite retry, or guest SELECT workaround is implemented.

Definite failures offer Try Again. Re-renders/StrictMode reuse the pending or
successful save for the current photo set; editing a photo creates a new set.
Browser refresh clears local photos, while the SDK can reuse the guest session.
The service never logs tokens, credentials, Blob data, or raw SDK responses.

## Verification in the Supabase Dashboard

After completing one development mock strip and seeing a successful gallery
status, verify:

1. Exactly one new final PNG exists in the private `photostrips` bucket, at the
   owner's UUID folder and a random filename. No raw frames were uploaded.
2. Exactly one new `public.photostrips` row matches that path and owner. Its
   format/design IDs and dimensions match the selected format, and its timestamp
   comes from the database.
3. Re-rendering or returning to the camera and confirming without edits adds
   no additional file/row. Taking another set creates one new result.
4. A definite metadata failure attempts rollback; check for an orphan and verify
   owner-scoped cleanup permissions. Download must still work during failure.
5. An unrelated anonymous guest cannot list/download other guests' objects or
   select their metadata. The bucket remains private and RLS remains enabled.

The frontend does not have management/service-role credentials and intentionally
does not query the private gallery to perform these checks. A successful SDK
upload/insert response confirms those writes were accepted; authoritative bucket
settings, policy scope, schema constraints, and resulting Dashboard file/row
counts require trusted manual verification.

## Private birthday messages (Phase 6)

Use the same environment, client, and anonymous-sign-in configuration above.
Message submission reuses Phase 5's `ensureGuestSession` helper and preserves
future permanent sessions. It never signs a guest out after submitting.

The existing `public.birthday_messages` table contains `id`, `owner_id`,
`nickname`, `message`, `is_read`, and `created_at`. `owner_id` references
`auth.users(id)`. The database must generate `id` and `created_at`; the frontend
inserts only the current session's `owner_id`, trimmed text, and `is_read: false`.

Keep table RLS enabled. Guests use the `authenticated` role and need only scoped
INSERT permission with `owner_id = auth.uid()` and `is_read = false`. Keep guest
SELECT, UPDATE, and DELETE unavailable. No inserted row is requested back, so a
successful INSERT requires no SELECT policy. Do not broaden read access to fix a
submission error. Future Ayesa/Admin reading policies belong to their later
private authentication phases.

Database CHECK constraints should enforce nonblank trimmed nickname/message
and maximum lengths of 40/2,000 characters. The UI and service validate first,
but frontend validation cannot replace those constraints. Content is plain text;
future dashboards should render normal React text, never submitted HTML.

Errors preserve form contents while the page remains open. Leaving/reloading
the page clears the unsent form; it is not saved to browser storage. Sending
runs on explicit submission only, with duplicate-click protection and bounded
network handling. A lost response may hide a committed message; the UI warns
that a deliberate retry could send it twice. There is no automatic retry or
offline queue, and no guest query to reconcile an uncertain write.

### Manual message verification

After sending a test wish and seeing the success state, open **Table Editor →
birthday_messages** in the trusted Dashboard and confirm:

1. Exactly one new row exists for that intentional submission.
2. `owner_id` matches the sending session, `nickname` and `message` match the
   trimmed submitted text, and `is_read` is false.
3. `id` and `created_at` were generated by the database.
4. A rapid double-click creates no second row. Send Another Message creates a
   new row only after another deliberate submission.
5. RLS stays enabled and guests cannot SELECT any messages. Private Ayesa/Admin
   access remains restricted to the configured permanent profile roles.

A successful INSERT API response verifies acceptance of the write. Actual row
contents/defaults, row counts, and policy configuration require Dashboard
verification; the guest frontend intentionally does not read messages back.

## Private authentication foundation (Phase 7)

Keep using the same browser publishable configuration and Supabase client.
Manage the two permanent email/password Auth users manually in the Dashboard;
do not put their emails/passwords or auth tokens in source, docs, screenshots,
URLs, or Codex messages. There is no permanent sign-up UI or API call.

The existing `public.profiles` table has `id`, `display_name`, `role`, and
`created_at`. Each permanent user's `id` must match their Auth UUID, with role
exactly `ayesa` or `admin`. Anonymous guests have no profile row. Keep profile
RLS enabled and allow permanent users to SELECT only their own row:
`id = auth.uid()`. Client-side profile INSERT/UPDATE/DELETE must remain denied,
particularly role changes. The app never modifies this table or its policies.

The frontend reads only `id, display_name, role` with `.eq('id', user.id)` and
`.maybeSingle()`. Missing rows, unsupported roles, owner mismatches, and profile
lookup failures grant no private access. Roles stay in React memory, never
localStorage, sessionStorage, cookies, or query parameters. The SDK manages its
own auth session persistence; it is separate from application-role storage.

Login uses `signInWithPassword`, replacing a pre-existing anonymous session.
The database profile role determines the destination at either private entrance.
The SDK's `signOut` clears the permanent session; no new guest is created until
a later public save/send explicitly needs one. A shared auth-operation queue
coordinates guest creation with login/logout without changing upload/insert
semantics. Profile work is deferred outside auth callbacks and old results are
discarded after identity changes.

Phase 7 established placeholder dashboards; Phase 8 adds the Ayesa inbox and
gallery while Admin remains a placeholder. React guards are navigation UX;
database and Storage RLS remain the authorization boundary.

### Manual checks with the real permanent accounts

Credentials are intentionally unavailable to automated development checks.
Enter them yourself locally; never paste them into Codex.

1. Open `/ayesa/login`, sign in with Ayesa's credentials, and confirm `/ayesa`
   shows the private dashboard. Refresh and confirm the session/profile
   restore; Logout must return to the login page and revoke private access.
2. Repeat at `/admin/login` with the admin account; confirm `/admin`, refresh,
   and logout. Also test each account through the other login entrance: the
   profile role must still select its own dashboard.
3. While signed in as Ayesa, visiting `/admin` redirects to `/ayesa`. The admin
   visiting `/ayesa` redirects to `/admin`.
4. A guest with or without an anonymous session must be sent to the relevant
   login page when opening either private dashboard. The public site requires
   no permanent login and must show no new Login/Sign Up navigation item.
5. Verify profile SELECT is owner-scoped and profile writes/role updates remain
   denied. Collection reads must be limited to permanent Ayesa/Admin roles.
6. Invalid credentials show a generic error. A permanent user without a valid
   profile must get access denial. A denied profile SELECT needs a scoped policy
   review; never fix it by granting unrestricted SELECT or disabling RLS.
7. After permanent logout, use a public message or photostrip save to verify
   anonymous creation happens lazily and still works. Existing permanent sessions
   must be reused if public features are used before logging out.

Simulated SDK/API tests validate these states without real private passwords.
They cannot verify the real accounts, their profile rows, or deployed policy
configuration; those checks remain manual.

## Phase 8 private dashboard verification

The project is assumed to already have scoped policies allowing permanent users
whose own `profiles.role` is `ayesa` or `admin` to SELECT `birthday_messages`,
`photostrips`, and their private Storage objects. Ayesa also needs scoped UPDATE
permission for `birthday_messages.is_read`. Keep the bucket **private**, RLS
enabled, guest collection reads denied, and profile writes denied. The frontend
creates or changes no policy and uses no privileged key. Phase 9 now provides
separate Admin views using the same private message/gallery services.

Verify these deployed settings yourself in Supabase. Automated development tests
use simulated private sessions/API responses and cannot certify production
policies or bucket configuration. No real Ayesa credentials are requested.

1. As a guest, submit at least three birthday letters. Create/save several
   strips with `mockCamera=true` in development, including 2×6, 6×4, and 4×6.
2. Sign in at `/ayesa/login` with the real Ayesa account. Confirm overview total
   letters, unread letters, and saved memories against the trusted Table Editor.
   Network count requests should be HEAD requests without collection/image data.
3. Open Letters. Check newest-first nicknames, previews, dates, and read badges.
   Open an unread letter; confirm the full text is readable, the badge disappears,
   and the unread count decreases immediately. Refresh and confirm persistence.
   In Table Editor, verify only `is_read` changed.
4. Test All/Unread/Read, empty filters, and Load More if more than 50 matching
   letters exist. Read a letter in Unread; it should leave that list while its
   dialog remains open.
5. Open Gallery. Confirm private previews, all three proportions, resolved
   format/design names, and Load More when more than 24 strips exist. Open a
   detail and use Download PNG. Verify the original PNG dimensions: 600×1800,
   1800×1200, or 1200×1800. Compare it with the original Storage object if needed.
6. Refresh the gallery. Leave the tab idle for more than ten minutes, return,
   and confirm previews renew. Verify a missing preview can be retried without
   hiding the other cards. Check keyboard Tab/Escape/focus return in both dialogs.
7. Test at 320, 375, 390, 430, tablet, and desktop widths; confirm there is no
   horizontal overflow and all images/dialogs fit.
8. Logout. Verify `/ayesa`, `/ayesa/messages`, and `/ayesa/gallery` redirect to
   `/ayesa/login` without showing private content. Repeat with an anonymous guest.
   An Admin session must redirect those routes to its own `/admin` dashboard.
9. Recheck the public homepage, camera/mock capture, retakes, PNG generation,
   local download, private save, and guest birthday-message submission.

If a live operation is denied by RLS, stop that check. Report the operation,
table/bucket, error code, and sanitized message; review the scoped policy manually.
Do not disable RLS, publish the bucket, introduce unrestricted SELECT, hardcode
user IDs, or use `service_role`. UI errors stay friendly; service errors contain
only fixed technical diagnostics (operation/resource/allowlisted code/status),
never letter contents, credentials, signed URLs, or private paths. A successful
SELECT with zero rows can also mean RLS filtered the collection; compare expected
counts with the trusted Dashboard rather than assuming the table is empty.

## Phase 9 Admin verification

`public.photostrip_designs` and PRIVATE `template-designs` are assumed to already
exist, with manually configured Admin-only SELECT/INSERT/UPDATE/DELETE policies.
The table columns are `id,name,slug,format_id,storage_path,is_active,created_by,
created_at`. Table defaults generate `id` and `created_at`. The app never creates
resources, changes policies, publishes a bucket, or uses privileged credentials.

All four Admin routes require the permanent profile role `admin`. Ayesa is
redirected to `/ayesa`, guests to `/admin/login`. Template mutation services also
resolve the current permanent session and verify its own Admin profile before
writing. Existing message/gallery reads and scoped `is_read` updates are shared
with Phase 8; no guest-message or guest-photostrip deletion is added.

Private previews use batched 600-second signing. All gallery original downloads
still use authenticated `photostrips.download()`. Template uploads use the
original validated PNG, `contentType: image/png`, a format/random-UUID path,
and `upsert: false`. Inserts send only the six required fields. Same-format slug
duplicates are checked before upload; a database unique-constraint rejection
is also reported as a duplicate and triggers cleanup after a definite rejection.

Definite metadata failures attempt bounded deletion of only the just-uploaded
file. Lost responses can hide committed writes, so uncertain metadata outcomes
preserve the file and require inspection instead of an automatic retry. Template
deletion re-reads the selected row, validates its exact format/UUID file path,
removes that one file, then deletes only the matching ID/storage-path row. Empty
acknowledgements are failures. If row deletion fails after confirmed file removal,
Retry Record Deletion skips file removal using in-memory progress. A full browser
refresh loses that progress; inspect/recover the record manually in Supabase if
the file is already absent. See [template artwork](template-artwork.md).

### Real Admin checklist

No real Admin credentials are used by automated private tests. Log in yourself
locally; do not paste credentials, tokens, or environment values into Codex.

1. Log in at `/admin/login` with the real Admin account.
2. Compare overview total/unread messages, saved photostrips, total templates,
   and active templates with the trusted Supabase Dashboard. Counts use HEAD.
3. Open `/admin/messages`; confirm the guest letters appear newest first.
4. Open a full letter; confirm plain text, read status, All/Unread/Read, and refresh
   persistence. Verify only `is_read` changed. Test Load More beyond 50 letters.
5. Open `/admin/gallery`; confirm saved strips in all three formats.
6. Open a larger preview and Download PNG. Verify its original full dimensions
   (600×1800, 1800×1200, or 1200×1800); test Load More beyond 24 memories.
7. Open `/admin/designs`, and Upload New Design.
8. Upload a valid 2×6 PNG, exactly 600×1800, no larger than 10 MB. Check the local
   preview and transparent openings before uploading.
9. Confirm its private signed preview appears and the counts update.
10. In the trusted Dashboard, confirm one `template-designs` object exists and
    one matching `photostrip_designs` row exists, with Admin `created_by`, Active,
    safe slug, and database-generated ID/timestamp.
11. Disable it; refresh and confirm Inactive persists.
12. Enable it again; refresh and confirm Active persists. Verify only `is_active`
    changed in the row.
13. Try the same normalized name/format: it must report a duplicate without
    uploading or overwriting. Verify rejected JPEGs, renamed non-PNGs, oversize
    files, corrupt PNGs, and wrong dimensions perform no upload.
14. If practical, repeat with valid 6×4 and 4×6 artwork. Check proportions and
    frame alignment using the artwork guide.
15. Open Delete for your disposable test design; Cancel/Escape must change nothing.
16. Confirm Delete Design. Verify the exact template object is gone.
17. Verify its matching metadata row is gone. Existing guest photostrips and
    birthday messages must remain unchanged.
18. Check previews after ten minutes/backgrounding, and verify one missing preview
    does not block other cards. Test forms, dialogs, focus, and controls at 320,
    375, 390, 430, 768, and desktop widths.
19. Logout. Verify all four Admin routes redirect to `/admin/login` without
    private content; repeat with an anonymous guest. Ayesa must be redirected
    away from every Admin route to `/ayesa`.
20. Recheck Ayesa's three pages and the public homepage, existing local designs,
    camera/mock capture, retakes, Canvas generation, download, private save, and
    guest messages. Public flows must make no `photostrip_designs` requests.

Verify **both buckets remain private** and guest/Ayesa template collection access
is denied by deployed RLS. If any live Admin operation fails due to RLS, stop that
step and report its operation, table/bucket, error code, and sanitized message.
Do not disable RLS, publish a bucket, broaden policies, hardcode Admin UUIDs, or
use `service_role`. Raw paths, letter contents, credentials, and signed URLs
must not be included in reports. Policy/bucket configuration and real-account
permissions cannot be certified by the simulated browser tests.
