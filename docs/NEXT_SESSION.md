# Démarrage prochaine session

## Contexte rapide

Dernière session : 30 mai 2026 (marathon ~8h tech debt + Phase 6A + vision 6B + F6.B.0 + F6.B.1).
Voir docs/SESSION_LOG.md "2026-05-30" pour détail complet.

Etat au démarrage :
- main clean, 17 commits du jour en prod sur app.moovx.ch
- HEAD 0dfe488
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE (validé E2E)
- Phase 6B F6.B.0 (normalisation equipment) : DONE
- Phase 6B F6.B.1 (profile équipement + onboarding step 10) : DONE
- Phase 6B Training : vision documentée dans docs/PHASE_6B_TRAINING_VISION.md
- 0 user orphelin, 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit 0dfe488 "feat(onboarding): integrer SoloStep7Equipment (F6.B.1c)".

## ETAPE 2 — Choisir le sujet

### Priorité 1 — F6.B.2 Peupler variant_group (~3h, batch IA recommandé)

Tagging des 178 exos via batch IA (Opus 4.7). 30 variant_groups définis en annexe 8.2 du doc vision.

Dépend de F6.B.0 (DONE) et F6.B.1 (DONE). Fondation pour la substitution intelligente F6.B.4.

Voir docs/PHASE_6B_TRAINING_VISION.md section "F6.B.2" pour spec complète.

### Priorité 2 — F6.B.3 Helper buildProgramParams (~1h)

Helper pur similaire à buildMealPlanParams (F6.A.1). Construit le body POST pour /api/generate-custom-program à partir du profile + equipment + variant_groups.

Dépend de F6.B.1 (DONE) + F6.B.2.

### Priorité 3 — F6.B.5 Auto-gen post-onboarding (gap UX critique découvert 30 mai)

Gap UX : l'onboarding ne déclenche PAS automatiquement la génération meal_plan + programme. L'user finit ses 11 steps et arrive sur un dashboard vide.

Fix : dans le save case 11 (onboarding_completed), trigger auto-gen meal_plan + programme (best-effort, toast progress). Dépend de F6.B.4 (refacto generate-custom-program pour equipment).

## Gap UX critique

L'onboarding complété ne déclenche AUCUNE génération automatique :
- Pas de meal plan → onglet Nutrition vide
- Pas de programme training → onglet Training vide
- L'user doit chercher manuellement comment générer

Impact : première impression désastreuse post-onboarding. À résoudre dans F6.B.5.

## Si tu veux faire autre chose

### Tech debt résiduel (cosmétique ou non urgent)

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel". 9 items listés, certains <30 min.

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.

## Pour démarrer F6.B.2 directement

```bash
# Vérif état current
cd /Users/marcoferreira/plateforme-coach && \
git status && \
git --no-pager log --oneline -3

# Lecture spec
cat docs/PHASE_6B_TRAINING_VISION.md | grep -A 30 "### F6.B.2"

# Audit variant_group actuel (dans Supabase SQL Editor)
SELECT variant_group, COUNT(*) FROM exercises_db WHERE variant_group IS NOT NULL GROUP BY variant_group ORDER BY COUNT(*) DESC;
```

Puis prompt CC pour créer le script batch IA de tagging variant_group.
