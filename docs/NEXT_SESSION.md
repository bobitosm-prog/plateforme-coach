# Démarrage prochaine session

## Contexte rapide

Dernière session : 2 juin 2026 (2 commits, HEAD 8a014be).
P1 double-wrap Anthropic : RÉSOLU — helper unwrapToolInput générique appliqué aux 3 endroits tool_use (programme, diagnostic, analyze-body).
P2 chantier CSP : RÉSOLU — connect-src + img-src corrigés, validé prod (connexion Google OK).
Voir docs/SESSION_LOG.md "2026-06-02" pour détail complet.

Etat au démarrage :
- main clean, HEAD 8a014be
- Phase 6B Training Closed Loop : COMPLET
- Bugs prod : tous résolus (streaming programme, double-wrap 3 endroits, CSP, crash home diagnostic)
- Onboarding SOLO : 12 steps avec préférences alimentaires
- pg_cron actifs : purge chat (03h), training-regen (17h UTC), weekly-diagnostic (18h UTC)

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

## ETAPE 2 — Choisir le sujet

### Priorité 1 — Confirmer register-client en prod + nettoyage

Vérifier que l'inscription register-client fonctionne depuis la landing (le fix CSP connect-src devrait couvrir ce cas — même directive que la connexion Google validée). Tester le parcours complet : landing → register → onboarding.

Optionnel : nettoyer le diagnostic vide d9bc037f de f.marco@me.com :
```sql
DELETE FROM weekly_diagnostics WHERE id = 'd9bc037f-a0b1-4cd0-a3d2-b4417a968399';
```

### Priorité 2 — Audit UX global navigation/disposition

Recenser toutes les pages/onglets, mapper la navigation, identifier incohérences. NutritionPreferences caché dans la page nutrition (#15), cohérence pages (#16). Session dédiée.

### Priorité 3 — Tech debt résiduel

Items prioritaires :
- **#14** total_calories null dans meal_plans (données dans plan_data.totals, colonne top-level non remplie)
- **#17** Incohérence clés meal_preferences FR (legacy) vs EN (nouveau)
- **#10** Consolidation variant_groups fragmentés (4 groupes hip hinge)
- **#13** CRON_SECRET Vercel valeur sk_live suspecte
- **#12** lockfile parent orphelin /Users/marcoferreira/package-lock.json
- **#3** warnings images.qualities Next.js 16

Voir ROADMAP.md "Sprint Tech Debt — backlog résiduel" pour la liste complète (17 items).

## Si tu veux faire autre chose

### F6.C — Notification combinée (~30 min)

Push : "Ton plan adapté est prêt : 21 repas + 2 séances ajustées" — Phase 6B complet, F6.C peut être attaqué.

### Features V2/V3 (brainstorming)

Voir docs/IDEES_FEATURES.md : scanner d'assiette IA (haute priorité, 1-2 sem), form check vidéo, Apple Watch/HealthKit sync, proactive nudges.
