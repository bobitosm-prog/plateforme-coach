# Performance Issues — Pending

## Workout session : freeze au scroll pendant une séance active

### Reported
2026-06-07 — Freeze écran pendant une séance active (scroll des séries)
sur iPhone PWA. Déjà arrivé plusieurs fois. Séance normale (pas un
problème de volume de données).

### Diagnostic (audit statique, pas de profiler dispo)
- Intervals de WorkoutSession audités : tous propres (cleanup OK, pas
  d'accumulation). Écarté.
- Halo blur(80px) L.734 : monté seulement sur l'écran de récap (done),
  pas pendant la séance active. Écarté pour ce freeze (mais reste un coût
  GPU à corriger un jour — voir dette ci-dessous).
- CAUSE RETENUE : header sticky (L.930) avec backdrop-filter blur(20px)
  sur fond OPAQUE (#0D0B08). Le flou était calculé à chaque frame de
  scroll par iOS, pour zéro pixel visible (fond opaque le recouvre).
  Combo sticky + backdrop-filter + scroll permanent = profil classique
  du freeze de composition iOS.

### Fix (commit 08b449b)
Retrait du backdrop-filter du header (rendu pixel-identique, fond opaque).

### Validation
Pas de profiler -> validé par ABSENCE de récidive sur séances réelles,
pas par mesure. Si le freeze revient, suspects suivants :
- barres fixes L.135/225 (backdrop-filter blur sur rgba .9/.95, blur quasi
  invisible mais coût quasi inutile)
- halo blur(80px) L.734 (écran récap) + duplicata OnboardingFitness L.253
- repaint au scroll non lié au blur

### Dette perf liée (non bloquant)
- Pattern halo `filter: blur(80px)` dupliqué (WorkoutSession récap +
  OnboardingFitness). Un radial-gradient plus large sans filter rendrait
  pareil sans coût GPU. À refactorer si freeze sur écrans concernés.

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
