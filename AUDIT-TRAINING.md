# AUDIT TRAINING — MoovX

> Date : 2026-04-21 | Branche : `main` | Commit : `0537306`

---

## 1. CARTOGRAPHIE

### 1.1 Composants (LOC + role)

| Fichier | LOC | Role | Complexite |
|---------|-----|------|------------|
| `app/components/tabs/TrainingTab.tsx` | 1 713 | Interface principale training : programmes, exercices, timer inline, gestion des sets | **XL** |
| `app/components/training/ProgramBuilder.tsx` | 1 280 | Creation/edition de programme (manual + IA), bibliotheque exercices | **XL** |
| `app/components/WorkoutSession.tsx` | 1 023 | Session fullscreen : validation series, timer repos, sauvegarde | **L** |
| `app/(dashboard)/page-desktop.tsx` | 947 | Dashboard desktop : stats training, resume seance | **L** |
| `app/components/tabs/training/TechniquePopup.tsx` | 570 | Popups educatives (dropset, rest-pause, superset, mechanical) | **M** |
| `app/components/tabs/training/TrainingExerciseCard.tsx` | 437 | Carte exercice : sets, inputs kg/reps, timer inline, historique | **M** |
| `app/api/generate-custom-program/route.ts` | 290 | Generation programme IA avec personnalisation genre/niveau | **M** |
| `lib/schedule-utils.ts` | 229 | Utilitaires sessions planifiees | **M** |
| `app/components/training/ExerciseLibrarySection.tsx` | 190 | Bibliotheque exercices + recherche alternatives | **S** |
| `lib/check-badges.ts` | 168 | Logique badges/achievements training | **S** |
| `app/api/generate-program/route.ts` | 152 | Generation programme IA standard (split guide) | **S** |
| `lib/session-types.ts` | 119 | Definitions types de seances + resolution mapping | **S** |
| `app/api/suggest-exercise/route.ts` | 79 | Suggestion exercice (Claude API) | **S** |
| `app/api/generate-exercise-instructions/route.ts` | 66 | Generation instructions exercice | **S** |
| `lib/utils/exercise.ts` | 64 | `getRestSeconds()` + `parseRestValue()` | **S** |
| `app/api/adapt-workout/route.ts` | 62 | Adaptation seance contrainte temps | **S** |
| `lib/gamification.ts` | 59 | XP + streak management | **S** |
| `lib/personal-records.ts` | 27 | Tracking records personnels | **S** |
| `lib/prefatigue-mapping.ts` | 20 | Regles pre-fatigue (isolation-first) | **S** |

**Total scope : ~7 355 LOC**

### 1.2 Flux de donnees principaux

#### A. Creation d'un programme

```
ProgramBuilder (UI state)
  |
  |-- [Mode IA] → fetch /api/generate-custom-program
  |     → Claude genere JSON avec rest_seconds: number
  |     → setProgramDays(aiResult.days)
  |
  |-- [Mode Manuel] → addExerciseToDay()
  |     → exercises_db.select() → { rest: exercise.rest_seconds || 90 }
  |
  +-- saveProgram()
        → supabase.from('custom_programs').insert({
            days: programDays  // JSONB array
          })
        → supabase.from('scheduled_sessions').insert(newSessions)
        → toast.success + onClose()
```

#### B. Chargement d'une seance

```
TrainingTab mount
  |
  +-- useEffect: load custom_programs (active)
  |     → supabase.from('custom_programs').select('*')
  |     → setActiveCustomProgram(active[0])
  |
  +-- baseExercises = customDayData?.exercises || coachProgram[trainingDay]
  |
  +-- resolvedExercises = baseExercises.map(ex => {
  |     if (ex.phases) → periodization override
  |     else → return ex as-is
  |   })
  |
  +-- trainingExercises = [...resolvedExercises, ...addedExercises]
  |
  +-- useEffect: load completedSets from localStorage
  |     key: moovx-sets-{todayStr}-{exName}
  |
  +-- <TrainingExerciseCard ex={ex} />
        → getRestSeconds(ex) pour chaque carte
```

#### C. Validation d'une serie

```
TrainingExerciseCard: onClick set checkbox
  |
  +-- onToggleSet(ex.name, setIdx, numSets, restSecs)
        |
        +-- [TrainingTab.toggleSet()]
              |-- localStorage.setItem(key, JSON.stringify(next))
              |-- setCompletedSets(updated)
              |-- if (!allDone && restSecs > 0):
              |     setRestMax(restSecs)
              |     setRestTimer(restSecs)
              |     setRestRunning(true)
              +-- useEffect[restRunning] → setInterval countdown

WorkoutSession: onClick validate button
  |
  +-- doValidate(eid, sid)
        |-- targetExo = exos.find(e => e.id === eid)  // SYNCHRONE
        |-- r = getRestSeconds(targetExo)
        |-- setExos(prev => mark set done)
        +-- startRest(r, eid, nextInfo)
              → setRestMax(r); setRestSecs(r); setRestOn(true)
```

### 1.3 Schema DB utilise par Training

| Table | Colonnes cles | Type | Relations |
|-------|---------------|------|-----------|
| **custom_programs** | `id`, `user_id`, `name`, `days` (JSONB), `is_active`, `source`, `current_week`, `total_weeks`, `phases` (JSONB) | Programme utilisateur | FK → auth.users |
| **workout_sessions** | `id`, `user_id`, `name`, `completed`, `duration_minutes`, `personal_records` (JSONB), `muscles_worked` (text[]) | Session completee | FK → auth.users |
| **workout_sets** | `id`, `session_id`, `user_id`, `exercise_name`, `set_number`, `weight`, `reps`, `completed` | Serie individuelle | FK → workout_sessions |
| **training_programs** | `id`, `name`, `program` (JSONB), `is_template`, `coach_id` | Template programme coach | FK → auth.users |
| **user_programs** | `id`, `user_id`, `training_program_id`, `active` | Attribution template | FK → training_programs |
| **custom_exercises** | `id`, `user_id`, `name`, `muscle_group`, `equipment`, `sets`, `reps`, `rest_seconds` | Exercice custom | FK → auth.users |
| **personal_records** | `id`, `user_id`, `exercise_name`, `record_type`, `value`, `unit` | Records (1RM, max_reps...) | FK → auth.users, UNIQUE(user_id, exercise_name, record_type) |
| **exercises_db** | `id`, `name`, `muscle_group`, `equipment`, `video_url`, `gif_url`, `variant_group` | Referentiel exercices | Pas de FK user |

**Structure JSONB `custom_programs.days[]` :**
```json
{
  "name": "Push A",
  "weekday": "lundi",
  "is_rest": false,
  "exercises": [
    {
      "name": "Developpe couche",
      "muscle_group": "chest",
      "sets": 4,
      "reps": 10,
      "rest": 120,          // ProgramBuilder (manual)
      "rest_seconds": 120,  // API generate-custom-program (IA)
      "tempo": "2-0-2",
      "technique": null,
      "phases": { "p1": {...}, "p2": {...}, "p3": {...} }
    }
  ]
}
```

### 1.4 Doublons detectes

| Doublon | Fichier A | Fichier B | Impact |
|---------|-----------|-----------|--------|
| **Timer de repos** | `TrainingTab.tsx:220-242` (setInterval inline) | `WorkoutSession.tsx:293-304` (setTimeout fullscreen) | 2 implementations differentes du meme timer |
| **Parse du repos** | `getRestSeconds()` centralise | `ProgramBuilder.tsx:262` (`exercise.rest_seconds \|\| 90`) | ProgramBuilder n'utilise PAS getRestSeconds a l'ecriture |
| **Sauvegarde sets** | `TrainingTab.tsx:503` (localStorage) | `WorkoutSession.tsx:389-401` (Supabase workout_sessions + custom_programs) | 2 strategies de persistence differentes |
| **Calcul progression** | `TrainingExerciseCard.tsx:64-77` (fetch previous sets par exercice) | `WorkoutSession.tsx:268-287` (fetch previous data par session) | N+1 queries dans TrainingExerciseCard |

---

## 2. STABILITE & ROBUSTESSE

### 2.1 Fallbacks silencieux dangereux

| Fichier:Ligne | Pattern | Risque |
|---------------|---------|--------|
| `ProgramBuilder.tsx:260` | `exercise.sets \|\| 3` | Ecrase 0 sets (improbable mais possible) |
| `ProgramBuilder.tsx:261` | `exercise.reps \|\| 10` | Ecrase 0 reps |
| `ProgramBuilder.tsx:262` | `exercise.rest_seconds \|\| 90` | Ecrase rest_seconds = 0 (supersets) |
| `WorkoutSession.tsx:234` | `useState(90)` pour restMax | Valeur initiale cosmetique, ecrasee par startRest |
| `TrainingTab.tsx:98` | `useState<number>(90)` pour restMax | Idem |
| `TrainingTab.tsx:578` | `rest_seconds: 90` (add exercise) | Defaut hardcode |
| `TrainingTab.tsx:619` | `rest_seconds: 90` (add exercise) | Idem |
| `ExerciseLibrarySection.tsx:92` | `rest_seconds: 90` (start workout) | Idem |
| `ExerciseDetailModal.tsx:24` | `rest \|\| '90'` | String au lieu de number |
| `ExerciseDetailModal.tsx:38` | `parseInt(String(editRest)) \|\| 90` | Ecrase 0 |
| `WorkoutSession.tsx:17-22` | Multiples `: any` sur props | TypeScript desactive |
| `TrainingTab.tsx:47-50` | Props `supabase: any, session: any, profile: any` | Aucune verification de type |
| `ProgramBuilder.tsx:17-22` | `supabase: any, session: any, editProgram?: any` | Idem |

### 2.2 Race conditions potentielles

| Fichier:Ligne | Pattern | Statut |
|---------------|---------|--------|
| `WorkoutSession.tsx:355-369` | doValidate : r calcule synchrone avant setExos | **CORRIGE** (commit 9ff727e) |
| `TrainingTab.tsx:220-226` | useEffect[restRunning] sans restTimer en deps | **OK** : updater function `prev => prev - 1` evite la stale closure |
| `TrainingTab.tsx:636-648` | `await addXP(); await updateStreak()` dans `try {} catch {}` vide | **RISQUE** : echec silencieux sans retry |
| `WorkoutSession.tsx:393-405` | `await supabase.from('custom_programs').upsert()` sans gestion erreur | **RISQUE** : sauvegarde perdue si offline |

### 2.3 Magic numbers

| Valeur | Signification | Occurrences | Fichiers |
|--------|---------------|-------------|----------|
| `90` | Repos defaut (secondes) | 12 | TrainingTab, WorkoutSession, ProgramBuilder, ExerciseLibrary, ExerciseDetailModal, exercise.ts |
| `3` | Sets defaut | 5 | ProgramBuilder, WorkoutSession, TrainingTab |
| `10` | Reps defaut | 3 | ProgramBuilder, WorkoutSession |
| `12` | Reps defaut (add exercise) | 2 | TrainingTab:578, 619 |
| `1000` | Interval timer (ms) | 4 | TrainingTab:222, 247, WorkoutSession:291, 294 |
| `3000` | Max tokens Claude | 1 | generate-program:113 |
| `4000` | Max tokens Claude | 1 | generate-custom-program:236 |

### 2.4 Gestion d'erreurs

**Requetes Supabase :**
- `TrainingTab.tsx` : `.then(({ data }: any) => ...)` sans `.catch()` sur la plupart des queries → echecs silencieux si reseau down
- `WorkoutSession.tsx:393-405` : sauvegarde session sans gestion d'erreur
- `TrainingExerciseCard.tsx:64-77` : fetch previous sets sans `.catch()`

**Appels API Claude :**
- `generate-program/route.ts:119` : verifie `response.ok` ✓
- `generate-custom-program/route.ts:228` : verifie `response.ok` ✓
- **AUCUN timeout** sur les 5 routes API (fetch sans AbortController)
- **AUCUNE validation** du body request avant envoi a Claude

**Validation inputs :**
- Reps string `"10-12"` gere via `parseInt()` avec fallback ✓
- Aucun schema Zod sur les API routes training

### 2.5 Coherence du schema de donnees

| Couche | Champ | Type | Exemple |
|--------|-------|------|---------|
| DB (custom_programs JSONB) | `rest_seconds` | number | `120` |
| DB (custom_programs JSONB) | `rest` | number | `120` (ProgramBuilder manual) |
| DB (custom_exercises) | `rest_seconds` | number | `90` |
| API generate-program | `rest_seconds` | number | `90` (apres fix a197d1f) |
| API generate-custom-program | `rest_seconds` | number | `120` |
| UI ProgramBuilder state | `rest` | number | `120` |
| UI WorkoutSession (Exo) | `rest` | number | `120` (post-getRestSeconds) |
| Coach module | `rest` | number/string | `"60s"` dans certains cas |
| `getRestSeconds()` | lit `rest_seconds` puis `rest` | number/string | Tolere tous formats |

**Risque residuel** : le champ `rest` coexiste avec `rest_seconds` dans les JSONB. `getRestSeconds()` mitige mais la confusion persiste pour les developpeurs.

---

## 3. UX

### 3.1 Feedback visuel manquant

| Manque | Localisation | Severite |
|--------|-------------|----------|
| Pas de loading state pendant le chargement des programmes | `TrainingTab.tsx:280-300` | **Haute** |
| Pas de loading state pendant le chargement du cache exercices | `TrainingTab.tsx:310-317` | Moyenne |
| Suppression de programme sans confirmation | `TrainingTab.tsx:429-434` (deleteProgram) | **Critique** |
| Suppression d'exercice sans confirmation | `ProgramBuilder.tsx:272-281` (removeExerciseFromDay) | Haute |
| Pas d'indicateur "modifications non sauvegardees" | `TrainingTab.tsx:120-122` (editMode) | Moyenne |
| Pas d'indicateur superset (rest=0) | Aucun fichier | Basse |
| Pas de warning avant navigation pendant seance active | Aucun `beforeunload` handler | **Haute** |

### 3.2 Accessibilite

| Probleme | Detail | Severite |
|----------|--------|----------|
| **0 aria-label** dans tout le module training | Aucun bouton n'a de label descriptif | **Critique** |
| Touch targets < 44x44px | `TrainingExerciseCard.tsx:301` (28x28), `:369` (28x28), `:188` (32x32) | **Haute** |
| Pas de `role="timer"` ni `aria-live` sur les timers | `TrainingTab.tsx:220+`, `WorkoutSession.tsx:711+` | Moyenne |
| Contraste gold (#D4AF37) sur dark bg | Ratio ~5.5:1 — passe WCAG AA mais borderline | Basse |

### 3.3 Mobile-first

| Point | Statut | Detail |
|-------|--------|--------|
| Safe-area top/bottom | **Partiel** | WorkoutSession ✓, ExerciseLibrary ✓, certains modals ✗ |
| Keyboard inputs iOS | ✓ | `inputMode="decimal"/"numeric"` sur les inputs kg/reps |
| Overlap zones tactiles | ⚠️ | Rows de sets avec `padding: 5px 14px` serrees |
| Scroll pendant timer | ✓ | Timer inline ne bloque pas le scroll |

### 3.4 Flux utilisateur friction

- **4-5 taps pour demarrer une seance** : chip jour → scroll → bouton Commencer → expand exercice → saisie
- **Progression preservee** au changement d'onglet : localStorage persiste les sets ✓
- **Pas de warning** si navigation pendant seance active ✗
- **Timer perdu** si refresh page (state in-memory uniquement) ✗

### 3.5 Performance percue

- Animations Framer Motion sur les cartes exercices ✓
- Timer setInterval(1s) suffisant pour l'usage ✓
- Aucun blocage d'interaction pendant les animations ✓
- Pas de skeleton/shimmer pendant le chargement ✗

---

## 4. PERFORMANCE

### 4.1 Re-renders inutiles

| Probleme | Localisation | Impact |
|----------|-------------|--------|
| **0 useMemo/useCallback** dans TrainingTab (1 713 LOC) | Tout le fichier | Haute |
| **0 React.memo** sur les composants enfants | TrainingExerciseCard, ProgramBuilder sections | Haute |
| `trainingExercises` recalcule a chaque render | `TrainingTab.tsx:172-175` | Moyenne |
| `weekSessions` recalcule a chaque render | `TrainingTab.tsx:187-217` | Moyenne |
| Callbacks `onToggleSet`, `onAddSet`, `onUpdateInput` recrees a chaque render | `TrainingTab.tsx:1000+` | Haute |

### 4.2 Requetes Supabase

| Probleme | Localisation | Impact |
|----------|-------------|--------|
| **N+1 : previous sets** | `TrainingExerciseCard.tsx:64-77` — 1 query par exercice (6 exos = 6 queries) | **Haute** |
| Pas de `.catch()` | Multiples queries dans TrainingTab | Moyenne |
| Colonnes specifiques ✓ | `select('id, name, muscle_group')` pas de `select('*')` | OK |
| Cleanup useEffect ✓ | Refs empechent les double-fetch | OK |

### 4.3 Bundle size

| Point | Statut |
|-------|--------|
| Framer Motion : imports specifiques (`motion`, `AnimatePresence`) | ✓ OK |
| Lazy loading videos/images exercices | ✗ Manquant |
| Design tokens : import complet meme si partiel utilise | ⚠️ Mineur |

### 4.4 LocalStorage

| Point | Detail |
|-------|--------|
| Pattern cles | `moovx-sets-{date}-{exName}`, `moovx-inputs-{date}-{exName}` |
| Taille estimee/jour | ~2 KB (3 sets x 6 exos x ~100 bytes) |
| Accumulation mensuelle | ~60 KB (pas de nettoyage des anciennes dates) |
| Cleanup apres session | ✓ `TrainingTab.tsx:731-732` |
| Cleanup anciennes dates | ✗ **Aucun mecanisme** |
| SSR safety | ✓ `typeof window !== 'undefined'` partout |

---

## 5. CODE QUALITY

### 5.1 Composants trop gros

| Fichier | LOC | useState | useEffect | Fonctions internes | Split recommande |
|---------|-----|----------|-----------|-------------------|------------------|
| **TrainingTab.tsx** | 1 713 | 49 | 10 | 7 | `useActiveSets`, `useRestTimer`, `useProgramActivation`, `TrainingHeader`, `TrainingDayView`, `ProgramListModal` |
| **ProgramBuilder.tsx** | 1 280 | 32 | 2 | 4 | `ProgramBuilderAI`, `ProgramBuilderManual`, `DayEditor`, `ExerciseSearchOverlay` |
| **WorkoutSession.tsx** | 1 023 | 33 | 7 | 24 | `useWorkoutTimer`, `useRestTimer`, `ExerciseRow`, `RestOverlay`, `SessionSummary` |

### 5.2 TypeScript

| Metrique | Total | Detail |
|----------|-------|--------|
| `: any` | **88** | WorkoutSession: 38, TrainingTab: 44, ProgramBuilder: 6 |
| `as any` | **15** | WorkoutSession: 5, ProgramBuilder: 8, TrainingTab: 2 |
| Interfaces partagees | **0** | Pas de fichier types centralise pour Exercise/Program/Day |
| Interfaces dupliquees | **3** | `Exo` (WorkoutSession), `Exercise` (CoachPrograms), props typing (TrainingTab) |

### 5.3 Nommage

**Variables ambigues single-letter :**
- `e`, `p`, `x` dans les `.map()/.filter()` callbacks — 30+ occurrences
- `d` pour `[...editedDays]` — 5 fois dans TrainingTab
- `n` pour `Number(ex.sets)` et `name.trim()` — meme fichier
- `r` pour rest duration — WorkoutSession doValidate

**Francais/Anglais mixte :**
- Variables : anglais (`restTimer`, `completedSets`, `trainingDay`)
- UI labels : francais ("AJOUTER", "TERMINER", "Repos")
- Commentaires : principalement francais
- DB fields : anglais snake_case (`rest_seconds`, `muscle_group`)

### 5.4 Tests

| Metrique | Valeur |
|----------|--------|
| Tests unitaires training | **0** |
| Tests `getRestSeconds` / `parseRestValue` | **0** |
| Tests integration flux seance | **0** |
| Couverture estimee | **0%** |

### 5.5 Dette technique

| Type | Occurrences | Detail |
|------|-------------|--------|
| TODO/FIXME/HACK | **0** | Aucun dans le scope training |
| `@deprecated` | **1** | `lib/utils/exercise.ts:3` — champ `rest` deprecie en faveur de `rest_seconds` |
| Code commente | **0** | Aucun bloc commente detecte |
| Fichiers .bak/.old | **0** | Clean |

---

## 6. PRIORISATION

### 6.1 Quick wins (< 30 min chacun)

1. **Ajouter confirmation avant suppression programme** — `TrainingTab.tsx:429` — dialog modal simple
2. **Touch targets 44x44px** — `TrainingExerciseCard.tsx:301, 369` — ajuster width/height/padding
3. **Ajouter `aria-label`** sur les boutons timer (play, skip, +30s) — 15 min
4. **Ajouter timeout aux fetch Claude** — AbortController(30s) sur les 5 routes API
5. **Extraire constantes** `DEFAULT_REST = 90`, `DEFAULT_SETS = 3`, `DEFAULT_REPS = 10` dans `lib/constants.ts`

### 6.2 Refactors moyens (1-3 h chacun)

1. **Batch previous sets query** — `TrainingExerciseCard.tsx:64` — 1 query au lieu de N
2. **Ajouter useMemo/useCallback** dans TrainingTab pour `trainingExercises`, `weekSessions`, callbacks enfants
3. **Persister timer state** dans localStorage (restTimer, restMax, workoutStarted)
4. **Ajouter beforeunload warning** pendant seance active
5. **Cleanup localStorage** ancien : supprimer les cles `moovx-sets-*` de plus de 7 jours

### 6.3 Gros chantiers (> 3 h)

1. **Split TrainingTab.tsx** (1 713 LOC → 5-6 fichiers + hooks custom)
2. **Typage strict** : creer `types/training.ts` avec Exercise, Program, Day, Set + eliminer les 88 `any`
3. **Unifier le schema `rest`/`rest_seconds`** : migration DB + update ProgramBuilder + coach module
4. **Offline queue** : IndexedDB pour les sauvegardes en attente + retry sur reconnexion
5. **Tests unitaires** : `parseRestValue`, `getRestSeconds`, `toggleSet`, `doValidate` (80% coverage cible)

### 6.4 Ordre recommande d'attaque

| # | Action | Raison |
|---|--------|--------|
| 1 | **Confirmation suppression programme** | Bug UX critique : un tap accidentel detruit le programme sans recours |
| 2 | **Batch previous sets query** | Performance : elimine N+1 queries, visible sur chaque ouverture de jour |
| 3 | **Split TrainingTab.tsx** | Prerequis pour toute evolution future — le fichier est inmaintenable a 1 713 LOC |
| 4 | **Typage strict training** | Previent les bugs de schema (rest vs rest_seconds) a la compilation |
| 5 | **Tests getRestSeconds + parseRestValue** | Le parser tolere 5 formats differents sans aucun test — regression garantie |

---

## 7. RISQUES LATENTS

| Risque | Severite | Probabilite | Detail |
|--------|----------|-------------|--------|
| **Exercice supprime pendant seance active** | Haute | Moyenne | `restingSet` reference un exercice orphelin → timer phantom, UI inchoerente. Aucun guard dans `editRemoveEx()` |
| **Offline : sauvegarde perdue** | Haute | Moyenne | `addXP()` + `updateStreak()` dans `try {} catch {}` vide (`TrainingTab.tsx:636-648`). Aucun retry, aucun queue offline |
| **Cache PWA stale** | Moyenne | Haute | `sw.js` cache `moovx-v3` sans mecanisme de versioning. Pas de toast "mise a jour disponible" |
| **Changement de programme en pleine seance** | Haute | Basse | localStorage indexe par `date-exName` sans `programId` → merge silencieux si meme nom d'exercice |
| **Refresh page pendant seance** | Moyenne | Moyenne | Sets preserves (localStorage) mais timer, temps ecoule et contexte de repos perdus (state in-memory) |
| **rest=0 (superset)** | Moyenne | Moyenne | Timer skippe correctement (`restSecs > 0` check) mais aucun indicateur visuel superset. Le `\|\|` dans ProgramBuilder ecrase 0 → 90 |
| **5 API routes sans timeout** | Haute | Basse | Fetch vers Anthropic sans AbortController → client bloque indefiniment si API lente |

---

*Fin du rapport d'audit Training.*
