# Démarrage prochaine session

## Contexte rapide

Dernière session : 2026-05-23 (~6h). Voir `docs/SESSION_LOG.md` pour le détail.

État au démarrage :
- `main` clean, Phase A + Phase B en production
- Toutes les branches `feat/*` mergées et supprimées
- Working tree clean

## ÉTAPE 1 — Commandes de démarrage

```bash
cd /Users/marcoferreira/plateforme-coach
git fetch
git status
git --no-pager log --oneline -10
```

Doit afficher main clean, dernier commit `Merge feat/tempo-executor-phase-b`.

## ÉTAPE 2 — Choisir le sujet de la session

### Sujet le plus prioritaire — Feedback usage réel Phase A + B

Marco a maintenant en prod le tempo executor. Avant de coder du polish, observer :
- Est-ce que le countdown 3-2-1 manque ?
- Est-ce que l'user clique PLAY systématiquement ?
- Est-ce que la modal "TEMPO INTERROMPU" se déclenche en usage normal ?
- Est-ce que les vibrations sont perceptibles (Android user) ?

Si rien à signaler en usage, passer aux sujets ci-dessous.

### Backlog bugs (priorité)

1. **Dashboard "VOIR LA SEANCE" → Analytics** (1h)
   - Bug actuel : le bouton ne va pas vers le détail session
   - Investiguer la route + le composant qui redirige

2. **CustomBuilder saisie tempo** (30 min)
   - Pendant une séance libre, l'user devrait pouvoir prescrire un tempo
   - Reproduire le pattern 3 inputs number existant dans TrainingTab/ProgramBuilder

3. **`addRestTime` ne re-schedule pas les sons** (15 min)
   - Bug mineur découvert dans le fix audio
   - Re-schedule les bips quand on ajoute du temps au rest timer

### Phases C — Swipe navigation (3-4h)

Reco senior : préférer un stepper "Exo 2/6 ← →" en header plutôt que swipe horizontal (conflit avec scroll vertical iOS).

### Templates email restants (1-2h)

3 templates à premiumiser : invite user, change email, reauthentication

## ÉTAPE 3 — Workflow standard

Pour chaque sujet :
1. Créer branche `feat/<nom>` ou `fix/<nom>`
2. Coder avec Claude Code (toujours avec `tsc --noEmit` 0 erreur avant commit)
3. Tester en local (`npm run dev`)
4. Si feature critique (modif WorkoutSession), tester aussi sur iPhone via IP locale
5. Commit avec message descriptif
6. Push branche, créer PR ou merge direct avec `--no-ff`
7. Cleanup branche

## Si bug critique en prod

Diagnostic rapide :
```js
// Console Chrome sur l'écran de séance
const ws = JSON.parse(localStorage.getItem('moovx_active_workout'));
console.log('Exo first full:', JSON.stringify(ws?.exercises?.[0], null, 2));
```

Tous les champs avancés (tempo, rir, video_url, etc.) doivent être présents grâce au fix `get-today-session.ts` de la session 2026-05-22.
