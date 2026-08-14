# Contrat statistique de stabilité CI Phase 9

## Statut

Ce contrat définit la transition de `CI_STABILITY_CANDIDATE` vers `CI_STABLE`.
Il ne réalise pas cette transition : le registre formel ne contient encore
aucune observation complète et les deux runs historiques ne sont pas
rétro-enregistrés, car leur SHA, leur horodatage et, pour le second, leur durée
ne sont pas tous versionnés.

## Unité d'observation

Un **run complet** est une première tentative du workflow `MoovX Quality Gates`
pour laquelle Gate A, Gate B, Gate C1 et Gate C2 ont tous atteint un état
terminal `PASS` ou `FAIL`. Une annulation, un job absent ou ignoré, une durée
manquante ou un résultat inconnu ne compte pas dans l'échantillon et bloque la
transition tant que l'observation n'est pas expliquée et complétée.

- `PASS` : les quatre gates sont `PASS` dès la première tentative.
- `FAIL` : au moins une gate est `FAIL` lors de la première tentative.
- `flaky` : la première tentative complète est `FAIL`, puis une nouvelle
  tentative du **même SHA**, sans changement de code, configuration, fixture ou
  dépendance, devient `PASS`. Le run racine reste `FAIL` dans l'historique.
- un `FAIL` qui reste en échec ou qui nécessite un autre SHA n'est pas flaky :
  c'est un échec non résolu dans la fenêtre.

Les reruns sont des lignes distinctes reliées par `rerun_of` au run racine. Ils
ne comptent ni dans les 150 runs primaires, ni dans les percentiles. Ils servent
uniquement à classifier le premier résultat. Un rerun ne remplace, ne corrige
et ne supprime jamais la ligne initiale.

Tout retry caché dans une gate, un test ou un orchestrateur doit porter
`retry_masked=true`; cette valeur invalide immédiatement le registre pour une
transition stable. Relancer silencieusement jusqu'au vert est interdit.

## Registre append-only

Le registre canonique est
[`ci/stability/observations.jsonl`](../ci/stability/observations.jsonl). Sa
première ligne est l'en-tête immuable :

```json
{"record_type":"registry","schema_version":1,"contract":"phase-9-ci-stability-v1"}
```

Chaque nouvelle tentative ajoute ensuite exactement une ligne JSON compacte,
sans modifier, trier ou supprimer les précédentes. `sequence` commence à 1 et
augmente de un. L'ordre des lignes et `started_at` sont chronologiques. Git
constitue la piste d'audit ; une correction produit une nouvelle version du
contrat ou une observation de rectification explicitement conçue dans un
sous-batch séparé, jamais une réécriture silencieuse.

Chaque observation conserve obligatoirement :

- `run_id`, opaque et unique ;
- `sha`, SHA Git complet de 40 caractères ;
- `started_at`, date/heure UTC ISO 8601 ;
- `duration_ms`, durée murale depuis le début du workflow jusqu'à l'état
  terminal des quatre gates ;
- `result`, résultat global cohérent avec `gates.A/B/C1/C2` ;
- `rerun_of`, `null` pour la première tentative ou l'identifiant racine ;
- `failure_classification`, `null` pour un PASS, sinon une catégorie versionnée ;
- `retry_masked`, obligatoirement `false` pour une preuve recevable.

Les catégories d'échec sont `TYPECHECK_LINT`, `TEST`, `BUILD`, `DATABASE`,
`E2E`, `CLEANUP`, `TIMEOUT`, `INFRASTRUCTURE`, `CANCELLED` et `UNKNOWN`.
`UNKNOWN` est conservable pour ne pas perdre la preuve, mais bloque
`CI_STABLE` jusqu'à qualification additive par un futur contrat explicite.

## Fenêtre statistique

La fenêtre est déterministe : en partant du dernier run primaire, prendre le
plus court suffixe chronologique contenant simultanément :

- au moins **150 runs complets primaires** ;
- au moins **7 dates calendaires UTC distinctes**.

Si l'une des deux conditions manque, prendre tout l'historique disponible et
rester `CI_STABILITY_CANDIDATE`. Les reruns ne gonflent jamais l'échantillon.

Le seuil de 150 est retenu. Il donne une granularité de `1 / 150 = 0,667 %` :
avec la limite stricte de 2 %, au maximum deux racines flaky sont acceptables
(`2/150 = 1,333 %`) et trois sont refusées (`3/150 = 2 %`). Avec zéro flaky,
la règle de trois donne en outre une borne supérieure approximative de 2 % à
95 % de confiance. Sept jours UTC obligent l'échantillon à traverser un cycle
hebdomadaire plutôt qu'une rafale d'exécutions sur une seule journée.

## Calculs exacts

Les durées utilisées sont celles des runs primaires, PASS comme FAIL, jamais
celles des reruns. Pour `n` durées triées par ordre croissant, la méthode est le
**nearest rank** :

- `p50 = valeur de rang ceil(0,50 × n)` ;
- `p95 = valeur de rang ceil(0,95 × n)`.

Les rangs commencent à 1. Pour 150 runs, p50 est la 75e durée et p95 la 143e.
Il n'y a ni interpolation, ni arrondi de durée avant comparaison.

Le flaky rate est :

```text
nombre de runs racines FAIL suivis d'un rerun PASS du même SHA
─────────────────────────────────────────────────────────────
             nombre de runs primaires dans la fenêtre
```

Il est donc calculé sur les **premiers résultats**, jamais sur la seule liste
des reruns verts.

## Transition formelle

L'évaluateur peut retourner `CI_STABLE` si et seulement si, sur la fenêtre :

1. registre structurellement valide, append-only et sans retry masqué ;
2. au moins 150 runs primaires complets sur au moins 7 jours UTC distincts ;
3. chaque échec est classifié et aucun `UNKNOWN` ne subsiste ;
4. aucun FAIL non résolu ne subsiste ;
5. p95 strictement inférieur à `1 200 000 ms` (20 minutes) ;
6. flaky rate strictement inférieur à `0,02` (2 %).

Une égalité à 20 minutes ou 2 % est un échec du critère strict. Le p50 est
informatif mais obligatoire dans le bilan. `CI_STABLE` doit être matérialisé
par un sous-batch documentaire séparé après revue du registre ; ce document et
le registre vide conservent `CI_STABILITY_CANDIDATE`.

## Recalcul et régression

La commande read-only suivante valide le registre et recalcule automatiquement
la fenêtre, p50, p95, flaky rate et raisons de non-transition :

```bash
npm run ci:stability:check
```

Elle ne déclenche aucune CI et ne contacte aucun service. Après chaque ligne
ajoutée, le même évaluateur doit être rejoué. Une fois `CI_STABLE` déclaré, tout
nouveau run entre dans la fenêtre roulante. Si un critère cesse d'être vrai,
si un retry masqué apparaît ou si le registre devient invalide, le statut
retombe immédiatement à `CI_STABILITY_CANDIDATE`; aucun délai de grâce ni
maintien manuel du label stable n'est autorisé.
