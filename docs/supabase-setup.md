# Supabase setup for Phases 5 and 6

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
5. RLS stays enabled and guests cannot SELECT any messages. Future Ayesa/Admin
   access must be deliberately added later.

A successful INSERT API response verifies acceptance of the write. Actual row
contents/defaults, row counts, and policy configuration require Dashboard
verification; the guest frontend intentionally does not read messages back.
