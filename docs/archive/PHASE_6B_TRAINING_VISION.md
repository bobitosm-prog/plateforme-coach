# Phase 6B — Training Closed Loop AI

> Vision : transformer MoovX en système expert de coaching automatisé qui personnalise le programme selon l'équipement réel, substitue intelligemment les exercices manquants et applique une périodisation scientifique 8 semaines.
>
> **État de ce document** : v1.0 — 30 mai 2026
> **Statut** : Architecture validée, implémentation en 7 sous-features sur 5-7 sessions
> **Source** : Audit terrain MoovX du 30 mai 2026 (architecture data) + décisions senior expert coaching

---

## TL;DR (lecture 2 min)

MoovX a déjà 70% de la fondation technique pour cette vision :
- `custom_programs` (29 rows actifs) supporte nativement le multi-phases, multi-semaines, et le calendrier
- `exercises_db` (178 exos) contient déjà la colonne `equipment` et `variant_group` (cette dernière inexploitée)
- `scheduled_sessions` (133 rows) gère le calendrier

Ce qui manque :
1. **Normalisation** des 43 valeurs `equipment` chaotiques (`Haltères`, `haltères`, `Haltère`...) vers 6 enum standards
2. **Profile équipement** utilisateur (2 nouvelles colonnes `training_location` + `home_equipment[]`)
3. **Substitution intelligente** via `variant_group` peuplé pour les ~178 exos
4. **Logique IA enrichie** dans `/api/generate-custom-program` pour prendre en compte equipment
5. **Auto-regen 14j** via cron (équivalent Phase 5) avec périodisation 8 semaines

**Découpage** : 7 sous-features, ~15-18h de dev total, étalé sur 5-7 sessions.

---

## 1. Vision produit

### 1.1 Pourquoi cette feature

Aujourd'hui MoovX génère un programme générique à l'onboarding. KAI Suisse fait pareil. Le programme ne s'adapte pas dans le temps. Si l'user clique "Appliquer" sur un diagnostic hebdomadaire, ses macros sont updatées mais son programme reste figé.

Phase 6B transforme MoovX en **coach numérique adaptatif** :
- Le programme est généré selon l'équipement **réel** de l'user (maison vs salle)
- Si une machine manque, l'IA **substitue** par un exercice équivalent au même groupe musculaire
- Le programme suit une **périodisation scientifique** sur 8 semaines (progression linéaire + variation d'exos)
- Tous les 14 jours, le programme se **régénère automatiquement** en intégrant les performances réelles (workout_sets)

### 1.2 Cibles utilisateur

| Persona | Équipement typique | Programme adapté |
|---------|-------------------|-------------------|
| **Sarah, débutante home** | 2 haltères 10kg + tapis | Push-ups, squats poids du corps, rows haltère, deadlifts roumains haltère |
| **Marc, intermédiaire gym** | Salle de sport complète | Bench press barre, squat barre, deadlifts, leg press, machines isolations |
| **Tom, hybride** | Salle 3x/sem + haltères maison 2x/sem | Programme bi-modal : compounds en salle, accessoires haltère à la maison |

### 1.3 Différenciation vs KAI Suisse

| Aspect | KAI Suisse (estimation) | MoovX Phase 6B |
|--------|------------------------|------------------|
| Personnalisation équipement | Non | **Oui** (multi-select) |
| Substitution exercices | Non | **Oui** (variant_group) |
| Périodisation | Programme fixe | **Cycles 8 sem, 4 phases** |
| Régen automatique | Non | **Tous les 14j + sur Apply diagnostic** |
| Catalogue exercices home | Limité | **Tagging dédié** |

---

## 2. État actuel — audit du 30 mai 2026

### 2.1 Architecture data — 2 systèmes parallèles

**Système 1 (USER self-service — vivant)** :
```
custom_programs (29 rows)
   └→ scheduled_sessions (133 rows)
   └→ workout_sessions (93 rows)
        └→ workout_sets (1371 rows)
```

**Système 2 (COACH-side — dormant)** :
```
training_programs (12) → program_days (16) → program_exercises (77)
client_programs (2)
```

**Tables mortes** (0 rows, à supprimer plus tard) :
- `user_programs`
- `workouts`
- `cardio_sessions`

**Décision** : Phase 6B s'inscrit dans le **Système 1 uniquement**. Le Système 2 (coach-side) est hors scope.

### 2.2 Schema `custom_programs` (vivant)

```sql
id            uuid PK
user_id       uuid
name          text
description   text
days          jsonb        -- structure programme (jours+exos)
phases        jsonb        -- MULTI-PHASES déjà supporté
total_weeks   integer      -- CALENDRIER multi-semaines natif
current_week  integer      -- POSITION dans le cycle
start_date    date         -- début du cycle
scheduled     boolean      -- calendrier activé
source        text         -- 'manual' / 'onboarding' / 'auto_regen' / 'apply_diagnostic'
is_active     boolean      -- soft delete (pattern meal_plans)
created_at    timestamptz
updated_at    timestamptz
```

**Excellente nouvelle** : ce schema supporte déjà 90% de la vision. Pas de migration lourde.

### 2.3 Schema `exercises_db` (178 exos)

```sql
id                  uuid PK
name                text         -- FR
name_en             text
name_de             text
muscle_group        text         -- 'Épaules', 'Dos', 'Jambes'...
secondary_muscles   text
equipment           text         -- ⚠️ 43 valeurs distinctes (chaos)
difficulty          text
category            text         -- ⚠️ NULL partout
description / tips  text + i18n
variant_group       text         -- ⚠️ NULL partout (mais existe!)
video_url           text         -- contenu visuel OK
gif_url             text
is_custom           boolean      -- user-created exo
```

**Constats** :
- `equipment` chaotique (`Haltères`, `haltères`, `Haltère`, `Barre, Banc`, `Aucun ou Sol`...)
- `variant_group` existe dans le schema mais jamais peuplé → **opportunité substitution**
- `category` jamais peuplé → pas un blocker

### 2.4 Distribution `equipment` brute

43 valeurs distinctes pour 178 exos. Top 10 :

| Valeur | Count |
|--------|-------|
| Haltères | 27 |
| Machine | 26 |
| Barre | 24 |
| Poids du corps | 16 |
| Poulie | 15 |
| barre (minuscule) | 8 |
| haltères (minuscule) | 6 |
| Aucun | 6 |
| poids du corps (minuscule) | 4 |
| poulie (minuscule) | 4 |

Le reste = 33 valeurs avec 1-3 occurrences (combinaisons libres, positions, kettlebell, etc.).

---

## 3. Architecture cible

### 3.1 Décisions structurantes (senior)

#### Décision 1 — Définition "exercice maison"

**Standard** : bodyweight + haltères + bandes élastiques + kettlebell.
Pas de barre olympique (sous-population <5%, ils cocheront "gym").

**Justification** : sweet spot accessible (50-150€ matos) qui couvre 70-80% des cas home sans complexifier le moteur de substitution.

#### Décision 2 — Enum `equipment` à 6 valeurs

```typescript
type Equipment =
  | 'barbell'      // barre olympique, EZ, T-bar, disques
  | 'dumbbell'     // haltères (ajustables ou fixes)
  | 'kettlebell'   // kettlebells
  | 'band'         // bandes élastiques, cordes, roue abdo
  | 'bodyweight'   // poids du corps, barres parallèles, box
  | 'machine_gym'  // machines, poulies, T-bar machine, cardio machines
```

Flag dérivé :
```typescript
home_friendly = equipment IN ('dumbbell', 'kettlebell', 'band', 'bodyweight')
```

#### Décision 3 — Profile équipement utilisateur

**2 questions onboarding** :

Question 1 — "Où t'entraînes-tu ?" (radio)
- 🏠 À la maison (`home`)
- 🏋️ En salle de sport (`gym`)
- 🔁 Les deux (`both`)

Question 2 (conditionnelle si `home` ou `both`) — "Quel matériel as-tu chez toi ?" (multi-select)
- ☐ Haltères (`dumbbell`)
- ☐ Kettlebell (`kettlebell`)
- ☐ Bandes élastiques (`band`)
- (Bodyweight assumé)

**Schema profile** :
```sql
ALTER TABLE profiles
  ADD COLUMN training_location text  -- 'home' | 'gym' | 'both'
  ADD COLUMN home_equipment text[];  -- ['dumbbell', 'band']
```

#### Décision 4 — Périodisation 8 semaines (4 phases de 2 sem)

Pattern coaching pro :

```
Cycle de 8 semaines :

Semaines 1-2 (Bloc A — Adaptation)
  → Exos A, charges modérées, 4 séries × 8-12 reps
  → Régen S3 : MÊMES exos, charges +5% ou reps +1 (progression linéaire)

Semaines 3-4 (Bloc A continue)
  → Exos A, progression poursuivie
  → Régen S5 : NOUVEAUX exos (mêmes muscle groups, mouvements variés)

Semaines 5-6 (Bloc B — Variation hypertrophie)
  → Exos B, hypertrophie pure 3 séries × 10-15 reps
  → Régen S7 : NOUVEAUX exos

Semaines 7-8 (Bloc B continue + deload léger)
  → Exos B', deload semaine 8 (volume -20%)
  → Régen S9 : NOUVEAU CYCLE 8 sem complet avec gains accumulés
```

**Implication technique** : `custom_programs.phases` jsonb stocke l'historique des blocs. `current_week` indique la position. Le cron `/api/training-regen-cron` détermine si c'est "progression simple" (semaine paire d'un même bloc) ou "variation" (changement de bloc).

#### Décision 5 — Substitution intelligente via `variant_group`

Peupler `exercises_db.variant_group` avec ~30 groupes. Exemples :

| variant_group | Exos membres | Equipment |
|---------------|--------------|-----------|
| `chest_press_horizontal` | Bench press barre, Bench haltères, Push-up | barbell, dumbbell, bodyweight |
| `row_horizontal` | Rowing barre, Rowing haltère, Rowing élastique | barbell, dumbbell, band |
| `squat_pattern` | Back squat, Goblet squat KB, Bodyweight squat | barbell, kettlebell, bodyweight |
| `hip_hinge` | Deadlift, RDL haltères, Good morning band | barbell, dumbbell, band |
| `vertical_pull` | Pull-up, Tirage poulie, Band pull-down | bodyweight, machine_gym, band |
| ... ~25 groupes supplémentaires |

**Logique substitution** :
```typescript
function substituteIfNeeded(exo, userEquipment) {
  if (userEquipment.includes(exo.equipment)) return exo

  // Trouver variants dans le même variant_group avec equipment dispo
  const variants = exercises_db
    .where('variant_group', exo.variant_group)
    .where('equipment', 'IN', userEquipment)

  return variants[0] ?? bodyweightFallback(exo.muscle_group)
}
```

### 3.2 Migration DB cible (résumé)

```sql
-- Migration 1 : normaliser exercises_db.equipment
ALTER TABLE exercises_db ALTER COLUMN equipment TYPE text;
-- Puis UPDATE batch (script de mapping 43 → 6 valeurs)

-- Migration 2 : profile équipement
ALTER TABLE profiles
  ADD COLUMN training_location text CHECK (training_location IN ('home','gym','both')),
  ADD COLUMN home_equipment text[];

-- Migration 3 : peupler variant_group (UPDATE batch via IA Opus)

-- Migration 4 : enrichir custom_programs avec metadata utile
ALTER TABLE custom_programs
  ADD COLUMN cycle_block text,        -- 'A1', 'A2', 'B1', 'B2'
  ADD COLUMN next_regen_at timestamptz; -- équivalent next_diagnostic_at
```

### 3.3 Architecture endpoints cible

```
POST /api/generate-custom-program (REFACTO F6.B.4)
  ├─ Input : { user_id, override_macros?, override_equipment?, cycle_block? }
  ├─ Pipeline :
  │   1. Fetch profile (training_location, home_equipment, objective, tdee, ...)
  │   2. Compute substitution map (equipment → exos disponibles)
  │   3. Build system prompt avec context complet
  │   4. Call Opus 4.7 via tool_use (schema strict)
  │   5. Substitute si exo retourné par IA pas dans equipment user
  │   6. Insert custom_programs (is_active=true, soft-delete previous)
  │   7. Generate scheduled_sessions pour les 14 prochains jours
  │   8. Set next_regen_at = NOW + 14 days
  └─ Output : { program_id, scheduled_sessions_count }

POST /api/training-regen-cron (NOUVEAU F6.B.6)
  ├─ Auth : Bearer CRON_SECRET (pattern Phase 5)
  ├─ Fetch users where next_regen_at <= NOW
  ├─ Pour chaque user (batch parallel concurrency=3, plus lent que diagnostic) :
  │   1. Lire workout_sets des 14 derniers jours (progression réelle)
  │   2. Déterminer le prochain cycle_block (A1→A2, A2→B1, etc.)
  │   3. Call generate-custom-program avec context historique
  │   4. Push notification "Ton programme évolue cette semaine"
  └─ Output : { total, success, skipped, errors }
```

---

## 4. Découpage en 7 sous-features

### F6.B.0 — Normalisation `exercises_db.equipment` (2h)

**Objectif** : transformer 43 valeurs texte chaotique → 6 enum standards.

**Stratégie** :
1. Créer un mapping manuel `lib/training/equipment-normalize.ts` (43 → 6)
2. Migration SQL idempotente qui applique le mapping via CASE WHEN
3. Vérifier 100% des 178 rows ont equipment ∈ {6 valeurs}
4. Ajouter check constraint pour empêcher futures pollutions

**Livrables** :
- `lib/training/equipment-normalize.ts` (mapping + tests Node)
- `supabase/migrations/YYYYMMDDHHMMSS_normalize_exercises_equipment.sql`

**Validations** :
- Avant : 43 valeurs distinctes, 178 rows
- Après : 6 valeurs distinctes, 178 rows, 0 NULL
- CHECK constraint ajoutée

**Rollback** : la migration garde une colonne `equipment_legacy` text pour restaurer si besoin.

**Dépendances** : aucune.

---

### F6.B.1 — Migration profile équipement + onboarding (2h)

**Objectif** : ajouter les 2 colonnes profile + intégrer les 2 questions dans l'onboarding.

**Stratégie** :
1. Migration SQL : `ALTER TABLE profiles ADD COLUMN training_location, home_equipment`
2. Backfill users existants : `training_location = 'gym'`, `home_equipment = []` (assomption majoritaire)
3. Patch `OnboardingV2Content.tsx` (flux SOLO) : 2 nouveaux steps après les objectifs
4. UI : radio + multi-select avec icônes
5. i18n FR/EN/DE pour les 2 questions

**Livrables** :
- Migration SQL idempotente
- Patch `OnboardingV2Content.tsx` + 2 nouveaux step components
- Clés i18n × 3 langues

**Validations** :
- Schema : 2 nouvelles colonnes nullable
- Backfill : 100% users existants ont `training_location` non null
- E2E : nouveau user complète l'onboarding et les 2 réponses sont sauvées

**Rollback** : `ALTER TABLE ... DROP COLUMN`.

**Dépendances** : F6.B.0 (les valeurs `home_equipment` doivent matcher l'enum normalisé).

---

### F6.B.2 — Peupler `exercises_db.variant_group` (3h, gros tagging)

**Objectif** : peupler `variant_group` pour les 178 exos afin d'activer la substitution intelligente.

**Stratégie** :
1. Définir ~30 variant_groups (chest_press_horizontal, squat_pattern, etc.)
2. Tag manuel des 178 exos via script Node OU batch IA (Opus 4.7 reçoit la liste + définitions, retourne le mapping)
3. Migration SQL UPDATE batch
4. Vérification : chaque variant_group a au moins 2-3 exos avec equipment varié

**Décision tagging** :
- **Option A** : manuel 178 lignes (3-4h focused)
- **Option B** : batch IA (1h dev + $0.50 Opus + 30 min review)

**Recommandation** : Option B. Le tagging IA sera proche correct à 90% et tu reviens valider à la main les 10% restants.

**Livrables** :
- `lib/training/variant-groups.ts` (définitions des 30 groupes)
- Script Node `scripts/tag-exercises-variants.ts` (one-shot)
- Migration SQL idempotente UPDATE batch
- (optionnel) Output review CSV pour validation humaine

**Validations** :
- 100% exos ont `variant_group` non null
- Aucun variant_group < 2 exos (sinon substitution impossible)
- Chaque variant_group a au moins 2 equipment différents

**Rollback** : `UPDATE exercises_db SET variant_group = NULL`.

**Dépendances** : F6.B.0 (les variant_groups raisonnent sur l'enum equipment).

---

### F6.B.3 — Helper `buildProgramParams` (1h)

**Objectif** : helper pur qui construit le body POST pour `/api/generate-custom-program`, équivalent F6.A.1 pour le training.

**Stratégie** : pattern identique à `buildMealPlanParams`.

**Signature** :
```typescript
buildProgramParams(
  profile: Profile,
  overrides?: { calorie_goal?, ... },
  context?: { cycle_block?, previous_program_id?, recent_workout_sets? }
): ProgramGenerationParams
```

**Livrables** :
- `lib/training/build-program-params.ts`
- Tests runtime Node (8-10 cas)

**Validations** :
- Tous types corrects (cycle_block: 'A1'|'A2'|'B1'|'B2')
- Defaults safe pour profile incomplet
- Mapping equipment user → liste exos disponibles

**Dépendances** : F6.B.1 (profile.training_location + home_equipment), F6.B.0 (equipment normalisé).

---

### F6.B.4 — Refacto `/api/generate-custom-program` (3-4h)

**Objectif** : enrichir l'endpoint existant pour prendre en compte equipment + substitution + cycle_block + historique workout_sets.

**Stratégie** :
1. Migrer vers `tool_use` Anthropic (comme analyze-body Phase 5 et weekly_diagnostic) si pas déjà fait
2. Enrichir le system prompt avec :
   - Equipment disponible user
   - Historique 14 derniers jours (PRs, charges récentes)
   - Cycle block actuel (progression vs variation)
3. Post-processing : substitution server-side si IA retourne un exo hors equipment user
4. Insert `custom_programs` avec `is_active=true`, soft-delete précédent
5. Generate `scheduled_sessions` pour les 14 prochains jours
6. Set `next_regen_at = NOW + 14 days`

**Livrables** :
- Refacto complet `app/api/generate-custom-program/route.ts`
- Migration SQL : `ALTER TABLE custom_programs ADD COLUMN cycle_block, next_regen_at`
- Logique substitution dans `lib/training/substitute-exercise.ts`

**Validations** :
- TypeScript OK
- Test E2E avec Jean (home only, dumbbell + band) : programme généré utilise UNIQUEMENT dumbbell/band/bodyweight
- Test E2E avec user gym : programme utilise toute la gamme equipment

**Dépendances** : F6.B.0, F6.B.1, F6.B.2, F6.B.3.

---

### F6.B.5 — Auto-regen post-Apply diagnostic (2h)

**Objectif** : quand l'user clique "Appliquer" sur un diagnostic et que `training_volume_delta_pct` est non-null, regénérer aussi le programme training (en plus du meal plan F6.A.2).

**Stratégie** : équivalent F6.A.2 pour le training. Dans `handleApply` :
1. Si `applied_changes.training_volume_delta_pct` existe → trigger `regenProgram()`
2. `regenProgram()` call `/api/generate-custom-program` avec overrides + cycle_block courant
3. Toast progress "Régénération de ton programme..."
4. Insert nouveau `custom_programs`, deactivate ancien
5. Update `scheduled_sessions` pour les 14 prochains jours

**Livrables** :
- Patch `WeeklyDiagnosticDetailContent.tsx` (ajout regenProgram alongside regenMealPlan)
- Toast i18n FR/EN/DE
- Test E2E

**Validations** :
- Apply diag avec training_volume_delta_pct ≠ 0 → programme régénéré
- Apply diag sans training change → programme intact (skip)

**Dépendances** : F6.B.4.

---

### F6.B.6 — Cron auto-regen 14 jours (2h)

**Objectif** : équivalent pg_cron de la Phase 5 mais pour le training. Tous les jours à 18h UTC, scanner les users dont `next_regen_at <= NOW` et regénérer leur programme.

**Stratégie** : pattern Phase 5 weekly-diagnostic appliqué au training :
1. Endpoint `app/api/training-regen-cron/route.ts` avec Bearer CRON_SECRET
2. Batch parallel concurrency=3 (Opus lent, prudent)
3. Pour chaque user éligible :
   - Déterminer le prochain cycle_block (A1→A2, A2→B1, ...)
   - Call `generate-custom-program` avec context (workout_sets récents)
   - Push notification "Ton programme évolue cette semaine"
4. pg_cron quotidien 18h UTC

**Livrables** :
- `app/api/training-regen-cron/route.ts`
- Migration SQL : schedule pg_cron quotidien
- Push notification template i18n

**Validations** :
- Test E2E curl avec 1 user éligible : programme régénéré, cycle_block avancé
- `next_regen_at` posé à +14 jours

**Dépendances** : F6.B.4, F6.B.5.

---

## 5. Roadmap sessions

| Session | Sous-features | Effort | Risques |
|---------|---------------|--------|---------|
| **S1** | F6.B.0 + F6.B.1 (fondations DB) | 4h | Faible |
| **S2** | F6.B.2 (tagging variant_group via batch IA) | 3h + validation | Moyen (qualité IA) |
| **S3** | F6.B.3 (helper) + début F6.B.4 (refacto) | 4h | Moyen |
| **S4** | Fin F6.B.4 + tests E2E approfondis | 3-4h | Élevé (changement core IA) |
| **S5** | F6.B.5 (Apply chain) | 2h | Faible (pattern connu de F6.A.2) |
| **S6** | F6.B.6 (cron) + monitoring 1 semaine en prod | 2h + monitoring | Moyen (impact prod) |
| **S7** (réserve) | Polish + bugs | 2-3h | — |

**Total réaliste** : 20-25h sur 7 sessions de 2-4h chacune. Soit ~3-4 semaines à 2 sessions/sem.

---

## 6. Risques & décisions à valider en cours

| Risque | Mitigation | Décision à valider |
|--------|------------|---------------------|
| Tagging IA variant_group imprécis | Review manuelle 10% + tests | À la fin F6.B.2 |
| Refacto generate-custom-program casse les users existants | Garder ancien endpoint en backup + flag feature | À S3 |
| Cron 14j coûte trop cher (Opus × users) | Concurrency 3 + monitoring usage Anthropic | À S6 |
| Users existants sans `training_location` | Backfill `'gym'` par défaut + soft prompt à reconnexion | À F6.B.1 |
| Régen automatique trop fréquente (user irrité) | Toggle dans settings "Auto-update mon programme" | À S5 |
| Programme régénéré pendant que user est en pleine séance | `scheduled_sessions` future-only, jamais touch les passés | À F6.B.4 |

---

## 7. Métriques de succès

À mesurer 4 semaines après livraison complète :

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| % users avec `training_location` rempli | >90% | Query simple |
| % users avec programme actif | >80% | `WHERE is_active=true` |
| Taux de complétion séances générées | >60% | `completed/total scheduled_sessions` |
| Cost AI moyen par user/mois | <$0.50 | logs Anthropic |
| Régen 14j satisfaction (proxy) | <5% désactivation toggle | settings query |
| NPS qualité programme | >40 | survey trimestriel |

---

## 8. Annexes

### 8.1 Mapping equipment legacy → enum (43 → 6)

```typescript
const EQUIPMENT_MAP: Record<string, Equipment> = {
  // barbell
  'Barre': 'barbell',
  'barre': 'barbell',
  'Barre EZ': 'barbell',
  'barre EZ': 'barbell',
  'Barre de traction': 'bodyweight', // Note : pull-up = bodyweight pas barbell
  'T-bar': 'barbell',
  'disque': 'barbell',
  'Barre, Banc': 'barbell',
  'Barre EZ, Banc': 'barbell',

  // dumbbell
  'Haltères': 'dumbbell',
  'haltères': 'dumbbell',
  'Haltère': 'dumbbell',
  'Haltère, Banc': 'dumbbell',
  'Haltères, Banc incliné': 'dumbbell',
  'Disque ou Haltère': 'dumbbell',

  // kettlebell
  'Kettlebell': 'kettlebell',

  // band
  'Cordes': 'band',
  'Roue abdominale': 'band',
  'Haltère ou Balle': 'band', // Balle → band-like

  // bodyweight
  'Poids du corps': 'bodyweight',
  'poids du corps': 'bodyweight',
  'Aucun': 'bodyweight',
  'Barres parallèles': 'bodyweight',
  'Box': 'bodyweight',
  'Aucun ou Sol': 'bodyweight',
  'Aucun ou Haltère': 'bodyweight', // fallback bodyweight si pas d'haltère
  'Barre ou Sol': 'bodyweight',
  'Debout': 'bodyweight',  // 'Debout' = position, traité comme bodyweight
  'Assis': 'bodyweight',

  // machine_gym
  'Machine': 'machine_gym',
  'machine': 'machine_gym',
  'Poulie': 'machine_gym',
  'poulie': 'machine_gym',
  'Poulie haute': 'machine_gym',
  'Poulie basse': 'machine_gym',
  'Poulie haute + Corde': 'machine_gym',
  'Haltères ou Poulie': 'machine_gym',
  'Tapis roulant': 'machine_gym',
  'Elliptique': 'machine_gym',
  'Vélo': 'machine_gym',
  'Machine à ramer': 'machine_gym',
  'banc': 'machine_gym', // banc seul utilisé pour dips, on simplifie
  'Barre ou Haltères': 'dumbbell', // fallback dumbbell (plus commun)
}
```

### 8.2 Variant groups proposés (~30)

```typescript
// Push patterns
'chest_press_horizontal'    // bench press, push-up, dumbbell press
'chest_press_incline'       // incline bench, incline dumbbell, incline push-up
'chest_press_decline'       // decline bench, dips
'shoulder_press'            // overhead press, dumbbell shoulder, pike push-up
'lateral_raise'             // lateral raise dumbbell, cable, band
'tricep_extension'          // skull crusher, tricep pushdown, dumbbell extension
'tricep_pushdown'           // cable pushdown, band pushdown

// Pull patterns
'row_horizontal'            // barbell row, dumbbell row, band row, machine row
'row_vertical'              // pull-up, lat pulldown, band pulldown
'rear_delt'                 // rear delt fly, face pull
'bicep_curl'                // barbell curl, dumbbell curl, hammer curl, band curl
'pull_apart'                // band pull-apart, rear delt machine

// Lower body
'squat_pattern'             // back squat, front squat, goblet squat, bodyweight squat
'lunge_pattern'             // walking lunge, reverse lunge, split squat
'hip_hinge'                 // deadlift, RDL, good morning, kettlebell swing
'glute_bridge'              // hip thrust, single-leg bridge, banded glute bridge
'calf_raise'                // standing calf, seated calf, single-leg calf

// Core
'plank_anti_extension'      // plank, dead bug, hollow hold
'rotation_anti'             // pallof press, side plank, woodchopper
'flexion_dynamic'           // crunch, leg raise, cable crunch
'ab_wheel_rollout'          // ab wheel, plank to push-up

// Cardio/conditioning
'cardio_steady'             // treadmill, bike, rowing
'plyometric_jump'           // box jump, broad jump, jump squat
'kb_complex'                // kettlebell swing, snatch, clean
```

### 8.3 JSON schema custom_programs.days (référence)

À documenter en cours d'implémentation (F6.B.4).

### 8.4 Coûts AI estimés

| Action | Coût Opus 4.7 | Fréquence | Coût/user/mois |
|--------|----------------|-----------|------------------|
| Generate program initial | ~$0.10 | 1× onboarding | $0.10 (one-shot) |
| Auto-regen 14j | ~$0.10 | 2×/mois | $0.20 |
| Apply diagnostic → regen | ~$0.10 | ~0.5×/mois | $0.05 |
| **Total Phase 6B** | | | **~$0.25/user/mois** |

Ajouté à F6.A meal plan (~$0.20/user/mois) : **~$0.45/user/mois** Phase 6 complète. Sur abonnement 10 CHF : margin brute >90%.

---

## 9. Historique des décisions

| Date | Décision | Motivation |
|------|----------|------------|
| 30/05/2026 | Validation vision F6.B + 7 sous-features | Audit terrain complet, architecture data favorable |
| 30/05/2026 | Choix equipment 6 enum (pas 8) | Simplicité substitution sans perte d'expressivité |
| 30/05/2026 | Périodisation 8 sem (pas 14j bête) | Coaching pro = blocs 2-4 sem, pas semaine-par-semaine |
| 30/05/2026 | Système 2 (coach-side) hors scope | 2 rows en prod, pas prioritaire |

---

**Fin du document v1.0**

Prochaine étape : valider ce document, puis attaquer F6.B.0 en session dédiée.
