# Démarrage prochaine session — 2026-05-23

## Contexte rapide

Dernière session : 2026-05-22, ~6h. Voir `docs/SESSION_LOG.md` pour le détail complet.

État au démarrage :
- Branche `feat/tempo-modal-phase-a` poussée, **PAS encore mergée**
- 2 commits : fix latent `get-today-session.ts` + feat Phase A tempo modal
- Cleanup DB de test fait (séance + programme test du compte `marco.ferreira@bluemail.ch`)

## ÉTAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach

# Mettre à jour git
git fetch
git status

# Lister les branches locales et distantes
git branch -a

# Vérifier l'état des fichiers modifiés (devrait être clean)
git --no-pager log --oneline -10
```

## ÉTAPE 2 — Test E2E avant merge

1. Lance le dev local :
```bash
   git checkout feat/tempo-modal-phase-a
   npm run dev
```

2. Sur Chrome `localhost:3000` :
   - Login avec `f.marco@me.com` (compte réel)
   - Lance ta séance du jour (programme PPL Hypertrophie Elite — 12 Semaines)
   - **Tu dois voir le pill gold ⏱ TEMPO sur chaque exo**
   - Tap sur le pill → modal pédagogique s'ouvre avec les 3 phases
   - Screenshot pour archive

3. Tests de non-régression :
   - Démarrer/valider une série fonctionne
   - Timer de repos OK
   - Pas de bug visuel sur RIR, technique, autres badges
   - Card exo ouvre/ferme normalement

## ÉTAPE 3 — Merge sur main (si tout OK)

```bash
git checkout main
git pull
git merge --no-ff feat/tempo-modal-phase-a
git push
```

Vercel auto-deploy déclenchera en prod sous 2-3 min.

## ÉTAPE 4 — Cleanup branche (après merge)

```bash
git branch -d feat/tempo-modal-phase-a
git push origin --delete feat/tempo-modal-phase-a
```

## ÉTAPE 5 — Validation prod

1. Va sur `app.moovx.ch` (PWA iPhone ou web)
2. Hard refresh (force la PWA à recharger)
3. Lance une vraie séance → vérifier que les pills s'affichent

## Si bug en local — diagnostic rapide

Si le pill ne s'affiche pas :

```js
// Console Chrome sur l'écran de séance
const ws = JSON.parse(localStorage.getItem('moovx_active_workout'));
console.log('Tempos arrivés:', ws?.exercises?.map(e => e.tempo));
```

Si tempos = `[undefined, undefined, ...]` → bug dans le chemin DB → state, faut investiguer (voir SESSION_LOG.md section "BUG FIX CRITIQUE LATENT").

Si tempos = `["2-0-2", "2-1-2", ...]` → données OK, bug UI dans WorkoutSession (regarder la condition `{exo.tempo && (<button>...)}` ligne ~1028).

## Backlog à reprendre après merge

Voir `docs/ROADMAP.md` — sections Backlog bugs et Phase B/C.

Sujet le plus mûr pour la prochaine session : **Phase B — Minuteur exec piloté par tempo** (4-5h, spec déjà cadrée).
