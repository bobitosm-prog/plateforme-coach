# Démarrage prochaine session

## Contexte rapide

Dernière session : 1er juin 2026 (fixes bugs prod post-test client zéro, 2 commits + docs).
Bug génération programme en prod : RÉSOLU (streaming SSE + déballage double-wrap input).
Crash home diagnostic null : RÉSOLU (guard optional chaining).
Cause racine identifiée : le double-wrap 'input' intermittent du modèle Anthropic affecte AUSSI le générateur de diagnostic (generator.ts) → diagnostics vides en DB.
Voir docs/SESSION_LOG.md "2026-06-01" pour détail complet.

Etat au démarrage :
- main clean, HEAD 77347c4 (ou commit docs de clôture)
- Phase 6B Training Closed Loop : COMPLET (programme auto-gen validé E2E prod)
- Onboarding SOLO : 12 steps avec préférences alimentaires
- pg_cron actifs : purge chat (03h), training-regen (17h UTC), weekly-diagnostic (18h UTC)
- Bug programme prod : RÉSOLU
- Bug crash home diagnostic : RÉSOLU (symptôme patché, cause racine reste)

## ETAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

## ETAPE 2 — Choisir le sujet

### Priorité 1 — Fix double-wrap dans generator.ts (diagnostic)

Même bug que le programme (résolu dans generate-program.ts). Le générateur de diagnostic (lib/weekly-diagnostic/generator.ts ligne 301) fait `const aiOutput = toolUseBlock.input` sans déballer le wrapper 'input' parasite du modèle.

**Fix** : remplacer dans generator.ts :
```typescript
const aiOutput = toolUseBlock.input
```
par le même déballage défensif :
```typescript
const rawInput = toolUseBlock.input
const aiOutput = (rawInput && typeof rawInput === 'object' && rawInput.input && !rawInput.score_semaine)
  ? rawInput.input
  : rawInput
```

**Optionnel** : nettoyer en DB le diagnostic d9bc037f (vide) du compte f.marco@me.com, ou le regénérer.

~15 min. Impact : empêche les futurs diagnostics vides (points_forts/points_alerte null).

### Priorité 2 — Chantier CSP : config trop restrictive

Racine commune : CSP configuré trop strictement, plusieurs directives manquent des domaines légitimes. 2 symptômes :

1. **connect-src** bloque `https://app.moovx.ch/register-client` et `api/vitals` depuis la landing → inscription client cassée
2. **img-src** bloque les avatars Google `https://lh3.googleusercontent.com/...` (OAuth) → photo profil invisible

**Étapes :**
1. `grep -rn "Content-Security-Policy\|connect-src\|img-src" next.config.* proxy.ts middleware.ts`
2. Auditer toutes les directives CSP, ajouter domaines légitimes (googleusercontent.com, app.moovx.ch)
3. PRUDENCE : domaines EXACTS, pas de wildcard trop large (sécurité XSS)

### Priorité 3 — Audit UX global + tech debt

- Audit UX navigation/disposition (NutritionPreferences caché, cohérence pages)
- Tech debt : total_calories null meal_plans (#14), clés meal_preferences FR/EN (#17), consolidation variant_groups (#10)
- Clarifier CRON_SECRET Vercel valeur sk_live suspecte + lockfile parent orphelin

## Si tu veux faire autre chose

### F6.C — Notification combinée (30 min estimé)

Push : "Ton plan adapté est prêt : 21 repas + 2 séances ajustées" — Phase 6B complet, F6.C peut être attaqué.
