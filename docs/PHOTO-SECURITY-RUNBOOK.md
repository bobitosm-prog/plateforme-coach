# Progress photo security

## Scope and audited state

Production progress-photos was public and its SELECT policy admitted every authenticated account. Staging already had an owner/active-coach policy and a private bucket; it was not representative of production. Before changing production, aggregate checks found no files outside UUID folders and no progress_photos records pointing to another owner's folder or absolute URLs. No image bodies were read for this audit.

The initial scope is progression/body photos in progress-photos, their two AI analysis routes, and the desktop photo view. The avatar/metadata extension below adds avatars and upload sanitization. Message media, meal-photo data URLs and the scientific quality of visual assessments remain separate workstreams.

## Guarantees

- Storage migration makes progress-photos private, removes the broad authenticated SELECT policy and allows only the folder owner or an active authorized coach (existing invitation/admin relationship helper). A restrictive SELECT boundary prevents an additional broad authenticated policy from reopening this bucket. Owner-only file deletion is supported; no real file is deleted by the migration.
- Desktop uses session-scoped signed links instead of public links, as the other progression/coach/onboarding views already do. Cached desktop links are gated by the current account.
- Analysis accepts only the configured HTTPS Storage origin, exact progress-photos object routes and the verified user's folder. URLs with credentials, fragments, traversal/ambiguous encodings, external origins or another account's folder are rejected. Input signatures are ignored; a fresh 60-second link is obtained using the session client's Storage permissions, never the service-role key.
- No redirects; no shared HTTP caching. Download/signing wait deadline 10 seconds, request cancellation propagated, 5,000,000-byte limit checked on headers and actual stream bytes. Allowed media types JPEG/PNG/WebP/GIF must match their byte signatures. This is not a full image decoder or malware scan.
- Provider calls have a 45-second timeout. Logs contain only fixed failure categories/status codes, not URLs, signed tokens, provider bodies, biometric text or raw errors. Failures release monthly reservations through the existing quota lifecycle.

## Validation and rollout

Run unit tests, types, scoped lint, synthetic production build and scripts/check-nutrition-persistence.mjs before commit. Its Storage fixture tests owner/active-coach access, unrelated/former-coach/anonymous denial, owner upload/deletion, cross-account upload/deletion refusal, and resistance to an additional permissive policy. Apply migration twice in the fixture; restore fingerprints include Storage policies and bucket flags. This fixture does not emulate the hosted Storage HTTP/CDN service.

Apply the migration in staging and verify metadata/advisors. Deploy the application with signed desktop links after remote CI/preview checks. Then apply 20260919133822_private_progress_photos.sql in production and verify public=false, removal of the broad SELECT, new policies and anonymous refusal. A HEAD-only check against an existing public object URL can verify closure without downloading the image; never log that URL. No paid AI call is needed for these checks.

## Limits and recovery

Do not reopen the bucket to roll back an application problem. Restore a signed-link-compatible application version or temporarily hide the affected view. No stored images or personal records are rewritten by this release.

Changing permissions cannot recall copies already downloaded. Existing bearer signed URLs can remain valid until expiry, and CDN/browser caches require separate consideration. No key rotation, object renaming or purge is performed here; assess their need separately without claiming historical confidentiality has been restored retroactively.

Signed-link renewal/revocation across existing UI views remains a follow-up. An authenticated hosted end-to-end upload/view/analysis test is still separate from synthetic tests and public smoke checks.

Guidance: [Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). The Supabase guides informed preservation of session-based RLS and existing active-coach authorization rather than introducing privileged image reads.

## Avatar and metadata extension — 2026-09-19

### Field audit and scope

Production had bucket-wide authenticated avatar INSERT/UPDATE/DELETE permissions; staging already had narrower RC1 rules. Aggregate production inspection found four avatar objects, all in the three supported historical layouts. No original avatar or progression-photo body was downloaded. Preserve public avatar display; avatar confidentiality is not claimed.

Task: restrict avatar writes to the path owner, retain historical path compatibility and sanitize new app uploads and progression/body AI payloads. No bulk historical rewrite, unrelated bucket policy changes or privileged upload client.

### Implementation and expected behavior

- `20260919140110_avatar_owner_write_boundaries.sql` drops six known legacy write policies, adds owner-specific INSERT/UPDATE/DELETE and restrictive boundaries for all ordinary database roles. UPDATE checks both old and new rows. Existing SELECT policies and bucket visibility are unchanged. Paths `<uid>/...`, `avatars/<uid>/...`, `avatars/<uid>.<extension>` remain usable. The migration is idempotent and does not modify stored files.
- `/api/photos/upload`: verified session identity, existing per-instance user-keyed rate limiter (10/minute), bucket allowlist, streamed binary input capped at 4,000,000 bytes, read deadline 10 seconds/cancellation, generic errors. Session/RLS Storage client only, fresh random `.jpg` path, no client-supplied destination path, no deletion of an old working avatar.
- Sharp 0.34.5 is a pinned production dependency. Decode JPEG/PNG/WebP/GIF (first frame), reject corrupt/unhandled formats, cap at 40 million input pixels, apply EXIF orientation, fit within 2048×2048 without enlargement, flatten transparency onto white, JPEG quality 88. Eight-second processing timeout. No metadata-retaining methods. EXIF/GPS/XMP/IPTC/camera information is omitted from output.
- All avatar/progression upload sites in dashboard, coach onboarding, client onboarding-v2 and onboarding-photo use this endpoint, without raw-upload fallback. Existing AI analysis downloads are also re-encoded before sending bytes to the provider, including old stored images, without rewriting the stored original.
- 4 MB raw-upload limit stays below the hosting function request ceiling. HEIC/HEIF and larger originals require conversion/reduction before upload; do not claim native support. Errors remain visible; no false saved-photo success after a failed database insert.

### Validations 4/4

1. Authorization: real disposable PostgreSQL tests for all three owner paths and upsert; foreign writes/deletes, reassignment, traversal and anonymous writes refused even with an extra broad permissive policy. Migration applied twice.
2. Metadata runtime: real Sharp decoding tests for supported formats, synthetic camera/GPS/XMP removal, orientation preservation, malformed files and decompression bounds.
3. Endpoint runtime: verified identity, sanitized Storage payload, rate limiting, bad destination, oversized declared/actual bodies, cancellation and generic Storage errors. Storage HTTP itself is mocked here; no live personal-file upload.
4. Regression/release: full unit suite, 17 PostgreSQL/PostgREST tests and backup/restore fingerprint, types, i18n parity, scoped lint and synthetic-environment production build; then remote CI, preview and production anonymous smoke checks.

### Rollout and remaining boundaries

Apply and verify staging first; then merge only after CI and preview succeed, apply compatible RLS migration to production, confirm deployment identity and `/api/photos/upload` anonymous 401. Roll back application code without restoring broad avatar permissions. Existing URLs/files are not deleted or rewritten.

The application sanitizes its uploads, but owner-authenticated direct Storage API writes still exist for compatibility. RLS enforces ownership, not image content. Enforcing sanitization against an intentional direct-API bypass requires a separately planned exclusive ingestion gateway and coordinated removal of direct write permissions. The current in-memory limiter is per instance, not a global distributed quota. Historical originals, cached copies and already-downloaded avatars may retain metadata. Random replacement paths leave old/orphaned files for a future audited retention/cleanup job; no mass deletion is included here.

Unrelated existing Supabase advisor warnings (privileged functions, leaked-password protection) and dependency audit findings are not resolved by this scoped release. See [Supabase security advisors](https://supabase.com/docs/guides/database/database-linter) for remediation guidance.

Sanitizer behavior follows [Sharp output metadata defaults](https://sharp.pixelplumbing.com/api-output/) and [input pixel limits](https://sharp.pixelplumbing.com/api-constructor/). Supabase guidance drove restrictive RLS boundaries and retention of session-scoped Storage operations.

## Exclusive server ingestion — follow-up

Task/scope: close direct avatar and progression-photo writes without breaking reads, authorized deletion or unrelated media. Preserve current server upload authentication, bounded decoding and per-user rate limit. Historical metadata cleanup is a separate operation, not a reason to delete unreferenced files automatically.

`writeTrustedPhoto` is server-only and exposes only one narrow operation. It receives the identity verified by `auth.getUser`, checks UUID and bucket allowlist, sanitizes bytes inside its own boundary, generates a fresh path and uses a non-persistent privileged client to insert that image. It cannot accept a caller-chosen path, overwrite, raw metadata, user token or Storage operation. The privileged key never reaches browsers/responses. No session-client fallback if the key is missing. Writes have a 10-second network timeout; cache TTL is 60 seconds for new objects. Existing per-instance rate limiting is unchanged.

`20260919150432_server_only_photo_ingestion.sql` adds restrictive INSERT and UPDATE policies for ordinary roles on avatars/progress-photos. This blocks direct uploads, replacements/upserts, copies into either bucket, moves and new signed-upload authorizations regardless of permissive policies. Only trusted bypass-RLS server credentials can write. Owner SELECT/DELETE and unrelated bucket rules remain unchanged. Existing signed-upload tokens may remain usable until expiry (normally two hours); no global key rotation is included. See [signed-upload validity](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl).

### Validation 4/4 and rollout order

1. Runtime writer tests: verified identity/path, metadata-free bytes, missing credential fails closed, no session fallback, caller-supplied owner/path ignored, scoped cache settings and generic failures.
2. Real PostgreSQL: migration twice; owner direct INSERT/upsert/UPDATE/cross-bucket move and anonymous upload denied even with an added broad policy; trusted write/update, owner read/delete and unrelated bucket preserved.
3. Regression: complete unit suite, types, scoped lint, i18n, synthetic DB/restore and production build, then remote CI/preview.
4. Deploy the server writer first; verify deployment and anonymous rejection. Only then apply the restrictive migration in production. Do not roll back to the old session-writer version after activation; fix forward or suspend uploads instead of reopening direct writes. Authenticated hosted upload is a separate release check.

### Historical inventory and maintenance access

Read-only database inventory at preparation time: four avatar objects (two referenced by profile avatar URLs), 45 progression objects (two directly referenced by progress_photos), total approximately 94 MB, including HEIC. Reference counts do not prove that other files are safe to delete. No deletion or rewrite follows automatically from this inventory.

`scripts/audit-photo-metadata.mjs <project-ref>` only reads the two explicit buckets and emits aggregate counts, never keys, paths, image bytes or EXIF values. It refuses a mismatched project and caps per-object size/count/depth. Credentials must be supplied securely as environment variables. The local historical project configuration points to another project; never reuse it or change that unrelated configuration. The production deployment's protected server key was unavailable through `vercel env run` during preparation. Therefore no historical image cleanup has been executed at this stage.

Before historical writes: establish authorized maintenance access without pasting keys in chat; dry-run every format including HEIC; preserve compressed image data, dimensions, orientation and color profile; compare image-content hashes; maintain a private recoverable checkpoint; recheck the exact object/version before each write; re-download and verify; retain references and stop on any mismatch. Do not use the app's 2048px lossy sanitizer for a bulk historical rewrite. Do not silently remove orphaned images. Browser caches/downloaded copies cannot be recalled; [CDN invalidation](https://supabase.com/docs/guides/storage/cdn/smart-cdn) is separate from browser cache expiry.
