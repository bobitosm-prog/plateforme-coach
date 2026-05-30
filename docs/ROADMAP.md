# MoovX Roadmap

> Document vivant — état au 2026-05-30
> Branche : `main` (clean, HEAD 6c68a74)

## Sprint Phase 5 — Weekly AI Diagnostic — DONE

Killer feature livrée, concurrente directe KAI Swiss. 7 commits prod, 0 régression.
Voir SESSION_LOG.md "29 mai 2026" pour détail complet.

Architecture : generator.ts réutilisable + cron quotidien pg_cron + push web-push + drill-down /weekly-diagnostic/[id] + Apply 1-click.

## Sprint Phase 6 — Closed Loop AI

Vision : transformer le diagnostic PASSIF (lecture) en boucle ACTIVE.
Quand l'user clique "Appliquer", l'app regénère AUTOMATIQUEMENT son meal plan et son programme.

### F6.A — Auto-regénération meal plan après Apply — DONE

Livré 30 mai 2026 (2 commits) :
- 8325f09 — Helper `lib/meal-plan/build-generation-params.ts` (mapping FR/EN, defaults safe)
- a16d76a — Auto-regen dans handleApply diagnostic + toast progress SSE + i18n FR/EN/DE

Test E2E validé runtime : meal plan régénéré en 1m30 sur Jean (compte test), DB cohérente.

### F6.B — Training Closed Loop — VISION DOCUMENTÉE

Voir `docs/PHASE_6B_TRAINING_VISION.md` (~600L, 26K) — vision complète avec :
- Personnalisation équipement (home/gym/both + home_equipment[])
- Substitution intelligente d'exercices (via exercises_db.variant_group)
- Périodisation 8 semaines (4 phases de 2 sem, progression + variation alternées)
- Auto-regen tous les 14 jours via pg_cron

Découpage 7 sous-features F6.B.0 à F6.B.6, ~20-25h sur 5-7 sessions.

#### F6.B.0 — Normalisation equipment — DONE

Livré 30 mai 2026 (commit 6c68a74) :
- Helper `lib/training/equipment-normalize.ts` (mapping 43→6 enum + isHomeFriendly)
- Migration SQL idempotente + CHECK constraint
- 178 exos / 6 enum / 0 invalid / backup `equipment_legacy` préservé

Distribution finale :
| Equipment | Nb | % | Home-friendly |
|-----------|-----|---|---------------|
| machine_gym | 61 | 34.3% | non |
| barbell | 41 | 23.0% | non |
| dumbbell | 40 | 22.5% | oui |
| bodyweight | 32 | 18.0% | oui |
| kettlebell | 2 | 1.1% | oui |
| band | 2 | 1.1% | oui |

Total home_friendly : 76/178 = 43% — à enrichir kettlebell+band dans future itération.

#### F6.B.1 — Profile équipement + onboarding — DONE

Livré 30 mai 2026 (3 commits bisect-friendly) :
- **F6.B.1a** (1d77887) : migration `profiles.training_location` + `home_equipment[]` + CHECK constraint + NOT NULL après backfill 10 users
- **F6.B.1b** (51df602) : composant `SoloStep7Equipment.tsx` isolé avec Q1 radio location + Q2 multi-select conditionnel home_equipment + i18n FR/EN/DE
- **F6.B.1c** (0dfe488) : intégration via Option C' (insertion step 10 Equipment avant Recap, Recap devient step 11), refacto type SoloStep + SOLO_TOTAL_STEPS + state + save logic

Test E2E validé runtime sur Jean (compte test). 10 users existants en prod avec `training_location='gym'` (assomption majoritaire, à mettre à jour si user change via re-onboarding).

### F6.C — Notification combinée — TODO après F6.B

- Push : "Ton plan adapté est prêt : 21 repas + 2 séances ajustées"
- Estim : 30 min après F6.B livré

### Economie projetée Phase 6 complète

- Diag $0.10 + Meal $0.08 + Programme $0.10 = $0.28/semaine/user = ~$1.20/mois
- Sur 10 CHF/mois → margin brute ~90%

## Sprint Onboarding v2 — DONE

Route unifiée /onboarding-v2 (SOLO 10 steps + INVITED 3 steps).
Migration v1→v2 proxy + useClientDashboard. 5 commits prod.

## Sprint i18n — DONE

Couverture 48% → ~99%. 864 clés. 178 exercices traduits. Voir SESSION_LOG.

## Sprint Tech Debt Marathon — 30 mai 2026 — DONE

Session marathon 30 mai 2026, 5 tech debts résolus en prod :

| TD | Description | Commits |
|----|-------------|---------|
| TD-1 | Bug timezone week_start (dim au lieu de lun en TZ Geneva) | faf0a23 + 15cb5cb |
| TD-2 | next_diagnostic_at init nouveaux users (4 orphelins backfillés) | 935afa6 + bb45291 |
| TD-3 | Bug capitalize full_name (helper unifié + 2 backfills) | 8b01e34 + 3524ece |
| TD-4 | Vercel timeout cron (batch parallel concurrency=5) | 2d46b02 |
| TD-5 | analyze-body regex JSON fragile (refacto tool_use Anthropic) | 04430a2 |

## Sprint Tech Debt — backlog résiduel

1. **Anomalie next_diagnostic_at résiduelle** (cosmétique) — 3 users avec ancien calcul = 2026-05-31 18h. Inerte grâce idempotency. À corriger si visible UX.
2. **currentMonday() useClientDetail.ts** — Même bug TZ que TD-1, feature dormante (0 rows). TODO posé dans le code.
3. **Image qualities Next.js 16** — `quality 88/85/90 not configured in images.qualities [75]` warnings console. Update next.config.
4. **web-push DEP0169** — url.parse() deprecated Node 22+. Migration vers WHATWG URL.
5. **OnboardingV2Content.tsx 723L** — Refacto SoloFlowRenderer/InvitedFlowRenderer.
6. **design-tokens.ts i18n** — NUTRITION_DAYS/MEAL_TYPES en FR uniquement.
7. **F6.A.3** — Refacto NutritionPreferences pour utiliser buildMealPlanParams (élimine duplication).
8. **Upgrade Vercel Pro** — À 10 clients payants (ToS Hobby = non-commercial only).
9. **F6.B.5 auto-gen post-onboarding** — Gap UX découvert : onboarding ne déclenche pas auto generate-meal-plan ni generate-custom-program. User arrive sur dashboard vide post-onboarding. À traiter dans F6.B.5 (dépend de F6.B.4 refacto generate-custom-program pour equipment).

## Sprint Launch Prep — STATUS

| Phase | Status | Notes |
|-------|--------|-------|
| Split host-based | ✅ Done | Mergé |
| RLS audit | ✅ Done | Mergé |
| Delete account RPC RGPD | ✅ Done | Mergé |
| Bug Celebration (récap V3) | ✅ Done | Mergé |
| Auth signup confirmation banner | ✅ Done | Prod validé |
| Email infra Infomaniak + DKIM | ✅ Done | 3/6 templates premium |

## Sprint P2 — Training Improvements

### Phase A — Tempo prescrit affichage premium
- **Status** : ✅ DONE — en production
- Pill gold + modal pédagogique 3 phases
- Bug latent fix bonus : `get-today-session.ts` (préservation tous champs exo)

### Phase B — Minuteur exec piloté par tempo
- **Status** : ✅ DONE (B.1 + B.2 + B.4.1 + B.4.2) — en production
- Bouton PLAY gold sur 1er set non-done
- Modal plein écran focus total avec countdown phase par phase
- Audio + vibration différenciées par phase (Android/desktop, neutre iOS)
- iOS background recovery propre (modal "TEMPO INTERROMPU")
- Fix bug audio rest timer en bonus (sons schedulés qui sonnaient post-skip)

### Phase B — Reportées (à évaluer après usage réel)
- **B.3** — Bridge auto vers rest timer après tempo : ❌ NON RETENU (décision UX finale)
- **B.4.3** — Countdown 3-2-1 GO avant rep 1 : ⏳ À évaluer si feedback usage le réclame
- **B.4.4** — Animations cosmétiques transitions : ⏳ À évaluer si feedback usage

### Phase C — Swipe navigation
- **Status** : ⏳ TODO
- **Effort estimé** : 3-4h
- **Position senior** : préférer stepper "Exo 2/6 ← →" plutôt que swipe horizontal (conflit scroll vertical iOS)

## Backlog bugs (priorité non urgente)

1. Dashboard "VOIR LA SEANCE" → redirige Analytics (devrait ouvrir détail session)
2. Désync scheduled_sessions vs dashboard display
3. CustomBuilder ne permet pas saisie tempo (feature manquante)
4. Templates emails restants à premiumiser : invite user, change email, reauthentication
5. `addRestTime` (+30s) ne re-schedule pas les sons (bip arrive trop tôt si on étend le repos) — mineur

## Tech debt notable

- WorkoutSession.tsx = 1500+ lignes monobloc (split à terme, hors priorité)
- Décision tempo "afficher toujours même 2-0-2" à réévaluer après feedback usage réel

## Idées feedback usage réel (à observer)

Avec Phase A + B en prod, à surveiller sur les prochaines séances :
- Le countdown 3-2-1 manque-t-il vraiment ? (B.4.3 candidate)
- Les animations cosmétiques améliorent-elles l'engagement ? (B.4.4 candidate)
- L'user oublie-t-il de cliquer PLAY ? (besoin d'un nudge ?)
- Le bouton PAUSE est-il utilisé ? (sinon le simplifier)
- Les vibrations différenciées sont-elles perceptibles à l'usage ?

## Stack & déploiement

- Repo : github.com/bobitosm-prog/plateforme-coach
- Production : app.moovx.ch (Vercel auto-deploy main)
- Landing : moovx.ch
- DB : Supabase project njlzossopgknanhkzcbk
- Email : Infomaniak SMTP (noreply@moovx.ch)
