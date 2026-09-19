# Nutrition: release and recovery contract

## Guarantees in this batch

- New generated plans carry an activation operation ID, the pre-generation profile timestamp and active plan ID.
- `activate_personal_meal_plan_v1` uses the caller's `auth.uid()`, invoker permissions and existing RLS. No user ID parameter or privileged key is accepted.
- Activation locks the owner's profile briefly, rejects changed profile/plan snapshots, disables old plans and inserts the new one in one transaction. Insert failure rolls back deactivation. Repeating an active identical operation is idempotent; replaying an obsolete operation is rejected.
- The provider call occurs outside that transaction. Profile preferences are never rolled back after provider failure, especially newly saved allergies.
- Saved allergies cannot be removed by request overrides. Unhandled allergy codes are rejected. Saved/request restrictions are merged and validated. Persisted generation targets must equal saved targets.
- The four existing heavy AI endpoints now reserve capacity atomically through server-only RPCs before provider work. Successful legacy usage plus live reservations cannot exceed six slots per rolling 30 days among participating requests. Attempts, including failures, count toward each endpoint's existing hourly limit. Provider calls in nutrition have a 45-second timeout; nutrition generation has a 240-second deadline and propagates request aborts.

## Required validation

Run with synthetic data only:

```sh
npm ci
npx vitest run
npx tsc --noEmit --incremental false
npm run i18n:check
node scripts/check-nutrition-persistence.mjs
```

The persistence script creates only uniquely named disposable Docker services on loopback. It applies the activation migration twice, checks rollback and permissions, runs concurrent activations through PostgreSQL/PostgREST, dumps the synthetic database and restores it into another database. Data, policy and activation-function fingerprints must match. It removes its containers, volumes and network even after failure. It does not load production credentials or `.env` files.

The fixture also reproduces the existing profile UPDATE triggers. The trigger hardening migration is applied twice. Runtime checks reject changes to all seven protected fields by an authenticated owner, allow calorie edits and trusted backend updates, and verify timestamp integrity even with a caller-controlled `now()` shadow function. Restoration fingerprints include both trigger functions. These tests do not certify every privileged RPC that can update profiles.

Use synthetic Supabase environment values for the local production build. Never place a service-role key in a `NEXT_PUBLIC_*` variable. The GitHub workflow uses placeholders, not production secrets.

## Rollout order

1. Verify live `meal_plans.plan_data/is_active`, `profiles.updated_at`, owner RLS and the profile timestamp trigger.
2. Apply `20260919110605_nutrition_atomic_activation.sql` and `20260919112812_qualify_profile_role_lookup.sql` to staging before deploying the application. The second migration makes the existing privileged role lookup independent of caller search paths; it preserves ownership and permissions. Verify `prosecdef=false` on activation, fixed empty search paths, authenticated activation execute allowed and anonymous activation execute denied. Check advisors; distinguish pre-existing notices from new ones. Test `get_my_role()` under an empty caller search path: a legacy unqualified `profiles` lookup fails there even when simplified fixture RLS passes.
3. After local runtime tests, apply the same additive migration to production before the application release. It does not alter existing plan rows or revoke existing table privileges.
4. Require the PR's test workflow and preview build to succeed. Smoke-test login and anonymous generation (200 and 401 respectively), then deploy the reviewed commit.
5. Verify the production commit/deployment identity and repeat smoke checks. An authenticated end-to-end test with a synthetic account is a separate release assurance; public smoke tests do not replace it.

### Profile trigger hardening follow-up

Apply `20260919130017_harden_profile_trigger_search_paths.sql` in staging, verify function metadata and advisors, then repeat in production. It only fixes the search path of the two inspected functions; their bodies, owners, execution grants and SECURITY INVOKER behavior are unchanged. It must fail if either expected function is absent rather than silently skipping the protection. Reapplying it is safe. No profile or plan rows are changed. Keep this database fix when rolling back the application. Do not replace either trigger with SECURITY DEFINER: that would bypass the sensitive-column guard based on `current_user`.

### Atomic heavy AI quota follow-up

Apply `20260919131647_atomic_heavy_ai_reservations.sql` before the matching application release. Verify the server-only service key is configured without reading its value. The private reservation table has RLS enabled and no browser grants; the invoker RPCs allow only service_role, never PUBLIC/anon/authenticated. The server helper passes identity from auth.getUser(), not request data. Keep advisory locks only within admission/settlement transactions, never during provider work. These choices follow the Supabase privilege and short-transaction guides.

Admission covers generate-meal-plan, generate-custom-program, analyze-progress-photo and analyze-body, preserving their existing hourly limits and the six-success rolling quota. Pending work holds a monthly slot for at most ten minutes; caught failures release it immediately. An expired reservation cannot be confirmed as successful. Success settlement is idempotent and inserts exactly one legacy-compatible usage log in the same transaction. Failed work still consumes an hourly attempt. An occupied slot returns a distinct in-progress response, not an assertion that six completed generations were used.

Runtime fixture checks concurrent cross-endpoint admission at the last slot, user isolation, idempotent admission/settlement, refunds, hourly failure limits, no double counting, expiration and denied browser access. Restore fingerprints include reservations, usage logs and both RPCs. No real-user or paid-provider tests are performed by that script.

Known boundaries: the read-only quota display still reports successful usage, not pending slots. Old application instances still finishing during rollout do not participate in reservations. Application rollback likewise restores the old non-atomic admission; retain the additive database migration. No historical photo usage is reclassified because successful/failed outcomes cannot be reconstructed reliably. Legacy routes outside the existing heavy list (including generate-program) retain their previous policy. Reservation retention/purging needs a separate scheduled design. Plan activation and quota settlement are separate transactions: if final settlement fails after plan activation, the stream reports uncertain finalization and asks the user to reload, not a false done event. A full combined transaction/reconciliation remains future work.

## Application rollback

Redeploy the preceding known-good application if necessary. Leave the additive RPC installed: deleting it could break clients still using the new bundle. No historical plan cleanup is part of this migration. Do not remove metadata from existing plans; old day parsers ignore it.

## Production recovery — not yet certified

The local restoration drill does **not** establish that a production backup exists, is recent or can be restored within an agreed recovery time. Before calling disaster recovery complete:

- Confirm the backup/PITR entitlement, last successful backup and retention in the actual production project.
- Agree acceptable data loss and recovery duration with the owner.
- Restore a chosen backup into an isolated authorized environment, never over production for a drill.
- Verify authentication, owner/coach RLS, profiles, plans, logs, indexes, triggers, functions and application configuration, without exposing user data.
- Record duration, data freshness, evidence and cleanup. Obtain approval before creating paid restore/branch resources.

## Explicit remaining work

- Legacy payloads without activation metadata still use the compatibility writer. Direct table writes remain possible under existing RLS. No global unique active-plan index yet; do not add one while the old insert-before-deactivate path exists.
- The profile timestamp is conservative: an unrelated profile edit can invalidate an in-flight generation. This is a safe conflict, not a partial save.
- Saved goals and the active plan remain separate states; this is not a combined profile-and-plan editing transaction.
- Catalogue matching is not a certified ingredient/traces database. Full diet enforcement, clinical bounds and reference provenance remain open.
- Atomic reservations cover the four existing heavy endpoints, not all AI routes. Existing privileged-function advisories, session revocation and other caches need separate review; photo URL fetching and raw error handling also need a focused security review.
- CI exists, but making its result mandatory through repository branch protection requires a separate repository configuration check.
