# Contrat de baseline performance du diagnostic hebdomadaire

## Statut et portée

Ce contrat rend interprétables les événements déjà émis par
`POST /api/weekly-diagnostic`. Il ne crée aucune métrique, aucun stockage
applicatif et aucune instrumentation supplémentaire. Il ne constitue pas une
baseline mesurée et n'autorise aucune collecte Production.

Statuts initiaux :

- méthode de qualification et de comparaison : `CONTRACT_DEFINED` ;
- baseline réelle : `BASELINE_NOT_CAPTURED` ;
- seuils numériques de régression : `PROPOSITION_NON_VALIDÉE`.

Seuls des logs issus d'un environnement local, staging ou Preview explicitement
autorisé peuvent alimenter une future baseline. Les événements sont analysés
hors de l'application et ne sont jamais écrits en base.

## Identification fermée des événements

Un objet est un événement performance weekly-diagnostic si et seulement si son
ensemble de clés est exactement :

```text
request_id
result
reason
server_total_ms
source_reads_ms
analysis_ms
ai_provider_ms
persistence_ms
application_overhead_ms
```

La signature de durée obligatoire est donc exactement :

```text
server_total_ms
source_reads_ms
analysis_ms
ai_provider_ms
persistence_ms
application_overhead_ms
```

Une clé absente, supplémentaire ou renommée rend l'événement incomplet et
inutilisable. La reconnaissance ne s'appuie ni sur le nom d'un programme, ni
sur un utilisateur, diagnostic, profil, prompt, payload ou autre identifiant
métier. Aucun format tiers n'est inféré.

Chaque événement performance doit être joint par égalité stricte de
`request_id` à exactement un événement HTTP dont :

- `event = WEEKLY_DIAGNOSTIC_REQUEST` ;
- `operation = POST /api/weekly-diagnostic` ;
- le `request_id` est identique.

`request_id` est une clé de corrélation opaque temporaire. Il ne doit figurer
ni dans les agrégats ni dans l'artefact résumé versionné. Les lignes sources
peuvent le conserver uniquement le temps du contrôle de jointure, dans un
répertoire temporaire local à accès borné, puis doivent être supprimées.

## Validation structurelle et invariants

Les six durées doivent être des nombres finis, entiers, supérieurs ou égaux à
zéro et inférieurs ou égaux à la borne runtime `86 400 000 ms`.

Pour chaque ligne :

```text
classified_ms =
  source_reads_ms
  + analysis_ms
  + ai_provider_ms
  + persistence_ms

classified_ms <= server_total_ms

server_total_ms =
  source_reads_ms
  + analysis_ms
  + ai_provider_ms
  + persistence_ms
  + application_overhead_ms
```

L'égalité est exacte sur les valeurs entières émises. Une tolérance statistique
ou un arrondi supplémentaire n'est pas autorisé. Une violation invalide la
ligne et la fenêtre ; elle n'est jamais corrigée silencieusement.

Les phases sont disjointes dans leur interprétation :

- `source_reads_ms` est la durée murale du groupe de lectures parallèles, jamais
  la somme des latences individuelles ;
- `analysis_ms` couvre l'analyse déterministe et la construction du prompt ;
- `ai_provider_ms` couvre l'appel au provider ;
- `persistence_ms` couvre uniquement l'insert autoritatif et la mise à jour de
  planification ;
- `application_overhead_ms` est le reste borné : authentification, quota et
  suivi d'usage, idempotence, lectures conditionnelles hors groupe, création du
  provider et orchestration ;
- le push best-effort n'appartient pas à `persistence_ms`.

### Cohérence résultat/raison et HTTP

Les couples recevables sont :

| `result` performance | `reason` performance | événement HTTP corrélé |
|---|---|---|
| `success` | `COMPLETED` | `outcome=success`, `reason=COMPLETED`, statut 2xx |
| `skipped` | `RESOURCE_ALREADY_EXISTS` | `outcome=skipped`, même raison, statut 2xx |
| `rejected` | `AUTH_REQUIRED` | `outcome=rejected`, même raison, statut 401 |
| `rejected` | `RATE_LIMITED` | `outcome=rejected`, même raison, statut 429 |
| `failed` | raison d'échec machine connue | `outcome=failed`, `reason=INTERNAL_ERROR`, statut 5xx |

Les raisons d'échec actuellement connues sont
`USAGE_STORE_UNAVAILABLE`, `GENERATION_FAILED`, `PROFILE_READ_FAILED`,
`REQUEST_CANCELLED`, `PROVIDER_QUOTA`, `INVALID_OUTPUT`, `PROVIDER_ERROR`,
`PERSISTENCE_FAILED` et `UNEXPECTED_ERROR`. `UNKNOWN_REASON`, une raison nouvelle
ou un couple non listé invalide la cohérence jusqu'à revue additive du contrat ;
aucune catégorie n'est inventée pendant l'analyse.

Le `duration_ms` HTTP et `server_total_ms` utilisent des frontières et des
horloges différentes. Leur delta peut être étudié comme contrôle secondaire,
mais ni `duration_ms >= server_total_ms` ni leur égalité ne constitue un
invariant ligne par ligne.

## Agrégations reproductibles

Toutes les statistiques utilisent les durées brutes entières, sans interpolation
ni arrondi préalable. Pour une série non vide triée par ordre croissant et de
taille `n`, la méthode **nearest-rank** est obligatoire :

```text
p50 = valeur de rang ceil(0,50 × n)
p95 = valeur de rang ceil(0,95 × n)
p99 = valeur de rang ceil(0,99 × n)
```

Les rangs commencent à 1. `p50` et `p95` sont obligatoires pour tout cohort
éligible. `p99` est publié uniquement si ce cohort contient au moins 100 lignes ;
sinon il vaut explicitement `UNAVAILABLE_INSUFFICIENT_SAMPLE`.

Les percentiles sont calculés séparément pour chacune des six durées :

- `server_total_ms` ;
- `source_reads_ms` ;
- `analysis_ms` ;
- `ai_provider_ms` ;
- `persistence_ms` ;
- `application_overhead_ms`.

Les regroupements obligatoires sont :

1. par `result` ;
2. par couple `result/reason` ;
3. par fenêtre UTC fixe ;
4. par phase de durée.

Le cohort autoritatif de comparaison de latence est
`result=success/reason=COMPLETED`. Les lignes `skipped`, `rejected` et `failed`
sont conservées pour les taux et analysées dans leurs propres cohorts ; leurs
phases incomplètes ne sont jamais mélangées aux succès complets.

Le taux d'erreur est :

```text
nombre de lignes result=failed
────────────────────────────────
nombre total de lignes corrélées valides
```

Les taux par raison utilisent le même dénominateur. Aucun agrégat ne contient
de `request_id`, identifiant métier, programme, profil, prompt, payload ou
donnée personnelle. Un cohort de moins de 5 lignes ne publie pas de percentile
par raison : seuls son compteur et son taux global sont conservés afin d'éviter
une pseudo-précision sur un échantillon rare.

## Création d'une baseline immuable

La première baseline recevable doit suivre ce protocole :

1. fixer avant collecte un environnement non-Production, un SHA applicatif et
   une fenêtre de **14 jours UTC consécutifs** ;
2. exporter en lecture seule les logs runtime couvrant toute la fenêtre ;
3. reconnaître les événements par le schéma fermé ci-dessus ;
4. corréler les événements HTTP et performance par `request_id` ;
5. rejeter la fenêtre si une anomalie d'intégrité reste inexpliquée ;
6. obtenir au moins **50 lignes** `success/COMPLETED` valides et corrélées ;
7. calculer les percentiles nearest-rank, compteurs, taux et distributions ;
8. produire un résumé expurgé, calculer son SHA-256 et le versionner dans un
   commit isolé sans conserver l'export brut.

Si les 50 succès ne sont pas atteints, la fenêtre est prolongée par blocs de 7
jours UTC, sans sélectionner les journées a posteriori. La baseline reste
`BASELINE_NOT_CAPTURED` jusqu'à satisfaction de toutes les conditions.

Le résumé immuable doit contenir uniquement : version du contrat, environnement
non-Production, SHA applicatif, bornes UTC, compteurs globaux et par
`result/reason`, nombre d'anomalies par catégorie, percentiles par phase,
taux d'erreur et SHA-256 du résumé. Le SHA de déploiement et les bornes de
collecte sont des métadonnées techniques de preuve, pas des métriques runtime.

Une baseline acceptée n'est jamais réécrite. Une correction ou une nouvelle
référence produit un nouvel artefact et un nouveau commit. L'ancienne preuve
reste consultable.

## Comparaison future

Une fenêtre candidate utilise le même environnement, le même contrat, les mêmes
cohorts, la même méthode percentile et les mêmes règles de taille. Elle couvre
14 jours UTC consécutifs ou la même extension par blocs de 7 jours nécessaire
pour atteindre 50 succès complets. Changer de méthode rend les fenêtres non
comparables.

Pour chaque phase et percentile :

```text
delta_ms = candidate_ms - baseline_ms
delta_percent = ((candidate_ms - baseline_ms) / baseline_ms) × 100
```

Si `baseline_ms = 0`, `delta_percent` est `UNAVAILABLE`; seul `delta_ms` est
rapporté. Le rapport présente simultanément valeur baseline, valeur candidate,
delta absolu, delta relatif, tailles des cohorts et taux d'erreur. Il ne choisit
jamais une sous-fenêtre plus favorable après observation.

## Signaux et seuils de régression

Les règles ci-dessous sont explicites mais restent
**`PROPOSITION_NON_VALIDÉE`** tant qu'une baseline réelle n'a pas été capturée,
revue et validée dans un sous-batch séparé. Elles ne sont donc actuellement ni
un budget, ni un seuil d'arrêt, ni une autorisation de changement runtime.

Un signal proposé nécessite les deux dépassements, absolu **et** relatif, sur le
p95 du cohort `success/COMPLETED` :

| Signal | Condition proposée |
|---|---|
| latence totale | `server_total_ms` augmente d'au moins `20 %` et `1 000 ms` |
| lectures source | `source_reads_ms` augmente d'au moins `25 %` et `100 ms` |
| persistance | `persistence_ms` augmente d'au moins `25 %` et `100 ms` |
| provider IA | `ai_provider_ms` augmente d'au moins `20 %` et `1 000 ms` |
| overhead applicatif | `application_overhead_ms` augmente d'au moins `25 %` et `250 ms` |
| taux d'erreur | augmente d'au moins `2` points de pourcentage et `50 %` relativement |

Le p50 sert à distinguer une dérive générale d'une dérive de queue. Le p99,
lorsqu'il est recevable, est un signal exploratoire et ne déclenche pas seul un
verdict. Toute proposition doit être réévaluée avec la variance de la première
baseline avant de devenir `VALIDATED_REGRESSION_THRESHOLD`.

Indépendamment de ces propositions numériques, une anomalie d'intégrité est un
échec immédiat de la **preuve**, pas nécessairement une régression du produit.

## Contrôles d'intégrité et distribution

Le rapport compte séparément :

- `INCOMPLETE_EVENT` : clés absentes, supplémentaires ou type invalide ;
- `DUPLICATE_PERFORMANCE_REQUEST_ID` : plusieurs performances pour un ID ;
- `DUPLICATE_HTTP_REQUEST_ID` : plusieurs événements HTTP pour un ID ;
- `PHASE_EXCEEDS_TOTAL` : `classified_ms > server_total_ms` ;
- `DURATION_DECOMPOSITION_MISMATCH` : égalité totale/phases/overhead fausse ;
- `HTTP_WITHOUT_PERFORMANCE` : HTTP weekly-diagnostic sans performance ;
- `PERFORMANCE_WITHOUT_HTTP` : performance sans HTTP correspondant ;
- `RESULT_REASON_MISMATCH` : résultat, raison, outcome ou statut incohérent ;
- `UNEXPECTED_DISTRIBUTION_CHANGE` : raison nouvelle, disparition totale du
  cohort de succès, ou déplacement proposé d'au moins 10 points de pourcentage
  d'un `result/reason` face à la baseline.

Le seuil de 10 points de distribution est lui aussi
`PROPOSITION_NON_VALIDÉE`. Une raison inconnue est en revanche toujours soumise
à revue, sans seuil volumétrique.

Tout événement invalide est exclu des percentiles mais conservé dans les
compteurs d'anomalies. Une baseline exige zéro anomalie non expliquée. Une
fenêtre candidate comportant une anomalie ne peut produire qu'un verdict
`COMPARISON_INTEGRITY_FAILED`, jamais `NO_REGRESSION`.

## Limites

- Aucun collector durable weekly-diagnostic n'est défini par ce contrat.
- La rétention des logs runtime doit être vérifiée avant de fixer une fenêtre.
- Les lectures DB individuelles du groupe parallèle ne sont pas séparables avec
  les métriques actuelles.
- La lecture d'idempotence et la lecture conditionnelle `workout_sets` restent
  incluses dans l'overhead.
- Aucune causalité n'est déduite d'une variation de percentile seule.
- Aucune collecte ou comparaison Production n'est autorisée.
