# WorkoutSession — Bugs Pending

Two bugs identified during a real iPhone PWA workout session on
2026-04-25, deferred to a dedicated session because they touch
the timer/persistence logic.

## Bug 1 — In-session progress lost when app is backgrounded

### Reproduction
1. Start a workout (autonomous client)
2. Enter weights, reps, check off some sets
3. Swipe up to close the PWA (or switch app)
4. Reopen the PWA
5. Workout name and exercises are restored, but all weights/reps/
   checked sets are lost

### Cause (file: app/components/WorkoutSession.tsx)
WorkoutSession state is held only in React useState. The localStorage
key 'moovx_active_workout' (set in useClientDashboard.ts ~line 231)
only persists the workout shape (name + exercises), not the live
progression (weights, reps, sets completed).

### Proposed fix
Persist live state to localStorage on every set update:
- localStorage.setItem('moovx_workout_progress_<sessionId>', JSON.stringify({
    sets: [...],
    weights: [...],
    reps: [...],
    checked: [...],
    elapsed: ...
  }))
- On WorkoutSession mount, hydrate state from localStorage if present
- Clear the key on workout finish

### Estimated effort
30-45 min, focused. Touch points: WorkoutSession.tsx state setters
(track them all), useEffect on mount, useEffect on unmount.

## Bug 2 — Rest timer broken after iPhone is locked

### Reproduction
1. Start a workout
2. Complete a set, rest timer starts (e.g. 90s)
3. Lock the iPhone manually (power button)
4. Wait > 10s
5. Unlock the iPhone
6. Rest timer either jumps to 0 instantly or shows wrong value

### Cause (file: app/components/WorkoutSession.tsx)
The rest timer (line ~296) uses a setTimeout chain:
  setTimeout(() => setRestSecs(s => s - 1), 1000)
iOS suspends setTimeout when the screen is locked. On unlock, the
queued timeouts fire in burst, decrementing the counter rapidly.

The Wake Lock API + invisible video fallback (lines 307-342) prevent
automatic screen-off but do NOT prevent manual locking.

### Proposed fix
Switch the timer to a Date.now()-based model:
- Store a restEndsAt = Date.now() + restMs when the timer starts
- Use a single setInterval(..., 100ms) that recomputes:
    const remaining = Math.max(0, restEndsAt - Date.now())
    setRestSecs(Math.ceil(remaining / 1000))
- This way, on unlock, the timer immediately reflects real elapsed
  time without burst-firing

Same approach for the elapsed-time counter.

### Estimated effort
20-30 min. Touch points: the rest timer effect (line ~290), the
elapsed timer effect (line ~293).

## Priority

Both bugs are user-facing and degrade the core workout UX. Bug 1
(progress loss) is the more frustrating because it costs the user
real input data. Bug 2 (timer broken on lock) is annoying but
recoverable (the user can mentally track rest).

Recommended order: fix Bug 1 first (data integrity), then Bug 2
(timer accuracy).
