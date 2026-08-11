# Baseline finale Phase 9

## Identité et portée

Cette baseline consolide l'état versionné de MoovX au **11 août 2026**, sur la
branche `phase-6-staging` au SHA `25c7426`. Au moment de la capture, le worktree
suivi est propre et la divergence avec `origin/phase-6-staging` est `0/0`. Les
deux fichiers utilisateur non suivis `app/test-crash.tsx` et
`public/videos/exercises/hack-squat-machine.png` sont explicitement exclus.

Le périmètre couvre Git, Supabase, CI, tests, release et rollback, architecture,
dépendances, compatibilités et mesures de charge. **Production n'a pas été
touchée ni déclarée validée.** Cette baseline ne ferme pas artificiellement la
Phase 9 : elle distingue les acquis des critères encore ouverts.

## Git et Supabase

- branche : `phase-6-staging` ;
- SHA : `25c7426` ;
- divergence : `0/0` ;
- worktree suivi : propre ;
- migrations locales : `149/149`, appliquées par deux reconstructions vides,
  indépendantes, avec le même ordre, les mêmes postconditions et le même
  fingerprint final ;
- staging : `145/145 ALIGNED`, confirmé par deux captures read-only
  indépendantes et une empreinte structurelle identique.

Le constat `141/145 HISTORY_AND_STRUCTURE_DRIFT` correspond à l'audit antérieur
à la remédiation du 8 août 2026. Il ne décrit plus l'état staging courant. Le
plan staging contient intentionnellement 145 versions sur les 149 sources
locales selon le contrat de sélection versionné. Aucun accès Production, reset
distant, `db push` ou `migration repair` n'entre dans cette baseline.

## CI progressive

Le workflow **MoovX Quality Gates** contient quatre jobs indépendants :

- Gate A — Fast : TypeScript, ESLint différentiel, i18n, factories Supabase et
  contrats documentaires ;
- Gate B — Standard : Vitest complet, build et budget statique ;
- Gate C1 — Database Heavy : Supabase local, reconstructions vides, types et
  RLS/PostgREST ;
- Gate C2 — Browser Heavy : Chromium et quinze parcours E2E critiques.

Deux runs complets ont été observés et les deux sont verts (`2/2 PASS`). Le p95
provisoire est `16:07` et le flaky rate provisoire est `0 %`. Le statut reste
**`CI_STABILITY_CANDIDATE`** : l'échantillon ne permet pas encore d'attester un
p95 statistique strictement inférieur à 20 minutes ni un flaky rate strictement
inférieur à 2 %. Aucun retry ne doit masquer un échec et aucun job ne déploie ou
ne contacte staging/Production.

## Qualité et tests

| Preuve | Dernier état consolidé |
|---|---|
| Vitest | 339 fichiers, 3 098 tests `PASS`, 3 `todo`, 0 échec |
| Build Webpack hermétique | 91/91 routes/pages |
| Base vide | 149/149 migrations, deux reconstructions cohérentes |
| RLS/PostgREST | `PASS` dans Gate C1 |
| E2E critiques | 15/15 dans Gate C2, un worker, aucun retry |
| Factories Supabase | 58/58 |
| Contrats documentaires | gardes ciblées vertes au fil des sous-batchs |

Dette acceptée : cinq tests React serveur `.test.tsx` ne sont pas inclus dans
le glob Vitest standard. Leur exécution explicite a aussi exposé une attente
historique de six skeletons contre sept observés. Le test, le composant et la
configuration Vitest n'ont pas été modifiés dans les sous-batchs concernés ;
la qualification et la réintégration de cette dette restent distinctes.

## Release et rollback

La procédure de release, ses rôles, ses preuves et son préflight sont
documentés. Une répétition réelle de rollback Vercel Preview a utilisé deux
artefacts immuables distincts. La restauration de l'artefact sain a été
confirmée par son SHA servi et des smoke tests verts, sans erreur critique
`5xx`, en `177,483 s` au total.

Cette preuve satisfait l'objectif de rollback applicatif inférieur à 30
minutes dans le périmètre Preview. Elle ne couvre ni Production, ni
restauration de données, ni PITR, et n'a appliqué aucune migration ou opération
Stripe live.

## Architecture et domaines

La carte canonique décrit dix domaines et l'ADR 0008 fixe le sens de placement
UI/HTTP → orchestration → domaine/services → repositories/ports →
infrastructure. Les frontières Auth serveur, RLS et service-role restent
obligatoires.

Training reste dans l'état **`TRAINING_CANONICAL_MIGRATION_NOT_STARTED`** : le
modèle et les adaptateurs sont prêts et testés, mais aucun producteur ou
consommateur runtime n'utilise le modèle canonique, et aucune double lecture ou
coexistence runtime n'est active. Les adaptateurs de
`lib/training/adapters/*` restent **`FUTURE_MIGRATION_RESERVED`** jusqu'à une
bascule observée et réversible puis une preuve d'absence de trafic legacy.

## Dépendances

Le nettoyage conclut **`DEPENDENCY_CLEANUP_COMPLETE`** :

- inventaire direct : 55 → 41 (`27 dependencies` et `14 devDependencies`) ;
- 14 dépendances directes et 124 nœuds du lockfile retirés ;
- aucun package ajouté ;
- aucun `UNUSED_REMOVE` ou `UNKNOWN_REVIEW_REQUIRED` restant ;
- `react-is` conservé comme `PEER_REQUIRED` via Recharts ;
- `server-only` fourni par le contrat compilateur Next ;
- aucun nouveau peer cassé.

## Legacy et feature flags

Les candidats démontrés sans trafic supprimés sont `formatCurrency`,
`legacyCoachStreak`, `aggregateLegacyNutritionByDate`, `normalizeEquipment`,
`getLegacyValuesForEquipment` et `EQUIPMENT_LEGACY_MAP`. Le mapping d'erreurs
API reste `LEGACY_TEST_ONLY_KEEP`; les tombstones contractuels et les
compatibilités runtime actives sont conservés.

Les pseudo-flags Invitation expirés ont été retirés. Le flag
`SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED` reste **`TEMPORARY_ACTIVE`**, absent
par défaut et borné au développement local avec Supabase localhost, tant qu'un
parcours local canonique de remplacement n'existe pas. Aucun flag runtime n'a
été supprimé sans preuve.

## Performance et charge

### Feedback

`GET /api/feedback/mine` possède une baseline locale reproductible au profil
testé : 300 secondes, au maximum 5 req/s et 5 VU, sans retry. Les deux runs
corrélés ont un throughput, des p50/p95/p99 client et serveur et un overhead
cohérents. Le tail observé sur le run corrélé est principalement serveur, sans
erreur, lock ou saturation démontrée.

### Nutrition

Le read model Nutrition est classé **`NUTRITION_BASELINE_REPRODUCIBLE`** au
même profil borné. Le second run termine `985/985` cycles à `3,300 req/s`, avec
un p95 total de `13,26 ms`. Le calendrier est la lecture dominante. Les scans
séquentiels et l'absence d'index composite sont confirmés, mais aucun
`NUTRITION_BASELINE_DB_SCAN_SIGNAL`, coût croissant ou saturation n'est mesuré ;
aucun index n'est justifié par les mesures actuelles seules.

Ces deux scénarios prouvent uniquement qu'aucune saturation n'est démontrée au
profil local testé. Ils ne déterminent pas la capacité maximale et ne valident
aucune charge staging ou Production.

## Critères non attestés et risques ouverts

- stabilité CI statistique : p95 <20 minutes et flaky rate <2 % ;
- capacité maximale des endpoints et read models ;
- comportement de charge staging ou Production ;
- rollback de données et PITR ;
- migration runtime Training canonique ;
- intégration des tests React serveur `.test.tsx` au lancement standard ;
- cycle de vie final du fallback Seedance et des compatibilités conservées.

## Verdict Phase 9

**`PHASE9_NOT_READY_TO_CLOSE`**

La Phase 9 a acquis une baseline technique large et reproductible. Ce verdict
n'est pas un échec : treize tâches sur quinze sont terminées après production
de ce document et de la [roadmap suivante](ROADMAP_NEXT.md). Deux critères
formels restent ouverts :

1. attester statistiquement la stabilité de la CI progressive ;
2. achever la migration runtime Training vers le modèle canonique.

La Phase 9 reste active jusqu'à satisfaction de ces critères ou décision
explicite de gouvernance qui les transfère sans les déclarer accomplis.
