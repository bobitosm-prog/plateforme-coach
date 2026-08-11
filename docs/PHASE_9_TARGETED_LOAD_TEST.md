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

La prochaine preuve recommandée est un quatrième run strictement identique avec
la même observabilité. Elle doit fournir deux runs directement comparables
client/serveur, vérifier le p99 serveur, la stabilité de l'overhead et l'absence
persistante de saturation. Le profil reste borné à 300 secondes, 5 req/s et
5 VU; aucune augmentation de charge n'est autorisée à ce stade.
