# Démarrage prochaine session

## Contexte rapide

Dernière session : 31 mai 2026 (session 2 marathon Phase 6B, 15 commits, HEAD 76a37a9).
Phase 6B Training closed-loop COMPLET (3 sources : onboarding_auto + diagnostic_auto + cron_auto).
F6.B.7 préférences alimentaires onboarding DONE. Onboarding SOLO = 12 steps.
Voir docs/SESSION_LOG.md "2026-05-31" pour détail complet.

Etat au démarrage :
- main clean, 17 commits 30 mai + 15 commits 31 mai = 32 commits total Phase 6 en prod sur app.moovx.ch
- HEAD 76a37a9
- Phase 5 Weekly Diagnostic : DONE
- Phase 6A Closed Loop nutrition : DONE
- Phase 6B Training Closed Loop : COMPLET (F6.B.0→F6.B.7 tous DONE)
- Onboarding SOLO : 12 steps avec préférences alimentaires (F6.B.7)
- pg_cron actifs : purge chat (03h), weekly-diagnostic (18h UTC), training-regen (17h UTC)
- 0 user orphelin, 0 diag mal capitalisé, 0 profile mal capitalisé

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit 76a37a9 "feat(onboarding): intégration step préférences + renumérotation 11→12 steps (F6.B.7-2)".

## ETAPE 2 — Choisir le sujet

### Priorité 1 — Audit UX global (session dédiée)

Recenser toutes les pages/onglets de l'app, mapper la navigation, identifier les incohérences de disposition. NutritionPreferences est cachée dans la page nutrition (peu discoverable). Prioriser les quick wins UX.

### Priorité 2 — Tech debt résiduel

Items prioritaires :
- **#10** Consolidation variant_groups fragmentés (4 groupes hip hinge distincts, limite qualité substitution)
- **#14** total_calories null dans meal_plans (données dans plan_data.totals, colonne top-level non remplie)
- **#17** Incohérence clés meal_preferences FR (legacy) vs EN (nouveau) — extractMealFoodNames gère les deux mais à unifier

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel" pour la liste complète (17 items).

### Priorité 3 — Clarifier CRON_SECRET Vercel

Valeur 'sk_live_' suspecte (ressemble à une clé Stripe). Le cron fonctionne en prod mais à vérifier que c'est bien le bon secret. Nettoyer aussi le lockfile parent orphelin /Users/marcoferreira/package-lock.json.

## Si tu veux faire autre chose

### F6.C — Notification combinée (30 min estimé)

Push : "Ton plan adapté est prêt : 21 repas + 2 séances ajustées" — Phase 6B étant complet, F6.C peut être attaqué.

### Polish UX

Aucun feedback usage spécifique pour l'instant. À surveiller si users actifs > 4.
