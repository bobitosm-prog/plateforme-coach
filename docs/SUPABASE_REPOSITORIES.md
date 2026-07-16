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

## Préparation de `useClientDashboard`

La prochaine tranche remplacera uniquement sa lecture initiale profil afin de distinguer erreur de lecture et absence. Avant bascule, des tests caractériseront profil complété, profil absent, erreur réseau/RLS et onboarding. Les autres accès du hook restent hors périmètre et les dix migrations représentatives demeurent une tâche séparée.

Les tests unitaires mockent le client injecté. Le test SQL local utilise les [personas partagés](TEST_FIXTURES.md), vérifie profil propre, profil absent, isolation RLS, invited et lifetime, puis annule toute la transaction.
