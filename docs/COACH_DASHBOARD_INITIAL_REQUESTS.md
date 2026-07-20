# Requêtes initiales du dashboard coach

## Protocole reproductible

Le scénario automatisé
[`coach-dashboard-initial-requests.spec.ts`](../e2e/coach-dashboard-initial-requests.spec.ts)
utilise exclusivement l'application, Supabase Auth, PostgREST et Realtime
locaux. Il crée des personas synthétiques, ouvre une fenêtre navigateur neuve,
commence la mesure juste avant la soumission du formulaire de connexion vers
`/coach`, attend la section initiale `accueil`, puis termine après une seconde
complète sans nouvelle requête de données. Trois fenêtres indépendantes sont
mesurées.

Sont comptés les `fetch`/XHR locaux et l'ouverture WebSocket Realtime. Les
documents de navigation sont classés dans « autre local »; les assets, images,
polices, feuilles de style, chunks et HMR `/_next` sont exclus. Aucune route
n'est interceptée. Le run s'exécute avec :

```bash
node scripts/run-coach-client-e2e.mjs e2e/coach-dashboard-initial-requests.spec.ts
```

## Baseline enregistrée avant optimisation

La partie HTTP produit 31/31/31 requêtes. L'ouverture WebSocket, observée
séparément et laissée strictement inchangée par la tranche, varie de deux à
trois connexions selon la reconnexion locale. Le total complet est donc
**33/33/34** :

| Domaine | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|
| Auth | 5 | 5 | 5 |
| PostgREST | 22 | 22 | 22 |
| Realtime | 2 | 2 | 3 |
| routes Next internes | 3 | 3 | 3 |
| autre local | 1 | 1 | 1 |
| **Total** | **33** | **33** | **34** |

Les endpoints PostgREST observés étaient `active_related_profiles` (2),
`coach_appointments` (1), `coach_clients` (4), `completed_sessions` (2),
`messages` (4), `profiles` (5), `workout_sessions` (2),
`exercise_feedback` (2, requêtes HEAD). Les routes Next étaient la
synchronisation de locale et deux lectures de feedback existantes. La
navigation `/coach` constitue « autre local ».

Les données indispensables à Home sont le profil coach, les relations actives
et projections clients, le compteur non lu, le planning de la semaine utilisé
pour le jour courant, les revenus, les séances récentes et le feedback en
attente. La liste détaillée du dernier message de chaque contact appartient à
la section Messages. La quatrième lecture `coach_clients` recalculait un
compteur déjà déductible des relations actives. Les paires restantes étaient
des démarrages identiques provoqués par la vérification Strict Mode du
dashboard.

## Optimisations appliquées

- le chargement initial est désormais identifié par le coach actif et ne peut
  être lancé deux fois; les résultats portant une génération obsolète sont
  ignorés;
- `activeSubscribers` est dérivé de la liste de relations actives déjà
  autorisée, sans seconde lecture;
- le compteur non lu reste eager, ainsi que son channel Realtime et son
  polling; l'historique des derniers messages est chargé à la première
  activation de Messages;
- la frontière différée expose `idle`, `loading`, `success`, `empty` et
  `error`, coalesce les ouvertures concurrentes, mémorise un succès, autorise
  un retry explicite, invalide au changement de coach et neutralise une réponse
  obsolète;
- la navigation entre sections ne recharge plus le calendrier courant. Un
  changement de semaine ou une mutation calendrier conserve son refresh
  explicite.

Les vues desktop et mobile partagent le même état différé. Elles affichent un
fallback puis une erreur réessayable au lieu d'un écran vide silencieux.

## Résultat final

Les trois runs finaux produisent **18/18/19** requêtes :

| Domaine | Run 1 | Run 2 | Run 3 | Écart vs baseline |
|---|---:|---:|---:|---:|
| Auth | 2 | 2 | 2 | -3 |
| PostgREST | 10 | 10 | 10 | -12 |
| Realtime | 2 | 2 | 3 | 0 |
| routes Next internes | 3 | 3 | 3 | 0 |
| autre local | 1 | 1 | 1 | 0 |
| **Total** | **18** | **18** | **19** | **-15** |

La réduction est de 45,455 %, 45,455 % et 44,118 %; même le résultat
conservateur dépasse le seuil de 20 %. Le test conserve la baseline minimale
de 33 et échoue au-delà de 26 requêtes. Le total
PostgREST final est constitué d'une lecture de chaque domaine nécessaire au
Home : `active_related_profiles`, `coach_appointments`, `coach_clients`,
`completed_sessions`, `messages` (non-lus seulement), `workout_sessions`,
`exercise_feedback`, plus les trois lectures `profiles` issues des frontières
d'authentification/page existantes.

## Limites

Le Home conserve volontairement le calcul séquentiel legacy
`workout_sessions` et le résumé calendrier complet de la semaine, car leurs
données sont visibles immédiatement. Les deux lectures Next de feedback
échouent dans la fixture locale avec une erreur expurgée préexistante; elles
restent comptées et ne sont pas masquées. Cette tranche ne change ni formule,
ni autorité, ni policy RLS, ni abonnement Realtime.
