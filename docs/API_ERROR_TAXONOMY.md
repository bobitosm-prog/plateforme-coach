# Taxonomie des erreurs API

Cette taxonomie complète le [contrat commun de réponse](API_RESPONSE_CONTRACT.md). Elle définit les codes cibles sans migrer de route, modifier un statut existant ou créer le futur helper Zod → HTTP.

## Audit au 15 juillet 2026

Les 52 fichiers de route contiennent 236 statuts littéraux : `200` (3), `201` (1), `204` (1), `400` (50), `401` (39), `403` (18), `404` (12), `409` (3), `410` (1), `413` (1), `429` (15), `500` (84), `502` (2) et `503` (7). Les journaux structurés emploient déjà 18 raisons distinctes.

L'audit révèle notamment :

- `Unauthorized` et `Non autorisé` désignent le même manque d'authentification;
- `Forbidden`, `ROLE_FORBIDDEN`, `RELATION_FORBIDDEN` et `IDENTITY_MISMATCH` recouvrent plusieurs autorités;
- certaines routes renvoient `error.message`, une erreur SQL ou un détail Anthropic brut;
- des statuts fournisseurs sont parfois recopiés directement, y compris comme `400` ou `500`;
- l'invitation invalide utilise volontairement `404` pour éviter l'énumération;
- le webhook distingue replay terminé (`200`), traitement concurrent (`409`) et échec retentable (`503`);
- rate limits et quotas partagent `429`, mais pas la même condition de reprise.

## Registre canonique

Le registre typé et exhaustif se trouve dans [`lib/api/errors.ts`](../lib/api/errors.ts). Il contient 27 codes.

| Code | Catégorie | HTTP | Retry | Log | Details | Anti-énumération | Portée |
|---|---|---:|---|---|---|---|---|
| `VALIDATION_ERROR` | validation | 400 | jamais | aucun | validation publique | non | commun |
| `AUTH_REQUIRED` | authentification | 401 | jamais | warning | interdit | non | commun |
| `TOKEN_INVALID` | authentification | 401 | jamais | warning | interdit | non | commun |
| `ROLE_FORBIDDEN` | autorisation | 403 | jamais | warning | interdit | non | commun |
| `RELATION_FORBIDDEN` | autorisation | 403 | jamais | warning | interdit | non | commun |
| `RESOURCE_NOT_FOUND` | absence | 404 | jamais | aucun | interdit | non | commun |
| `RESOURCE_GONE` | absence | 410 | jamais | aucun | interdit | non | commun |
| `CONFLICT` | conflit | 409 | jamais | info | interdit | non | commun |
| `INVALID_STATE` | conflit | 409 | jamais | info | interdit | non | commun |
| `RATE_LIMITED` | limite | 429 | client | info | interdit | non | commun |
| `QUOTA_EXCEEDED` | limite | 429 | client | info | interdit | non | commun/IA |
| `UPSTREAM_REJECTED` | fournisseur | 502 | jamais | error | interdit | non | commun |
| `UPSTREAM_UNAVAILABLE` | indisponibilité | 503 | client | error | interdit | non | commun |
| `PERSISTENCE_FAILED` | persistance | 500 | serveur | error | interdit | non | commun |
| `INTERNAL_ERROR` | interne | 500 | jamais | error | interdit | non | commun |
| `INVITATION_INVALID` | absence | 404 | jamais | warning | interdit | oui | invitation |
| `INVITATION_TERMINAL` | absence | 410 | jamais | info | interdit | oui | invitation |
| `INVITATION_DELIVERY_FAILED` | fournisseur | 502 | serveur | error | interdit | non | invitation |
| `STRIPE_IDENTITY_INVALID` | autorisation | 403 | jamais | warning | interdit | non | Stripe |
| `STRIPE_METADATA_INVALID` | validation | 400 | jamais | warning | interdit | non | Stripe |
| `STRIPE_SIGNATURE_INVALID` | authentification | 400 | jamais | warning | interdit | non | Stripe webhook |
| `WEBHOOK_ALREADY_PROCESSED` | conflit/idempotence | 200 | jamais | info | interdit | non | Stripe |
| `WEBHOOK_ALREADY_PROCESSING` | conflit | 409 | serveur | warning | interdit | non | Stripe |
| `WEBHOOK_PROCESSING_FAILED` | persistance | 503 | serveur | error | interdit | non | Stripe |
| `PUSH_DELIVERY_FAILED` | fournisseur | 502 | serveur | error | interdit | non | push |
| `ADMIN_REQUIRED` | autorisation | 403 | jamais | warning | interdit | oui | admin |
| `SERVER_MISCONFIGURED` | interne | 500 | jamais | error | interdit | non | commun/Stripe/push/IA |

Le message public sûr est stocké dans le registre. La cause interne n'appartient jamais au descriptor ni à `ApiFailure`; elle va dans un journal expurgé, associé au `requestId`.

## Règles HTTP

- `400` couvre syntaxe, schéma et métadonnées invalides. MoovX ne choisit pas encore `422`; cette distinction attend un besoin consommateur réel.
- `401` signifie identité absente ou jeton utilisateur invalide. La signature webhook invalide reste temporairement `400`, conformément au contrat Stripe existant.
- `403` signifie identité connue mais autorité insuffisante.
- `404` signifie absence réelle ou réponse uniforme anti-énumération. Une invitation invalide, absente ou inaccessible ne révèle jamais son état réel.
- `409` couvre concurrence, idempotence en cours et état incompatible. Un webhook déjà terminé reste un accusé `200`, pas une panne.
- `410` couvre une ressource définitivement terminale ou un ancien endpoint retiré.
- `429` exige `Retry-After` lorsque l'instant de reprise est calculable. Un quota durable doit aussi exposer une information publique minimale de renouvellement, jamais un détail de facturation sensible.
- `502` signifie réponse fournisseur rejetée ou invalide; `503` signifie dépendance temporairement indisponible. `Retry-After` est recommandé pour une indisponibilité bornée. `504` sera introduit seulement lorsqu'un timeout est distingué de l'indisponibilité.
- `500` ne contient aucune cause technique.

## Retentabilité

`client` autorise une nouvelle requête après `Retry-After`, avec le même identifiant d'idempotence si l'opération le prévoit. `server` réserve la reprise à un worker, webhook ou opérateur qui maîtrise l'idempotence. `never` interdit le retry aveugle : validation, authentification et autorisation exigent une modification d'entrée ou d'autorité.

Stripe : un événement `WEBHOOK_ALREADY_PROCESSED` est acquitté; `WEBHOOK_ALREADY_PROCESSING` peut être rejoué par Stripe; `WEBHOOK_PROCESSING_FAILED` doit conserver le même `event.id` et ne jamais créer une seconde mutation.

## Sécurité et anti-énumération

- Un code ne contient jamais d'identifiant, e-mail ou donnée métier.
- Les messages publics ne contiennent ni stack, SQL, secret, token, cookie, payload ni message fournisseur.
- `details` est interdit pour authentification, autorisation, interne et fournisseur. Seule `VALIDATION_ERROR` peut exposer une structure publique contrôlée (chemin de champ et raison canonique).
- `INVITATION_INVALID` emploie une réponse uniforme `404`. `ADMIN_REQUIRED` peut être mappé vers `404` pour une surface administrative volontairement non découvrable; la route doit documenter ce choix.
- Les événements de sécurité suivent [`lib/security/audit-log.ts`](../lib/security/audit-log.ts) et la [procédure Phase 1](PHASE_1_ROLLBACK.md#58-journaux-structurés-de-sécurité). Le `requestId` relie réponse et journal sans exposer la cause.

## Correspondance legacy

| Legacy | Canonique | Compatibilité |
|---|---|---|
| `IDENTITY_MISMATCH` | `STRIPE_IDENTITY_INVALID` | conserver le reason de log pendant la transition |
| `PROFILE_UNAVAILABLE` | `RESOURCE_NOT_FOUND` | ne pas révéler erreur RLS ou absence réelle |
| `SIGNATURE_REQUIRED`, `SIGNATURE_INVALID` | `STRIPE_SIGNATURE_INVALID` | conserver le statut webhook actuel |
| `PRICE_NOT_CONFIGURED` | `SERVER_MISCONFIGURED` | message public générique |
| `CHECKOUT_FAILED` | `UPSTREAM_REJECTED` | ne pas exposer Stripe |
| `INVITATION_CONSUMPTION_FAILED` | `PERSISTENCE_FAILED` | invitation publique inchangée |
| `WEBHOOK_FINALIZATION_FAILED` | `WEBHOOK_PROCESSING_FAILED` | reprise serveur idempotente |

Les codes déjà utilisés comme raisons de journaux (`AUTH_REQUIRED`, `ROLE_FORBIDDEN`, `RELATION_FORBIDDEN`, `INVITATION_INVALID`, `INVITATION_TERMINAL`, `WEBHOOK_ALREADY_PROCESSED`, `WEBHOOK_ALREADY_PROCESSING`, `SERVER_MISCONFIGURED`) sont conservés lorsqu'ils ont une sémantique consommable. Une raison de log peut rester plus précise qu'un code public pendant une release.

## Migration route par route

1. caractériser statuts, corps, consommateurs et raisons de log existants;
2. choisir le code canonique et documenter toute exception anti-énumération;
3. conserver le corps/code legacy pendant au moins une release via adaptateur ou lecture tolérante;
4. ajouter `ApiFailure` et le même `requestId` en en-tête et métadonnées;
5. migrer les consommateurs et E2E concernés;
6. retirer le legacy dans une tranche ultérieure mesurée.

Exemple cible :

```ts
const descriptor = getApiErrorDescriptor('RELATION_FORBIDDEN')
return apiFailureResponse(request, {
  status: descriptor.status,
  code: 'RELATION_FORBIDDEN',
  message: descriptor.message,
})
```

Le futur helper Zod utilisera `VALIDATION_ERROR`; il n'est pas créé ici. Les contrats spécifiques restent ceux des [invitations](COACH_INVITATION_CONTRACT.md), des [fournisseurs simulés](TEST_PROVIDER_MOCKS.md), du [checkout Stripe](E2E_CHECKOUT_HARNESS.md) et du [push](E2E_PUSH_HARNESS.md).
