# Contrat commun de réponse API

La première tranche de huit routes en coexistence est inventoriée dans [`API_SIMPLE_ROUTE_MIGRATION.md`](API_SIMPLE_ROUTE_MIGRATION.md). Leurs services emploient la taxonomie commune, mais leurs frontières HTTP conservent temporairement les formes legacy requises par les consommateurs.

Le contrat commun de correlation ID et de log de frontière est décrit dans [`API_OBSERVABILITY.md`](API_OBSERVABILITY.md). `resolveCorrelationId` reste stable pour un même objet `Request`, afin que le corps `ApiResponse`, l'en-tête et le log partagent toujours le même identifiant.

Ce document définit le format cible des réponses HTTP JSON de MoovX. Il est additif : aucune route ni aucun consommateur n'est migré dans cette tranche. Chaque migration conservera l'ancien contrat pendant au moins une release, route par route, avec tests du producteur et de ses consommateurs.

## État mesuré au 15 juillet 2026

L'inventaire porte sur les fichiers `app/api/**/route.ts` et sur les appels `fetch` locaux sous `app/`. Les compteurs sont syntaxiques et reproductibles avec `rg`; une construction multilignes reste un seul site.

| Mesure | Valeur |
|---|---:|
| Fichiers de route | 52 |
| Handlers HTTP exportés | 55 |
| Constructions de réponse | 287 |
| Réponses JSON via `NextResponse.json`/`Response.json` | 278 |
| Réponses via `new Response` | 9 |
| Corps littéraux contenant une clé `error` | 202 |
| Corps littéraux contenant une clé `success` | 31 |
| Corps littéraux contenant une clé `ok` | 8 |
| Appels locaux `/api/` recensés | 62 dans 30 fichiers |

Les catégories se chevauchent : un corps peut contenir `success` et `error`, et les corps construits dans une variable ne sont pas attribués à une forme par cette mesure. L'audit manuel confirme les familles suivantes : erreurs `{ error: string }`, `{ error, detail }`, `{ success: false, error }`, accusés `{ ok: true }` ou `{ success: true }`, objets métier nus, tableaux nus, `{ url }`, `{ message }` et réponses de webhook.

Cette diversité oblige aujourd'hui chaque consommateur à connaître la route. Elle rend aussi instables les codes machine, expose parfois un détail fournisseur et ne propage pas systématiquement le correlation ID.

## Contrat canonique

Le module [`lib/api/response.ts`](../lib/api/response.ts) exporte :

```ts
interface ApiSuccess<T, M extends ApiMeta = ApiMeta> {
  ok: true
  data: T
  meta?: M
}

interface ApiFailure<D = unknown> {
  ok: false
  error: { code: string; message: string; details?: D }
  meta: { requestId: string }
}

type ApiResponse<T, D = unknown, M extends ApiMeta = ApiMeta> =
  | ApiSuccess<T, M>
  | ApiFailure<D>
```

`ok` est l'unique discriminant. `error.code` est un identifiant machine stable en majuscules (`AUTH_REQUIRED`, par exemple). `error.message` est contrôlé par l'application et ne doit pas reprendre une exception. Le statut HTTP reste l'autorité : une erreur n'est jamais signalée par un `200` de convenance.

Le `requestId` suit exactement le contrat de [`lib/security/audit-log.ts`](../lib/security/audit-log.ts) : l'en-tête entrant `x-request-id` est accepté s'il respecte le format strict existant, sinon un UUID est généré. Les helpers écrivent la même valeur dans l'en-tête de réponse et les métadonnées du corps. Les journaux structurés et la réponse peuvent ainsi être rapprochés sans donnée personnelle.

## Helpers

- `createApiSuccess(data, meta?)` et `createApiFailure(requestId, error)` construisent les enveloppes pures.
- `apiSuccessResponse(request, data, init?)` produit un JSON avec statut `200` par défaut.
- `apiFailureResponse(request, input)` exige un statut, un code et un message contrôlé.
- `apiNoContentResponse(request, init?)` produit un vrai `204`, sans corps ni `Content-Type`, mais avec `x-request-id`.

Exemple futur :

```ts
return apiFailureResponse(request, {
  status: 403,
  code: 'ROLE_FORBIDDEN',
  message: 'Operation forbidden',
})
```

Les helpers refusent `undefined`, `NaN`, les infinis, `BigInt`, fonctions, symboles, instances non simples, références circulaires et objets `Date`. Une date doit être convertie explicitement en chaîne ISO. Les détails d'erreur sont absents par défaut; s'ils sont nécessaires, ils doivent être JSON, publics et minimaux. Les clés de secret, jeton, cookie, e-mail, signature, autorisation ou payload ainsi que les traces de pile sont refusées. Une exception fournisseur n'est jamais passée comme `details`.

## Sémantique HTTP

- `2xx` : opération réussie; `201` pour une création, `202` pour une acceptation différée et `204` uniquement sans corps.
- `4xx` : requête ou autorité du client; le corps suit `ApiFailure`.
- `5xx` : échec serveur ou fournisseur; message public générique et cause seulement dans un journal expurgé.
- Toute réponse JSON utilise `application/json; charset=utf-8`.
- Un éventuel contrat de pagination sera ajouté dans `meta`, sans changer `data` ni le discriminant.

La taxonomie exhaustive des codes d'erreur est la prochaine tâche de Phase 2. Avant celle-ci, aucun nouveau code ne doit être inventé hors d'une migration de route documentée.

## Exceptions légitimes

Le format enveloppé ne s'applique pas au flux lui-même dans les cas suivants :

- SSE : `generate-custom-program` et `generate-meal-plan` utilisent `text/event-stream`; leurs événements et erreurs terminales nécessitent un contrat de flux dédié.
- collecte sans contenu : `vitals` conserve une réponse vide et doit utiliser la sémantique `204` lorsque la collecte réussit.
- webhook Stripe : la signature porte sur la requête entrante; son accusé JSON pourra être enveloppé, mais la compatibilité Stripe et le replay priment.
- fichiers/binaires et redirections : aucune construction n'est présente dans l'inventaire actuel; si elles apparaissent, leurs octets ou `Location` ne seront pas enveloppés.

Une route qui délègue une frontière externe ne devient pas une exception pour autant : ses erreurs JSON restent publiques et normalisées.

## Migration et compatibilité

Pour chaque route :

1. relever tous les consommateurs et tests;
2. ajouter les tests de l'ancien comportement et du contrat cible;
3. introduire l'enveloppe avec une coexistence explicite (version, adaptateur ou lecture tolérante côté consommateur);
4. migrer les consommateurs mesurés;
5. observer une release complète;
6. supprimer l'ancien format dans une tranche ultérieure documentée.

Il est interdit de migrer en masse les 52 routes. Les flux Stripe, invitation, push, chat et streaming gardent leurs filets E2E. Les réponses contenant aujourd'hui `detail`, une erreur SDK ou `error.message` sont prioritaires, car elles présentent le plus grand risque de fuite.

## Tests requis lors d'une migration

- succès objet, tableau et `null` selon le domaine;
- statut HTTP exact et `Content-Type`;
- code machine et message public pour chaque branche d'erreur;
- `x-request-id` accepté ou généré, identique au corps et au journal;
- absence de secret, jeton, cookie, e-mail, payload, erreur fournisseur et stack;
- consommateur ancien compatible pendant la transition puis consommateur cible;
- E2E concerné pour une interface ou un fournisseur critique.

Les tests du socle se trouvent dans [`tests/unit/api-response-contract.test.ts`](../tests/unit/api-response-contract.test.ts). Ils ne prouvent pas qu'une route est migrée : seule une suite propre à cette route peut l'établir.

## Frontière avec les autres contrats

Ce contrat transporte un résultat; il ne définit ni les règles métier, ni la validation d'entrée, ni l'autorisation. Le futur helper Zod transformera une erreur de validation vers la taxonomie commune, sans exposer l'objet Zod brut. Les rejets critiques continuent d'utiliser les [journaux structurés et le rollback Phase 1](PHASE_1_ROLLBACK.md#58-journaux-structurés-de-sécurité). La stratégie générale de validation reste décrite dans [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md).

La frontière Zod commune est désormais documentée dans [`API_VALIDATION.md`](API_VALIDATION.md). Son adoption reste route par route; ce contrat ne signifie pas que les routes existantes sont déjà migrées.
