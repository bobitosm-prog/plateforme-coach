# Démarrage prochaine session

## Contexte rapide

Dernière session : 30 mai 2026 (marathon ~5h tech debt + Phase 6A + vision 6B).
Voir docs/SESSION_LOG.md "2026-05-30" pour détail complet.

Etat au démarrage :
- main clean, 10 commits du jour en prod sur app.moovx.ch
- HEAD a16d76a
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE (validé E2E)
- Phase 6B Training : vision documentée dans docs/PHASE_6B_TRAINING_VISION.md
- 0 user orphelin (next_diagnostic_at backfillé), 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit a16d76a "feat(weekly-diagnostic): auto-regen meal plan apres Apply (F6.A.2)".

## ETAPE 2 — Choisir le sujet

### Priorité 1 — F6.B.0 Normalisation exercises_db.equipment (~2h)

Fondation de toute la Phase 6B Training. Audit du 30 mai a révélé :
- 43 valeurs distinctes (chaos) pour 178 exos
- Casing inconsistant (`Haltères` 27 + `haltères` 6)
- Combinaisons libres (`Barre, Banc`, `Aucun ou Sol`)
- Position vs équipement (`Debout`, `Assis` = positions, pas equipment)

Objectif : enum 6 valeurs propre + CHECK constraint + flag home_friendly dérivable.

Voir docs/PHASE_6B_TRAINING_VISION.md section "F6.B.0" pour spec complète et annexe 8.1 pour le mapping 43→6.

### Priorité 2 — F6.B.1 Profile équipement utilisateur (~2h)

Migration 2 colonnes profile + 2 questions onboarding (training_location + home_equipment[]).

Dépend de F6.B.0 (les valeurs home_equipment doivent matcher l'enum normalisé).

### Priorité 3 — F6.B.2 Peupler variant_group (~3h)

Tagging des 178 exos via batch IA (Opus 4.7). 30 variant_groups définis en annexe 8.2 du doc vision.

Dépend de F6.B.0.

## Si tu veux faire autre chose

### Tech debt résiduel (cosmétique ou non urgent)

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel". 8 items listés, certains <30 min.

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.

## Pour démarrer F6.B.0 directement

```bash
# Vérif état current
cd /Users/marcoferreira/plateforme-coach && \
git status && \
git --no-pager log --oneline -3

# Lecture spec
cat docs/PHASE_6B_TRAINING_VISION.md | grep -A 30 "### F6.B.0"

# Audit equipment actuel (dans Supabase SQL Editor)
SELECT equipment, COUNT(*) FROM exercises_db GROUP BY equipment ORDER BY COUNT(*) DESC;
```

Puis prompt CC pour créer lib/training/equipment-normalize.ts + migration SQL.
