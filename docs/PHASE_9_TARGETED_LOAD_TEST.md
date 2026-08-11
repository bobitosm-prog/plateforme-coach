# Test de charge ciblé Phase 9

## Objectif et limite

Le harnais établit une baseline locale reproductible pour identifier les premiers
points de dégradation. Ce n'est pas un stress test et aucun seuil de performance
définitif p95 ou p99 n'est fixé à ce stade. Le Batch 1 autorise exclusivement :

```text
GET /api/feedback/mine
```

Le harnais n'est pas inclus dans les Gates A, B, C1 ou C2. Son lancement reste
une action locale et explicite :

```bash
npm run perf:load:targeted
```

Le mode `--smoke` émet au maximum deux lectures locales sur deux secondes. Il
valide le raccord du harnais mais ne constitue ni une exécution du profil complet
ni une preuve de capacité.

## Environnement et gardes

La cible applicative et Supabase doivent utiliser `localhost` ou `127.0.0.1`.
Le préflight refuse avant toute requête : Production, une référence ou un token
de projet Supabase, une URL distante ou contenant des credentials, un projet
Seedance distant, Stripe live, Anthropic réel, Push réel, SMTP distant, une
route autre que celle allowlistée, une méthode autre que `GET`, une redirection,
un timeout différent de cinq secondes, tout retry et tout dépassement des bornes.

Aucune option CLI ne permet de changer cible, route, méthode, durée, débit ou
concurrence. Un marqueur privé dans le répertoire temporaire du système refuse
une nouvelle exécution si le cleanup précédent n'est pas attesté.

## Fixtures et cleanup

Avant le chrono, le runner crée cinq clients Auth/profiles synthétiques et vingt
`bug_reports` par client. Chaque ligne porte un marqueur unique
`load-<timestamp>-<suffixe>` dans son périmètre. Les mots de passe, sessions,
cookies, JWT, clés anon et service-role restent en mémoire et ne sont jamais
écrits dans le rapport.

Un cleanup idempotent est exécuté après succès, échec, `SIGINT` ou `SIGTERM`. Il
supprime seulement les rapports du marqueur courant, les éventuelles relations,
les profils et les utilisateurs Auth créés par ce run. Il exige ensuite zéro
résidu synthétique et l'égalité des compteurs globaux observés avant/après. Une
incertitude laisse le marqueur en échec et bloque le prochain lancement.

## Profil complet codé

| Phase | Durée | Utilisateurs virtuels | Débit agrégé |
|---|---:|---:|---:|
| Warm-up | 30 s | 1 | 1 req/s |
| Low | 60 s | 2 | 2 req/s |
| Ramp | 60 s | 2 → 5 | 2 → 5 req/s |
| Plateau | 120 s | 5 | 5 req/s |
| Cooldown | 30 s | 1 | 1 req/s |

Le timeout est de 5 secondes par lecture, sans retry. Les maxima immuables sont
5 requêtes simultanées, 5 req/s et 300 secondes au total.

## Mesures et rapport

Chaque lecture enregistre uniquement son timestamp, sa phase, son statut HTTP,
sa durée client, un éventuel timeout ou incident réseau et le `x-request-id`.
Pour chaque phase, le rapport calcule tentatives, terminaisons, débit demandé et
obtenu, p50/p95/p99, réponses 2xx/4xx/5xx/429, timeouts, erreurs réseau et pic de
concurrence.

Le rapport détaillé expurgé est écrit avec des permissions privées dans le
répertoire temporaire du système. La sortie console reste agrégée. Cookies,
Authorization, mots de passe, JWT et clés ne font jamais partie des mesures.

Le lanceur possède désormais un serveur Next de production dédié, lié
uniquement à `127.0.0.1:3212`. Il capture en mémoire les événements JSON
`FEEDBACK_READ_REQUEST` émis par ce processus et ne conserve que timestamp,
statut, request ID et `duration_ms`. Chaque requête de charge fournit un
`x-request-id` unique : le rapport peut ainsi calculer les p50/p95/p99 client et
serveur, l'écart client − serveur, les agrégats par phase et les dix requêtes
client les plus lentes. Cette analyse est descriptive et n'attribue aucune
cause aux outliers.

Un échantillonnage borné toutes les cinq secondes relève aussi le RSS/CPU du
processus Next et, via PostgreSQL local, connexions, attentes de lock et requêtes
actives depuis plus d'une seconde. Les ressources CPU/mémoire des conteneurs
PostgreSQL, PostgREST et Kong restent `NON_MESUREE` afin de ne pas perturber la
baseline avec une sonde Docker lourde. Collecteur et échantillonneur sont
arrêtés sur succès, échec, `SIGINT` ou `SIGTERM`; les logs restent en mémoire et
le répertoire de build local dédié est supprimé à la fin.

Un résultat complet fournit `MEASURED_WITHOUT_CAPACITY_VERDICT` : il mesure un
comportement, mais ne transforme pas encore les percentiles en seuil PASS/FAIL.

## Première baseline locale — 11 août 2026

La première exécution complète, strictement locale et sans modification du
profil, est classée **`BASELINE_VALID`**. Cette classification signifie que la
mesure est exploitable, que les gardes de sécurité ont tenu et que le cleanup
est complet; elle ne valide pas encore la capacité du système.

### Résultats globaux

| Mesure | Résultat |
|---|---:|
| Durée murale | 301,412 s |
| Fenêtre active | 298,462 s |
| Requêtes tentées / terminées | 985 / 985 |
| Throughput sur la fenêtre active | 3,300 req/s |
| p50 | 82,53 ms |
| p95 | 95,39 ms |
| p99 | 213,94 ms |
| Latence maximale | 589,38 ms |
| HTTP 2xx | 985 |
| HTTP 4xx / 429 / 5xx | 0 / 0 / 0 |
| Timeouts / erreurs réseau | 0 / 0 |

Le plateau a exécuté 599 requêtes à 4,99 req/s, avec un p50 de 81,44 ms,
un p95 de 93,14 ms et un p99 de 158,34 ms. La rampe a montré un pic p99
ponctuel à 277,08 ms qui ne persistait pas au plateau; cette seule observation
ne permet aucune conclusion causale.

### Ressources et cleanup

Les sondes ponctuelles ont observé au maximum 13 connexions PostgreSQL, sans
attente de lock et sans requête active de plus d'une seconde. Les mesures CPU
et mémoire de Next, PostgreSQL, PostgREST et Kong sont des instantanés et non
une télémétrie continue.

Après le run, les rapports, profils et utilisateurs Auth synthétiques corrélés
étaient chacun à zéro. Les compteurs globaux avant/après étaient identiques et
le marqueur de cleanup ne contenait aucune erreur.

### Limites et seconde baseline

Les deux premières baselines locales ont été capturées avant que le lanceur ne
possède les logs structurés du serveur Next. Leurs `duration_ms` serveur et leurs
requêtes lentes ne peuvent donc pas être corrélés rétroactivement. La seconde a
confirmé un throughput de `3,301 req/s`, un p50 de `80,84 ms` et un p95 de
`89,95 ms`, mais son p99 de `342,52 ms` et son p99 plateau de `347,26 ms` ont
motivé le verdict **`BASELINE_VARIABILITY_REVIEW`**. Ces pics restent des
constats client sans conclusion causale.

## Troisième baseline locale corrélée — 11 août 2026

Le troisième run a repris exactement le même scénario, la même route et le
même profil : 300 secondes, cinq VU et cinq requêtes par seconde au maximum,
timeout de cinq secondes et aucun retry. Il est classé
**`BASELINE_SERVER_TAIL_VARIABILITY`**.

### Client, serveur et overhead

| Mesure | Client | Serveur | Overhead client − serveur |
|---|---:|---:|---:|
| Requêtes / corrélations | 986 / 986 | 986 / 986 | 100 % |
| Throughput actif | 3,304 req/s | — | — |
| p50 | 65,46 ms | 60 ms | 5,44 ms |
| p95 | 70,85 ms | 65 ms | 7,26 ms |
| p99 | 76,65 ms | 69 ms | 8,77 ms |
| Maximum client | 158,39 ms | — | — |

Les 986 réponses sont des `2xx`; aucun `4xx`, `429`, `5xx`, timeout ou incident
réseau n'est observé. Le principal outlier appartient à la phase Ramp :
`158,39 ms` côté client, `152 ms` côté serveur et `6,39 ms` d'overhead, avec un
statut HTTP `200`. Les outliers de ce run suivent donc principalement la durée
serveur, tandis que l'overhead client reste faible et stable. Cette observation
n'attribue pas de cause technique plus précise.

### Ressources et cleanup

Les 61 échantillons locaux ont observé entre 8 et 9 connexions PostgreSQL,
aucune attente de lock et aucune requête active depuis plus d'une seconde. Les
mesures CPU/RSS Next restent ponctuelles et ne démontrent aucune saturation.
Après le run, rapports, profils et utilisateurs Auth synthétiques sont chacun à
zéro; les compteurs hors scope sont inchangés, le serveur Next dédié est arrêté,
le port `3212` est libre et son build temporaire est supprimé.

### Conclusion et prochaine preuve

Le throughput reste stable sur les trois runs et aucune saturation locale n'est
démontrée à 5 req/s. Le Run 3 montre seulement que ses propres outliers sont
principalement serveur; les pics des Runs 1 et 2 ne sont pas rétro-corrélables.
La capacité maximale n'est pas connue, et ni staging ni Production ne sont
validés par ces mesures locales.

La preuve de confirmation est le quatrième run ci-dessous, exécuté avec la même
observabilité, sans augmentation de durée, débit ou VU.

## Quatrième baseline locale corrélée — 11 août 2026

Le Run 4 a repris strictement le profil du Run 3 et obtient le verdict
**`BASELINE_REPRODUCIBLE`**. Les `985/985` requêtes sont des HTTP `200`, sans
erreur ni timeout, et les `985/985` request IDs sont corrélés.

| Mesure | Client | Serveur | Overhead client − serveur |
|---|---:|---:|---:|
| Throughput actif | 3,301 req/s | — | — |
| p50 | 64,96 ms | 59 ms | 5,49 ms |
| p95 | 69,48 ms | 63 ms | 7,23 ms |
| p99 | 77,10 ms | 70 ms | 8,96 ms |
| Maximum client | 130,87 ms | — | — |

Le principal outlier associe `130,87 ms` client, `124 ms` serveur et
`6,87 ms` d'overhead, avec HTTP `200`. PostgreSQL reste entre 8 et 9
connexions, sans lock en attente ni requête active depuis plus d'une seconde;
aucune saturation persistante n'est démontrée. Après le run, rapports, profils
et utilisateurs Auth synthétiques sont chacun à zéro, les compteurs hors scope
sont inchangés, le port `3212` est libre et le build temporaire est supprimé.

### Comparaison directe Run 3 / Run 4

| Mesure | Écart Run 4 contre Run 3 |
|---|---:|
| Throughput | −0,09 % |
| Client p99 | +0,59 % |
| Serveur p99 | +1,45 % |
| Overhead p99 | +2,17 % |
| Plateau client p99 | +2,25 % |

Ces écarts bornés, la corrélation complète, l'absence d'erreur et le cleanup
complet clôturent le premier scénario avec la formulation exacte suivante :

> `GET /api/feedback/mine` constitue une baseline locale reproductible au
> profil testé : 300 secondes, au maximum 5 req/s et 5 VU, sans retry. Aucune
> saturation n'est démontrée au profil testé.

Cette conclusion ne définit pas la capacité maximale, ne valide ni staging ni
Production et ne garantit pas l'endpoint au-delà de 5 req/s.

## Second scénario recommandé

| Candidat | Coût DB et représentativité | Sécurité et observabilité | Décision |
|---|---|---|---|
| Training read path | Plusieurs projections et historiques, très représentatif du dashboard | Read-only local possible, mais formats legacy et consommateurs multiples compliquent fixtures et corrélation | Différer jusqu'à un périmètre runtime stabilisé |
| Nutrition read model | Trois lectures parallèles sur journal, jours actifs et eau; parcours fréquent | Fixtures locales déterministes, RLS, aucun fournisseur externe; corrélation PostgREST à préparer | **Recommandé** |
| `GET /api/ai-quota` | Identité et quota DB, coût borné | Observabilité HTTP déjà présente, mais rate limit 30/min incompatible avec 5 req/s sans changer le scénario | Ne pas retenir pour ce profil |

Le second scénario recommandé est donc le **read model Nutrition**. Son
implémentation reste locale, read-only pendant le chrono et utilise des données
synthétiques corrélées.

### Harnais Nutrition instrumenté

Le cycle runtime réel est maintenant partagé sans changer son contrat :

```text
NutritionTab
  → useNutritionJournal.reload
  → readNutritionJournalCycle
      ├─ daily_food_logs, owner + selectedDate, created_at ASC
      ├─ daily_food_logs(date), owner + UTC J-30
      └─ water_intake(amount_ml), owner + selectedDate, limit 50
  → readNutritionTabSummary
```

Les trois lectures restent lancées dans le même `Promise.all`. Aucun cache,
retry, RPC, pagination, index ou appel supplémentaire n'est introduit. Le hook
conserve ses états, son compteur de réponses obsolètes, ses callbacks et sa
mutation d'eau séparée.

L'instrumentation est opt-in et ne produit aucun log dans le runtime normal.
Elle expose seulement `total_ms`, les durées `journal_ms`, `calendar_ms` et
`water_ms`, `aggregation_ms`, les trois cardinalités et un identifiant de
corrélation borné. Cookies, JWT, Authorization, mots de passe, clés et payloads
Nutrition ne sont jamais intégrés aux métriques.

Le runner direct s'exécute explicitement avec :

```bash
npm run perf:load:nutrition
```

Il refuse Production, Supabase distant, URL avec credentials, fournisseurs
réels, cible/opération différente, timeout ou retry modifié et tout dépassement
de cinq VU, cinq lectures logiques par seconde ou 300 secondes. Le service-role
local sert uniquement au setup et au cleanup; la mesure utilise cinq sessions
client réelles soumises aux RLS.

Les fixtures contiennent cinq clients, 31 jours avec huit `daily_food_logs` par
jour et par client (`1 240` lignes), ainsi que huit `water_intake` par client
sur la date mesurée (`40` lignes). Le cleanup couvre succès, échec, `SIGINT` et
`SIGTERM`, exige zéro ligne Nutrition/profil/Auth corrélée et compare les
compteurs globaux avant/après.

Le mode `--smoke` exécute exactement une lecture logique authentifiée, soit les
trois lectures DB parallèles. Il valide les cardinalités `8/248/8`, les cinq
durées instrumentées et le cleanup. Ce smoke ne constitue pas un profil de
charge ni une preuve de capacité. La commande reste absente des Gates CI.

Le smoke d'extraction du 11 août 2026 a terminé `1/1` lecture logique sans
timeout : `8,66 ms` au total, `7,22 ms` pour le journal, `8,10 ms` pour le
calendrier, `6,60 ms` pour l'eau et `0,38 ms` pour l'agrégation. Les
cardinalités étaient `8/248/8`; les `daily_food_logs`, profils et utilisateurs
Auth corrélés étaient à zéro après cleanup, et les compteurs globaux étaient
identiques avant/après. Cette mesure est seulement une preuve de raccordement.

### Première baseline Nutrition locale — 11 août 2026

Le profil complet borné a été exécuté exactement une fois sur la stack locale,
sans modification du dataset, du profil, des index ou du code. La mesure est
classée **`NUTRITION_BASELINE_VALID`** : les `985/985` cycles logiques se sont
terminés à `3,300 req/s`, sans erreur ni timeout. La latence totale est p50
`10,89 ms`, p95 `14,12 ms`, p99 `17,92 ms` et maximum `51,98 ms`.

| Lecture | p50 | p95 | p99 | Observation |
|---|---:|---:|---:|---|
| Journal | `8,64 ms` | `11,39 ms` | `14,61 ms` | 8 lignes par cycle |
| Calendrier | `10,61 ms` | `13,77 ms` | `17,52 ms` | Lecture dominante, 248 lignes par cycle |
| Eau | `7,29 ms` | `10,08 ms` | `12,56 ms` | 8 lignes par cycle |
| Agrégation | — | `0,09 ms` | — | Coût applicatif marginal |

Les cinq phases conservent zéro erreur et zéro timeout :

| Phase | Cycles | Throughput | Total p50 | Total p95 | Total p99 |
|---|---:|---:|---:|---:|---:|
| Warm-up | 29 | `0,964 req/s` | `11,42 ms` | `25,35 ms` | `28,59 ms` |
| Low | 119 | `1,983 req/s` | `10,50 ms` | `14,80 ms` | `16,44 ms` |
| Ramp | 209 | `3,483 req/s` | `11,23 ms` | `14,49 ms` | `17,26 ms` |
| Plateau | 599 | `4,991 req/s` | `10,65 ms` | `13,52 ms` | `17,33 ms` |
| Cooldown | 29 | `0,967 req/s` | `11,17 ms` | `14,75 ms` | `15,23 ms` |

De Low à Plateau, le throughput suit la montée demandée, le p95 ne se dégrade
pas et aucune erreur ou timeout n'apparaît. Le p99 augmente légèrement, sans
signal de saturation associé.

Les 61 sondes locales relèvent des connexions PostgreSQL min/médiane/max de
`9/9/9`, aucune attente de lock et aucune requête active de plus d'une seconde.
`pg_stat_statements` enregistre `+985` appels pour chacune des trois lectures.
Les temps DB moyens estimés avant/après sont d'environ `0,39 ms` pour le
journal, `3,53 ms` pour le calendrier et `0,09 ms` pour l'eau.

Les plans en lecture seule confirment un `Seq Scan + Sort` pour le journal, un
`Seq Scan` pour le calendrier et un `Seq Scan` sous `Limit` pour l'eau. Les
tables ne possèdent pas d'index composite adapté à ces filtres. Cette absence
et ces scans sont des observations, pas une preuve de défaut : aucune
dégradation mesurable cohérente avec leur coût n'apparaît au profil testé. La
baseline n'est donc pas classée `NUTRITION_BASELINE_DB_SCAN_SIGNAL` et aucun
index ne doit être ajouté sur la seule base du plan SQL.

Cette première mesure locale ne détermine aucune capacité maximale et ne valide
ni staging ni Production. La preuve suivante recommandée est un deuxième run
Nutrition strictement identique, sur le même HEAD, avec le même dataset, le
même profil et la même instrumentation, sans modification d'index. Il doit
vérifier la reproductibilité des p95/p99 et du coût dominant du calendrier.
