# Nutrition generation hotfix — validation

Scope: constrain AI food names to the existing canonical catalogue, reject truncated/refused output, close reproduced exclusion gaps, and reject inconsistent calorie/macro targets before generation and preference writes. No database migration or change to the model, authentication, quotas, payment flows or reference nutrition values.

## Evidence

1. Regression suite: 1,649 tests / 171 files pass. New cases include unknown-food recovery, terminal provider failure, allergen rejection, incoherent targets, and actual rendered preference form interactions.
2. Static/build: TypeScript and production build pass. Changed domain/test files pass lint. The preferences component retains seven pre-existing lint errors with no new findings.
3. Local runtime: built login returns 200; anonymous generation returns 401. Six integration tests pass against disposable PostgreSQL 17/PostgREST, exercising the actual POST handler, fitter, validator, persistence and read repository for both supported storage formats. Provider, auth identity, capability checks and quotas are simulated. Real database tests cover seven-day save/reload, sequential replacement, previous-plan preservation on validation error, and cross-user read/insert/update isolation.
4. Provider contract: one previously authorized real request with a synthetic profile succeeded (one day, no persistence). No additional paid call was made for this batch. This does not certify all dietary configurations, seven live generated days, production RLS, or a complete authenticated browser-to-production journey.

Run `node scripts/check-nutrition-persistence.mjs` for opt-in persistence checks. Requires Docker and the PostgreSQL 17-alpine/PostgREST v14.14 images. Uses only loopback port 56431 and randomly named disposable containers/network; all fixture data is deleted at completion. No environment files or production credentials are loaded. The fixture is not a production schema migration.

## Remaining audit items

Allergen checks remain partial: product ingredients/traces and unknown free-text allergies need a structured policy. Milk allergy and lactose intolerance are not interchangeable. Dietary-type enforcement, authoritative profile allergies, exact restoration of saved settings, atomic profile/plan revisions, concurrent replacement, and generator timeout/cancellation still require separate work. Arithmetic consistency is not clinical suitability. Do not describe this hotfix as completion of the full nutrition audit.

## Release gate and rollback

Publish only this scoped branch against the production main baseline. Check preview build, login and anonymous API refusal before merge, then confirm the production alias points to the new deployment. Never include unrelated local main/staging changes. If smoke checks regress, use the hosting provider's previous ready production deployment to roll back the aliases and revert this PR normally. No schema rollback is required. Keep deployment identifiers in the private operational report, not in this document.

Test-only dependency fix: jsdom's lru-cache is pinned to 11.2.7 because the locked 11.3.0 ESM dependency introduced top-level await that prevented jsdom loading through CommonJS under the local Node 24 runtime. Application runtime dependencies are unchanged.
