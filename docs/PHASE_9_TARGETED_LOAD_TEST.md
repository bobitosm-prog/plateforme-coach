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

Un résultat complet fournit `MEASURED_WITHOUT_CAPACITY_VERDICT` : il mesure un
comportement, mais ne transforme pas encore les percentiles en seuil PASS/FAIL.
