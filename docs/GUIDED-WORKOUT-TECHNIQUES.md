# Guided drop sets and bisets — 2026-09-21

## Scope and cause

The editor stored a drop count without expanding it into executable sets. Superset partners were free text; navigation completed all sets of one exercise before moving to the next. The ordinary rest timer consequently ran between paired exercises.

## Contract

- Drop count 1–3 means that many successive reductions after the last main set. Preparation is idempotent on resume, preserves existing set IDs and logged loads, and never supplies a drop load. Each reduction records its own reps/load and `parent_set_number`.
- Missing drop count is not silently assumed for existing programs. The user selects it in the program or explicitly adds stages for this session. Selecting a new drop technique in the editor persists the displayed default of two.
- A biset links two actual exercises in the day, with unique names, equal main-set counts, no timed holds and no conflicting techniques. The existing name-based JSON contract is retained; a renamed/deleted/ambiguous partner fails closed instead of being guessed.
- The earlier exercise is A, the later B. Execution is A1 → B1 → rest prescribed on B → A2. Nonadjacent pairs do not cause intervening exercises to be skipped. A manually selected out-of-order member redirects to the required member without logging a set.
- Both biset members are labelled `superset` in the session payload so neither is analysed as ordinary straight-set progression.
- Timeline and active exercise show the technique; drop stages get an explicit “now” instruction. Invalid prescriptions disable validation and explain the repair.
- Existing JSON and workout-set columns suffice: no schema migration, no changes to authentication or RLS, no rewrite of customers’ programs or history.

## Validation (4/4 before release)

1. Model: expansion, partial resume, phases, defaults, ambiguous/missing/overlapping partners, complete alternation, rest and nonadjacent recovery.
2. Actual React runtime: real WorkoutSession inputs, reduced-load guard, drop guidance, close/remount, final save payload/volume; actual ProgramBuilder partner selection and persisted default.
3. Regression: complete unit suite, TypeScript, three-language parity and production build.
4. Persistence regression: disposable synthetic PostgreSQL/PostgREST fixture, integration suite, backup/restore and cleanup. No production session created for testing.

## Remaining limits

The September 21 patch did not include a rest-pause engine. The September 22 extension below adds it. Mechanical-drop variants remain free-form instructions: no variant order, load or repetitions are invented, and their individual execution is not automatically tracked. FST-7 uses the prescribed seven-set block.

Partner names remain the compatibility identifier in saved programs. A future schema can introduce instance IDs with a dedicated migration; currently duplicate names are explicitly rejected for bisets.

## Release checks

Require green PR checks, then confirm the deployed commit and the app.moovx.ch alias (not just a successful preview). Rollback is a revert of the application commits; no database rollback is needed.

## Incremental repair of historical programs

The initial strict whole-program save validation prevented repairing one day while another day retained an old incomplete technique. The editor now lists each issue with day, exercise, phase and warning/blocking status. Unchanged historical technique issues may be carried forward while unrelated prescriptions or a different day/phase are repaired. The affected exercise remains blocked during execution until repaired.

New/modified invalid techniques are still rejected, as are invalid ordinary prescriptions and malformed structures. Historical exemptions compare canonical resolved prescriptions and relevant partner relationships, at the same day/exercise/phase position; object key ordering does not affect the comparison. Reordering or modifying an unresolved prescription may require repairing it first.

The API loads the authenticated owner's existing days from `custom_programs`, normalizes its day layout like the editor, and uses that trusted baseline rather than the client's `expected` object. Owner filtering, entitlements, rate limiting and the atomic RPC's revision/retry checks remain in place. No migration or customer data rewrite.

Regression coverage includes the actual editor repairing day one with day two unresolved, rejected forged baselines, all-phase validation and a real API → disposable PostgreSQL save/read/retry test verifying the untouched day and a single version record.

## September 22: precise execution tables and Home continuity

- Every supported technique has a disclosure table: ordered step, exercise, repetition target (or actual result), load and rest after the step. FST-7 has seven separate rows; a biset alternates both named exercises A1/B1/A2/B2. The current row and completed rows are identified. Missing drop/mini-set repetition targets are not invented.
- Rest-pause uses the existing `count,seconds` prescription (2–3 mini-sets; 10/15/20 seconds), **after the last main set only**, as confirmed by the owner. Mini-sets use the same load as the final main set and record their actual reps separately. Normal rest applies between main sets, short rest before each mini-set, and no timer starts once the complete workout is done.
- Existing mini-set IDs/results survive normalization and resume without duplication. New or modified invalid prescriptions are rejected; unchanged historical warnings retain the incremental-repair contract.
- `training_restpause_stages` broadens the parent-set CHECK constraint to rest-pause. It is idempotent, rejects missing/unsupported technique types, changes no historical rows, and leaves RLS and access policies untouched. Deploy this compatible DB change before the new application. Roll back the application first; do not restore the old constraint after mini-set rows exist.
- Main sets, drop stages and mini-sets are named separately in the logger and focus. The rest timer precedes the inputs on mobile. The large redundant session metrics are hidden on mobile, the floating add button no longer covers inputs, and incompatible technique modifiers are not offered.
- Home now offers explicit resume. Starting another workout while a valid same-owner draft exists resumes it instead of overwriting it. Abandonment/completion removes the draft and must not resurrect a resume banner.

### Verification

Four layers: model/editor and phased validation; actual React WorkoutSession and dashboard-hook runtime; disposable PostgreSQL/PostgREST save/read and constraint rejection (migration applied twice); regression suite, TypeScript, translation parity and production build. Mobile browser verification at 402×874 used a temporary local fixture rendering the actual component: rest-pause transition/15-second timers/close-resume, seven-row FST-7 table, and A→B without rest followed by B→A with 60 seconds. The fixture was removed before commit; no customer's completed session was created or edited.
