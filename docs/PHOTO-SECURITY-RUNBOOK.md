# Progress photo security

## Scope and audited state

Production progress-photos was public and its SELECT policy admitted every authenticated account. Staging already had an owner/active-coach policy and a private bucket; it was not representative of production. Before changing production, aggregate checks found no files outside UUID folders and no progress_photos records pointing to another owner's folder or absolute URLs. No image bodies were read for this audit.

The protected scope is progression/body photos in progress-photos, their two AI analysis routes, and the desktop photo view. Avatars, message media, meal-photo data URLs and the scientific quality of visual assessments are separate workstreams.

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

EXIF stripping, full decoding/re-encoding, upload-time type/size limits and signed-link renewal/revocation across existing UI views remain follow-ups. Existing unrelated avatar write policies need review. An authenticated hosted end-to-end upload/view/analysis test is still separate from synthetic tests and public smoke checks.

Guidance: [Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). The Supabase guides informed preservation of session-based RLS and existing active-coach authorization rather than introducing privileged image reads.
