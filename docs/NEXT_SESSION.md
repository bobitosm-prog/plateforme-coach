# Démarrage prochaine session

## Contexte rapide

Dernière session : 30 mai 2026 (marathon ~6h tech debt + Phase 6A + vision 6B + F6.B.0).
Voir docs/SESSION_LOG.md "2026-05-30" pour détail complet.

Etat au démarrage :
- main clean, 12 commits du jour en prod sur app.moovx.ch
- HEAD 6c68a74
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE (validé E2E)
- Phase 6B F6.B.0 (normalisation equipment) : DONE
- Phase 6B Training : vision documentée dans docs/PHASE_6B_TRAINING_VISION.md
- 0 user orphelin, 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit 6c68a74 "feat(training): normaliser exercises_db.equipment 43->6 enums (F6.B.0)".

## ETAPE 2 — Choisir le sujet

### Priorité 1 — F6.B.1 Profile équipement utilisateur (~2h)

Migration 2 colonnes profile (training_location + home_equipment[]) + 2 questions onboarding.

Les valeurs home_equipment matchent l'enum normalisé F6.B.0 (dumbbell, kettlebell, band, bodyweight).

Voir docs/PHASE_6B_TRAINING_VISION.md section "F6.B.1" pour spec complète.

### Priorité 2 — F6.B.2 Peupler variant_group (~3h)

Tagging des 178 exos via batch IA (Opus 4.7). 30 variant_groups définis en annexe 8.2 du doc vision.

Dépend de F6.B.0 (DONE).

### Priorité 3 — F6.B.3 Helper buildProgramParams (~1h)

Helper pur similaire à buildMealPlanParams (F6.A.1). Construit le body POST pour /api/generate-custom-program à partir du profile + equipment + variant_groups.

Dépend de F6.B.1 + F6.B.2.

## Si tu veux faire autre chose

### Tech debt résiduel (cosmétique ou non urgent)

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel". 8 items listés, certains <30 min.

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.

## Pour démarrer F6.B.1 directement

```bash
# Vérif état current
cd /Users/marcoferreira/plateforme-coach && \
git status && \
git --no-pager log --oneline -3

# Lecture spec
cat docs/PHASE_6B_TRAINING_VISION.md | grep -A 30 "### F6.B.1"

# Vérif equipment normalisé en prod
# Dans Supabase SQL Editor :
SELECT equipment, COUNT(*) FROM exercises_db GROUP BY equipment ORDER BY COUNT(*) DESC;
```

Puis prompt CC pour créer la migration SQL (2 colonnes profiles) + questions onboarding.
