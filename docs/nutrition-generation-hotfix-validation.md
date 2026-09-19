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

## Follow-up: preference restoration

The settings screen now restores its initial calorie adjustment from the saved calorie goal and the current calculated TDEE instead of resetting to the objective's default adjustment. Complete saved macro targets remain authoritative: automatic or ratio mode is restored only if it reproduces them; otherwise manual mode preserves those values. New profiles retain the prior automatic defaults. The selected mode and percentages are stored as versioned `nutrition_settings` metadata inside the existing `meal_preferences` JSON, preserving other preference fields. Unsupported or stale metadata never overrides saved targets. No database migration is required.

Validation: 1,664 tests / 172 files, TypeScript and production build pass. Seven isolated database integration tests now include profile-service JSON save/reload, restoration of ratio targets, preservation of existing food preferences, and another account's inability to read/update the fixture profile. A rendered-component round trip confirms that 2,109 kcal and custom macros are unchanged on save/reopen. Domain/test lint passes; the historical preferences component adds no lint findings.

Limits: real production profile data was not read or modified for these tests. This restores the editor's initial state; it does not make profile/plan replacement atomic or remove all legacy recalculation in other generation entry points. Incomplete/invalid body data and targets remain subject to the existing validation, not a new clinical policy. Existing saved plans are not regenerated. Rolling back application code requires no deletion of the optional JSON metadata.
