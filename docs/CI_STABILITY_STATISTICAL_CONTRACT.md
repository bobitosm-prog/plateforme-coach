# Contrat statistique de stabilité CI Phase 9 — V1 et addendum V2

## Statut

Ce contrat définit la transition de `CI_STABILITY_CANDIDATE` vers `CI_STABLE`.
Il ne réalise pas cette transition. Le contrat V1 et son registre restent
immuables et auditables. La collecte automatique a été validée sur le run
GitHub Actions `31784233843`, attempt `1`, puis son artefact primaire `PASS` a
été importé exactement une fois. Le registre append-only contient donc encore
`1/150` run complet primaire sur `1/7` jour UTC. Dix-neuf autres observations
V1 complètes et importables ont été identifiées ; elles seront toutes ajoutées
dans le sous-batch 9R.1, PASS comme FAIL, sans réécriture des lignes existantes.
Le statut reste `CI_STABILITY_CANDIDATE`.

## Addendum V2 — décision d'échantillonnage

Le modèle `phase-9-ci-stability-v2` est adopté le **2026-09-04**. Cette date
versionne la décision ; elle n'ouvre pas la fenêtre statistique. La date UTC,
l'heure et le SHA de départ effectifs seront enregistrés explicitement lors de
l'activation de 9R.4, une fois toutes les conditions de départ satisfaites.
V2 est additif et non rétroactif : les observations V1 et l'en-tête V1 du
registre sont conservés. Aucun résultat historique n'est requalifié, supprimé
ou remplacé par cette décision.

V2 ne change aucun seuil ni aucune gate. Il complète uniquement le modèle
d'échantillonnage pour qu'une branche stable puisse continuer à produire une
preuve statistique sans push organique.

### Observation primaire V2 et indépendance

Une exécution périodique sur un SHA inchangé constitue une nouvelle observation
primaire admissible uniquement si toutes les conditions suivantes sont vraies :

1. sa cadence a été préenregistrée avant l'ouverture de la fenêtre ;
2. son déclenchement ne dépend pas du résultat précédent ;
3. elle possède un nouveau GitHub `run_id` et `run_attempt=1` ;
4. elle recrée un environnement CI éphémère neuf, sans état du run précédent ;
5. PostgreSQL, navigateurs et services sont recréés et isolés selon le contrat
   existant ;
6. elle ne chevauche aucune autre observation statistique ;
7. A, B, C1 et C2 sont tous exécutés jusqu'à un état terminal ;
8. elle produit un artefact `collected_observation` valide ;
9. aucun retry ou rerun silencieux n'est utilisé ;
10. toutes les observations admissibles sont importées, PASS comme FAIL, sans
    sélection humaine ni suppression.

L'indépendance désigne donc une exécution, un environnement et un déclenchement
indépendants. Elle n'impose pas un SHA différent. Plusieurs observations
primaires du même SHA canonique sont explicitement admissibles en V2.

### SHA canonique et remise à zéro

Le SHA applicatif canonique observé au début de la fenêtre reste fixe. Si un
bug produit ou CI nécessite une modification de code, de test, de fixture, de
configuration exécutable ou de dépendance pouvant influencer A/B/C1/C2, la
fenêtre est stoppée, la correction est validée normalement, puis une nouvelle
fenêtre V2 repart de zéro sur le nouveau SHA. Les populations avant et après
correction ne sont jamais mélangées pour déclarer une stabilité continue.

Une modification purement documentaire, ou une modification du collecteur qui
ne change ni les gates ni leur environnement, doit être identifiée séparément.
Elle ne remet pas la fenêtre à zéro seulement si son absence d'effet sur le
code observé et sur A/B/C1/C2 est démontrée et inscrite dans la piste d'audit.
Dans le doute, la règle fail-closed s'applique : nouvelle fenêtre.

### Cadence horaire, scheduling et absence de chevauchement

Le workflow **Statistical Observation** peut utiliser `schedule/cron` à raison
d'une observation par heure. Cette autorisation vaut uniquement pour le
workflow statistique ; elle ne remplace pas les validations de développement.
La fenêtre doit couvrir au minimum 7 dates UTC distinctes et reste ouverte
jusqu'à au moins 150 observations primaires complètes.

Une observation durant environ 17 minutes, la cadence horaire laisse une marge
normale. Si une observation est encore active à l'échéance suivante, la
nouvelle observation attend dans une file dédiée. Elle ne démarre pas en
parallèle, n'annule pas la précédente et n'est pas artificiellement substituée
par un dispatch. L'ordre de la file et l'échéance manquée restent traçables.

Le workflow statistique est séparé de la CI de développement. La CI de
développement peut conserver `cancel-in-progress` si nécessaire. Le workflow
statistique utilise une concurrency dédiée avec `cancel-in-progress: false` et
une sérialisation garantissant une seule observation active. Cette architecture
sera implémentée dans 9R.3 ; le présent addendum ne modifie aucun workflow.

### Rôle de `workflow_dispatch` et distinction des reruns

`workflow_dispatch` reste autorisé pour le diagnostic, la reprise contrôlée et
la vérification. Des dispatches choisis après lecture des résultats ne peuvent
pas être le mécanisme principal des 150 observations : la fenêtre V2 est
principalement pilotée par la cadence préenregistrée.

Un rerun GitHub appartient à la même famille de run et au même SHA. Il reste
exclu des 150 primaires et des percentiles ; il sert uniquement à classifier un
primaire FAIL selon les règles V1. À l'inverse, le run horaire suivant possède
un nouveau `run_id`, `run_attempt=1`, et constitue un nouveau primaire s'il
respecte toutes les conditions V2.

### Fenêtre roulante V2 et préservation des échecs

Après le démarrage V2, l'évaluation porte exactement sur les **150 dernières
observations primaires admissibles de la fenêtre V2**. Ces 150 observations
doivent couvrir au moins 7 dates calendaires UTC distinctes. Tant que la fenêtre
V2 contient moins de 150 primaires complets, ou que ses 150 derniers primaires
ne couvrent pas 7 dates UTC, le statut reste `CI_STABILITY_CANDIDATE`.

Les calculs de p50, p95, flaky rate, unresolved et unknown portent sur ce même
suffixe de 150 primaires. Les reruns sont associés à leur racine mais ne sont
jamais comptés comme primaires. Les observations V1 et les observations V2
sorties de la fenêtre roulante restent dans le registre append-only. Un FAIL,
un incomplete ou un cancelled n'est jamais caché : tout artefact admissible est
conservé ; seuls les primaires complets entrent dans le dénominateur des 150.

Cette sémantique V2 sera implémentée et testée dans le lot workflow/évaluateur
approprié avant activation. Jusqu'alors, l'évaluateur V1 reste l'autorité
exécutable et aucune fenêtre V2 ne peut être déclarée ouverte.

### Conditions de démarrage, arrêt et reprise

La fenêtre V2 peut démarrer uniquement après validation simultanée de :

1. cet addendum V2 versionné ;
2. la récupération du registre canonique à 20 observations V1 ;
3. la correction des erreurs reproductibles de `MeasureModal.tsx` ;
4. la correction des erreurs reproductibles de `NutritionPreferences.tsx` ;
5. la suite complète verte ;
6. le workflow statistique non annulable et non chevauchant prêt ;
7. le schedule horaire prêt ;
8. le SHA canonique, la date et l'heure UTC de départ enregistrés.

Si une vraie correction du code observé devient nécessaire, le scheduling est
stoppé proprement, le run éventuellement actif termine sans annulation, puis la
fenêtre est close sans déclaration stable. Après correction et validation, une
nouvelle fenêtre repart de zéro selon la politique SHA ci-dessus.

### Exigences inchangées

V2 conserve strictement :

- `COMPLETE_RUNS >= 150` sur les primaires admissibles ;
- `DISTINCT_UTC_DATES >= 7` dans les 150 derniers primaires ;
- p95 nearest-rank strictement inférieur à 20 minutes ;
- flaky rate strictement inférieur à 2 % ;
- `unresolved = 0` et `unknown = 0` ;
- A, B, C1 et C2 tous terminaux ;
- artefacts valides et absence de retry masqué.

Il est interdit de réduire les tests ou Gate C2, de diminuer 150 ou 7 jours,
d'assouplir p95 ou le flaky rate, d'accepter unresolved/unknown, de cacher des
FAIL, de compter des incomplete/cancelled ou d'inclure des reruns dans les 150.

### Lots de récupération approuvés et estimation

L'ordre approuvé est : 9R.1 récupération des 19 observations historiques ;
9R.2a correction `MeasureModal` ; 9R.2b correction `NutritionPreferences` ;
9R.3 workflow statistique non annulable ; 9R.4 cadence horaire ; 9R.5 fenêtre
d'observation ; 9R.6 audit statistique final. Phase 10 reprend ensuite avec
10R.1 corpus organique, 10R.2 assessments et 10R.3 readiness staging.

À une observation par heure, 7 jours représentent 168 tentatives théoriques.
Atteindre 150 complètes exige environ 89,3 % de completion et laisse une marge
de 18 tentatives. La durée minimale est 7 jours à compter de l'activation
effective, jamais de la date de décision. Si moins de 150 runs sont complets à
ce terme, la cadence continue jusqu'à satisfaire simultanément tous les gates.

## Contrat historique V1 — conservé

Les sections suivantes décrivent le contrat V1 historique. Elles restent
normatives pour ses observations et pour l'implémentation actuelle jusqu'à
l'activation explicite de V2. L'addendum ne réécrit pas leur historique.

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

### Collecte et persistance

Un cinquième job non bloquant, `CI Stability Observation`, dépend des quatre
gates sans modifier leurs commandes, timeouts ou seuils. Il s'exécute seulement
pour les pushes `phase-6-staging` et les dispatches explicites, car les gates
Heavy sont volontairement absentes des pull requests. Avec une permission
GitHub Actions read-only, il lit l'attempt courant, calcule la durée jusqu'à la
dernière gate terminale et produit un fragment
`collected_observation`. `github.run_attempt=1` produit un primaire ; les
attempts suivants produisent un `rerun_of` vers l'attempt 1 et conservent le
même SHA.

Un rerun GitHub partiel qui ne réexécute pas les quatre gates reste
`incomplete_collection`. Pour être importable, un rerun doit être un attempt
complet A/B/C1/C2 ; cette règle empêche de reconstruire artificiellement une
preuve verte à partir de jobs provenant d'attempts différents.

Le fragment du filesystem éphémère n'est **pas** considéré durable. Le job le
transfère dans un artefact immuable nommé avec run ID et attempt, conservé 90
jours. Une collecte incomplète produit seulement un artefact
`incomplete_collection`; elle n'est jamais importable comme observation et le
statut reste fail-closed.

Un artefact GitHub n'est pas le registre canonique. Sa persistance définitive
exige une revue opérateur locale avant expiration :

```bash
npm run ci:stability:import -- /chemin/observation.json --confirm-append
npm run ci:stability:check
git diff -- ci/stability/observations.jsonl
```

L'import assigne uniquement le prochain `sequence`, vérifie le préfixe
historique, l'unicité, la chronologie et la relation rerun/SHA, puis ouvre le
registre en mode append et écrit seulement le suffixe validé d'une ligne.
L'historique existant n'est jamais réécrit. Il ne lance ni `git add`, commit ou
push. La revue et le commit humain du registre constituent la seule persistance
Git autorisée dans ce sous-batch. Aucun token GitHub, payload d'API ou détail
de job n'entre dans le registre.

La première collecte réelle confirme opérationnellement cette chaîne : quatre
gates terminales `PASS`, artefact `collected_observation`, durée primaire
`979000 ms`, validation structurelle et import append-only en `sequence=1`.
Cette preuve valide le mécanisme de collecte et de persistance, pas la stabilité
statistique. Il manque encore 149 runs primaires et 6 dates UTC distinctes.

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
la fenêtre encore incomplète conservent `CI_STABILITY_CANDIDATE`.

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
