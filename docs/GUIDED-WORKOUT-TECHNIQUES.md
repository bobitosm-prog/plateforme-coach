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

Rest-pause and mechanical-drop execution are outside this two-bug patch; their free-form guidance is not a mini-set/timer engine. FST-7 keeps its existing seven-set preset. This patch does not claim to validate every advanced training method.

Partner names remain the compatibility identifier in saved programs. A future schema can introduce instance IDs with a dedicated migration; currently duplicate names are explicitly rejected for bisets.

## Release checks

Require green PR checks, then confirm the deployed commit and the app.moovx.ch alias (not just a successful preview). Rollback is a revert of the application commits; no database rollback is needed.
