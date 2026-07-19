# Repositories Supabase

Les repositories profil, identité et abonnement isolent les projections et résultats de données sans créer leur client. Ils acceptent un `DatabaseClient` injecté depuis les [factories](SUPABASE_CLIENT_FACTORIES.md), respectent la RLS du client reçu et ne dépendent ni de React ni de Next.js.

## Résultat commun

```ts
type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'not_found' }
  | { ok: false; kind: 'failure'; error: RepositoryError }
```

`not_found` signifie qu'une lecture valide n'a trouvé aucune ligne. `failure` conserve seulement une catégorie interne (`auth`, `forbidden`, `conflict`, `unavailable`, `unexpected`) et, si sûr, un code technique borné. Message SQL, requête, payload, e-mail et token sont supprimés. Le mapping vers la [taxonomie HTTP](API_ERROR_TAXONOMY.md) appartiendra au service/handler, jamais au repository.

## Matrice d'usage

| Factory injectée | Repository | Usage |
|---|---|---|
| Browser/session server | identité | utilisateur courant via `auth.getUser()` |
| Browser/session server | profil | profil propre ou projection relationnelle soumise à RLS |
| Browser/session server | abonnement lecture | état du profil visible selon RLS |
| Admin après autorisation serveur | profil/abonnement | webhook, cron ou administration contrôlée |
| Admin | abonnement authority | mutation des quatre champs canoniques uniquement |

## Relations coach/client

Le contrat read-only est documenté dans
[`COACH_CLIENT_RELATION_REPOSITORY.md`](COACH_CLIENT_RELATION_REPOSITORY.md).
Il centralise les relations actives, la détection de conflit et la projection
`active_related_profiles` pour les dashboards. L'identité reste établie par la
session et la RLS ; les identifiants passés servent uniquement à borner la
requête. Invitations, affectation par défaut et déconnexion restent dans leurs
frontières d'autorité existantes.

Injecter un client admin ne prouve aucune autorisation. L'appelant doit établir l'identité et le droit avant l'appel.

## Calendrier Coaching

Le module [`COACHING_CALENDAR_MODULE.md`](COACHING_CALENDAR_MODULE.md) compose
un repository `coach_appointments`, le repository de relations actives, un
service métier et un adaptateur navigateur étroit. Les projections, scopes
coach/client, bornes, tri et erreurs expurgées sont centralisés. Les mutations
création/suppression restent exécutées avec le client de session et exigent un
coach activement lié au client ; aucun client privilégié n'est créé.

`scheduled_sessions` reste un domaine Training séparé. Aucun de ses cinq
consommateurs applicatifs/ports n'a été migré ou modifié par cette extraction.

## Messaging Coaching

L'audit [`COACHING_MESSAGING_REALTIME.md`](COACHING_MESSAGING_REALTIME.md)
documente pourquoi aucun repository `messages` n'est encore branché. Le champ
UI `image_url` est absent du schéma et des types canoniques, et les policies
historiques ne limitent pas les échanges à une relation coach/client active.
Une migration de schéma/RLS explicitement autorisée est donc un préalable à une
projection typée fidèle et à des mutations sûres.

## Profil

`createProfileRepository(client)` expose `findById`, `findCurrent`, `findActiveRelatedById` et `updateSafe`.

- projection profil limitée à identité de profil, rôle/statut, onboarding, locale et timestamps;
- aucune nouvelle méthode n'utilise `select('*')`;
- les lectures croisées passent par `active_related_profiles`, sans les 68 colonnes du profil ni champs Stripe/autorité;
- `SafeProfileUpdate` n'autorise que des champs de présentation et préférences. Rôle, statut, abonnement, essai et références Stripe sont impossibles à typer.

## Identité

`createIdentityRepository(client).getCurrent()` utilise exclusivement `auth.getUser()`. Le résultat distingue `authenticated`, `anonymous` et `failure/auth`. Il retourne seulement `id` et e-mail éventuel. Aucun ID externe n'est accepté comme preuve. Rôle, abonnement et contrat admin `ADMIN_EMAIL` ne sont pas fusionnés dans l'identité.

## Abonnement

`createSubscriptionRepository(client, clock?)` lit seulement `subscription_type`, `subscription_status`, `subscription_end_date` et `trial_ends_at`. L'horloge injectée rend essai actif/expiré déterministe. L'état normalisé distingue `invited`, `lifetime`, `active`, `inactive`; il ne modifie jamais le rôle.

Les mutations sont séparées dans `subscription/authority.ts`, module `server-only`. `createSubscriptionAuthorityRepository` accepte uniquement les quatre champs canoniques et doit recevoir un client privilégié après autorisation. Il n'utilise aucune colonne divergente comme `subscription_price`.

## Chargement de profil dans `useClientDashboard`

La frontière `createSessionProfileLoader` compose désormais les repositories
identité et profil, le cache dashboard et `ProfileLoadCoordinator`. Elle vérifie
l'identité authentifiée avec `auth.getUser()` avant d'accepter le cache ou de
lire le profil. Le hook conserve uniquement la session réactive nécessaire au
rendu et délègue la décision d'existence à cette frontière.

Seul le résultat `not_found`, produit par une lecture valide sans ligne,
autorise la redirection vers `/onboarding-v2`. Une session absente, une erreur
Auth, réseau, RLS ou Supabase produit un état récupérable sans redirection. Le
chargement agrégé historique reste en place : cette tranche ne migre aucune
autre décision liée au profil du dashboard.

Le cycle explicite est `idle → loading → ready | not_found | error`. Une seule lecture est active par utilisateur; les réponses d'une identité précédente ou reçues après démontage sont ignorées. Une nouvelle tentative force l'identité et la lecture serveur sans boucle automatique. Si un profil utilisable a déjà été confirmé, l'échec d'un rafraîchissement ne remplace pas l'écran courant par une erreur.

Le cache dashboard porte `ownerUserId` et le `profileData.id` doit correspondre à l'identité active. Les anciens caches sans propriétaire et les caches croisés sont rejetés. Le cache ne peut jamais provoquer une redirection onboarding.

## Domaine Training

Le contrat initial est documenté dans [`TRAINING_REPOSITORIES.md`](TRAINING_REPOSITORIES.md).
Il couvre programmes, séances, complétions, records et exercices avec des
projections explicites. `useClientDashboard` compose désormais les repositories
programmes et séances par `createTrainingDashboardLoader`; les mutations et les
autres consommateurs Training restent en coexistence legacy.

Les tests unitaires mockent le client injecté. Le test SQL local utilise les [personas partagés](TEST_FIXTURES.md), vérifie profil propre, profil absent, isolation RLS, invited et lifetime, puis annule toute la transaction.

## Nutrition et mesures du dashboard client

`createNutritionMeasurementsLoader` compose quatre readers injectables et
bornés pour le poids, les mensurations, les photos de progression et le dernier
plan alimentaire coach. Les projections sont explicites et conservent les
formes legacy utilisées par `useClientDashboard` : 30 poids ascendants, 10
mesures descendantes, 20 photos descendantes et un plan coach au plus.

L'identifiant fourni au loader doit provenir de la session déjà vérifiée ; il
borne les requêtes mais ne remplace ni l'autorité Auth ni la RLS. Une absence
confirmée produit des listes vides ou un plan `null`, tandis qu'une panne est
retournée sous forme expurgée et récupérable. La requête initiale
`daily_food_logs`, dont le résultat n'était pas consommé, a été retirée ; le
journal quotidien reste chargé et muté par ses consommateurs Nutrition dédiés.

Les écritures de poids, mesures et photos restent dans le hook legacy. Cette
tranche ne crée volontairement pas de repositories de mutation et ne modifie ni
les policies RLS ni les composants Nutrition/Progression.

## Façade du dashboard client

`useClientDashboard` est désormais une façade React de 203 lignes. Il conserve
les états rendus, compose les hooks spécialisés et restitue le contrat public
legacy sans modifier ses consommateurs. La coordination Auth/cache et les
lectures agrégées vivent dans `useClientDashboardData`; les mutations et actions
utilisateur vivent dans `useClientDashboardActions`.

Ces deux hooks internes réutilisent les loaders session/profil, Training et
nutrition/mesures existants. Les projections Supabase restantes sont explicites,
les erreurs exposées restent expurgées et aucun client privilégié n'est créé.
Le cache garde son enveloppe `ownerUserId` et sa vérification croisée avec
`profileData.id`. Ce découpage ne constitue pas encore une migration complète :
diagnostic, coach link, analytics et mutations multi-domaines restent coordonnés
par les hooks internes jusqu'à l'ouverture de leurs domaines respectifs.

## Premiers consommateurs serveur

Les routes `POST /api/user/sync-locale` et `POST /api/user/locale` sont les premiers consommateurs server réels. Elles composent la factory session, le repository identité, puis le repository profil. La lecture retourne une locale valide ou `null` sans confondre absence et panne; l'écriture passe par `updateSafe` et ne peut typer que `preferred_locale`. Les statuts HTTP et cookies historiques restent inchangés. Le lot complet des dix sites est documenté dans [`SUPABASE_ACCESS_MIGRATION.md`](SUPABASE_ACCESS_MIGRATION.md). La fraîcheur et l'invalidation futures de ces lectures sont cadrées séparément par la [stratégie de cache par domaine](CACHE_STRATEGY.md).

Les lectures Nutrition sont regroupées dans
[`NUTRITION_REPOSITORIES.md`](NUTRITION_REPOSITORIES.md). Elles couvrent les
catalogues, aliments personnalisés, plans, affectations coach/client actives,
journaux, recettes et repas sauvegardés. Elles restent read-only et ne sont pas
encore branchées aux composants.

## Messaging humain

Le repository typé `lib/coaching/messaging/repository.ts` centralise les six
accès nécessaires à `public.messages` : conversation bornée, delta polling,
envoi, marquage lu, compteurs non lus et dernier message par contact. Le client
Supabase est injecté, les projections sont explicites et l'auteur est toujours
dérivé de `auth.getUser()`. L'envoi vérifie en plus la paire active via la RPC
SQL sécurisée avant de laisser la RLS faire autorité.

Les trois hooks humains n'accèdent plus directement à la table. Le service
compose persistance et notification non transactionnelle; l'adaptateur realtime
reste séparé du repository et valide chaque payload avant exposition.

## Détail client coach

Les quatre frontières de [`useClientDetail`](CLIENT_DETAIL_DOMAIN_EXTRACTIONS.md)
composent désormais identité, relation active, repositories Training et read
models Progression avant d'exposer le profil tiers. Les formats Nutrition dont
les colonnes runtime divergent des types restent isolés dans leur adaptateur
legacy explicite. Le hook conserve ses mutations non migrées et son contrat UI,
mais ne lit plus directement profil, séances, programmes, mensurations, photos
ou complétions lors du chargement initial.
