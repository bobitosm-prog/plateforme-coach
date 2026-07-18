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

Injecter un client admin ne prouve aucune autorisation. L'appelant doit établir l'identité et le droit avant l'appel.

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
