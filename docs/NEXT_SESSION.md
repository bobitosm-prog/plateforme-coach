# Démarrage prochaine session

## Contexte rapide

Dernière session : 31 mai 2026 (session 2 Phase 6B, F6.B.2 livré).
Voir docs/SESSION_LOG.md "2026-05-31" pour détail complet.

Etat au démarrage :
- main clean, 17 commits 30 mai + 1 F6.B.2 31 mai = 18 commits total Phase 6 en prod sur app.moovx.ch
- HEAD f71b88a
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE (validé E2E)
- Phase 6B F6.B.0 (normalisation equipment) : DONE
- Phase 6B F6.B.1 (profile équipement + onboarding step 10) : DONE
- Phase 6B F6.B.2 (variant_group 100% couverture) : DONE
- Phase 6B Training : vision documentée dans docs/PHASE_6B_TRAINING_VISION.md
- 0 user orphelin, 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit f71b88a "feat(training): completer variant_group (F6.B.2)".

## ETAPE 2 — Choisir le sujet

### Priorité 1 — F6.B.3 Helper buildProgramParams (~1h)

Helper pur similaire à buildMealPlanParams (F6.A.1). Construit le body POST pour /api/generate-custom-program à partir du profile + equipment + variant_groups.

Dépend de F6.B.1 (DONE) + F6.B.2 (DONE).

### Priorité 2 — F6.B.5 quick fix auto-gen post-onboarding (~2h)

Gap UX : l'onboarding ne déclenche PAS automatiquement la génération meal_plan + programme. L'user finit ses 11 steps et arrive sur un dashboard vide.

Fix : dans le save case 11 (onboarding_completed), trigger auto-gen meal_plan + programme (best-effort, toast progress). Dépend de F6.B.4 (refacto generate-custom-program pour equipment).

### Priorité 3 — F6.B.4 Refacto endpoint generate-custom-program (~3h, recommandé demain frais)

Refacto de l'endpoint /api/generate-custom-program pour intégrer equipment (training_location + home_equipment) et variant_groups dans le prompt IA. Fondation pour substitution intelligente.

Dépend de F6.B.2 (DONE) + F6.B.3.

## Gap UX critique

L'onboarding complété ne déclenche AUCUNE génération automatique :
- Pas de meal plan → onglet Nutrition vide
- Pas de programme training → onglet Training vide
- L'user doit chercher manuellement comment générer

Impact : première impression désastreuse post-onboarding. À résoudre dans F6.B.5.

## Si tu veux faire autre chose

### Tech debt résiduel (cosmétique ou non urgent)

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel". 10 items listés, certains <30 min.

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.

## Pour démarrer F6.B.3 directement

```bash
# Vérif état current
cd /Users/marcoferreira/plateforme-coach && \
git status && \
git --no-pager log --oneline -3

# Lecture helper existant meal-plan comme modèle
cat lib/meal-plan/build-generation-params.ts

# Lecture endpoint actuel
cat app/api/generate-custom-program/route.ts | head -50
```

Puis créer `lib/training/build-program-params.ts` sur le même pattern que build-generation-params.
