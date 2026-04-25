# Performance Issues — Pending

## PWA iPhone : 5s freeze on initial load

### Reported
2026-04-25 — User noted that opening the installed PWA on iPhone
freezes the screen for ~5s before the app becomes interactive.

### Reproduction
1. Install MoovX as PWA on iPhone (Add to Home Screen)
2. Close the PWA
3. Wait some time (or simply reopen)
4. Tap the PWA icon
5. Observe: 5s of frozen screen, then app loads normally

### Differential observation
- Mac Safari/Chrome: instant load (<1s)
- iPhone Safari (not PWA): not noticed as slow
- iPhone PWA: 5s freeze

This points to iOS-specific PWA wakeup behavior in addition to
some code-level fixes that could help.

### Code analysis (useClientDashboard.ts boot flow)

Phase A — Auth (sequential, ~200-500ms)
- supabase.auth.getSession()
- getRole() with 3 retries (potential 3x latency)

Phase B — Main data (parallel, ~800-1500ms on mobile)
- Promise.all of 11 Supabase fetches (already optimized)

Phase C — Post-processing (sequential, ~500-1000ms)
- scheduledHook.fetchScheduledSessions() — awaited
- analyticsHook.fetchAnalyticsData() — fire-and-forget (good)
- resolveCoachLink() — awaited, 2-3 sequential fetches

### Suspected root causes

1. iOS PWA wakeup overhead (~3s, biggest contributor)
2. getRole 3 retries on cold start (~500ms-1.5s)
3. workout_sessions JOIN workout_sets(*) on 90 rows (heavy payload)
4. resolveCoachLink sequential after Phase B (~500ms)
5. Service worker cache name moovx-v3 not bumped on deploys

### Proposed fix plan (dedicated session, 2-3h total)

A — Parallelize Phase C with Phase B (15 min, ~500ms gain)
B — Reduce getRole retries 3 -> 1 with shorter timeout (5 min)
C — Cache user role in localStorage (20 min, ~500ms-1s gain)
D — Lazy-load secondary data per-tab (1h)
   - progress_photos and body_measurements -> Profile tab
   - training_programs full list -> Training "All Programs" view
   - Keep at boot only Home-tab essentials
E — Service worker improvements (30 min)
   - Bump cache name on each deploy
   - Stale-while-revalidate for static assets
   - Verify skipWaiting + clients.claim

### Priority
Medium. Annoying but not blocking. To attack in a dedicated perf
session, after profiling tools (Lighthouse, Web Vitals) are set up
to measure before/after gains rigorously.
