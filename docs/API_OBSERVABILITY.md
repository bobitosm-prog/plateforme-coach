# Correlation IDs et logs structurés API

> Contrat Phase 2 appliqué le 17 juillet 2026 aux huit routes simples inventoriées dans [`API_SIMPLE_ROUTE_MIGRATION.md`](API_SIMPLE_ROUTE_MIGRATION.md). Cette tranche ne modifie aucune autre route.

## Contrat commun

[`createApiRouteObservability`](../lib/api/route-observability.ts) est créé une seule fois au début d'une frontière HTTP avec la requête et un descripteur statique : événement, domaine et opération. Chaque sortie passe ensuite par `observe.complete(response, completion)`.

Le helper garantit :

- réutilisation de `x-request-id` si sa valeur respecte le contrat existant ;
- génération UUID serveur si l'en-tête est absent ou invalide ;
- stabilité de l'identifiant pour toutes les couches utilisant le même objet `Request` ;
- ajout de `x-request-id` à la réponse sans modifier son statut ou son corps ;
- un seul enregistrement structuré au maximum, même si `complete` est appelé plusieurs fois ;
- niveaux `info`, `warning` et `error` dérivés respectivement de `success`/`skipped`, `rejected` et `failed` ;
- raison machine stable en majuscules, issue de la taxonomie lorsque celle-ci s'applique ;
- durée, nombre de champs, noms, chaînes et valeurs numériques bornés.

La stabilisation par requête est implémentée dans [`resolveCorrelationId`](../lib/security/audit-log.ts) avec un `WeakMap<Request, string>`. Cela empêche une validation `ApiResponse` et l'observateur de générer deux UUID différents lorsque l'en-tête entrant est invalide. Le corps `meta.requestId`, l'en-tête et le log restent ainsi cohérents.

## Format du log

```json
{
  "timestamp": "2026-07-17T00:00:00.000Z",
  "level": "warning",
  "event": "LOCALE_UPDATE_REQUEST",
  "domain": "locale",
  "operation": "POST /api/user/locale",
  "outcome": "rejected",
  "reason": "VALIDATION_ERROR",
  "status": 400,
  "request_id": "request_ABC-1234",
  "duration_ms": 2,
  "context": {}
}
```

Le log est sérialisé en un seul JSON. Aucune exception ou stack n'est passée au writer.

## Confidentialité

Les clés de contexte contenant l'un des termes suivants sont supprimées : authorization, body, cookie, e-mail, hash, key, path, payload, prompt, secret, session, signature, stack, subscription, token, URL ou VAPID.

Une valeur texte est aussi supprimée lorsqu'elle ressemble à un e-mail, un Bearer, une URL complète, une clé API ou contient un marqueur password, secret, session, Stripe, Anthropic, token ou VAPID. Les chaînes restantes sont limitées à 64 caractères et à un alphabet contrôlé. Le contexte possède au maximum douze champs; les nombres sont bornés à ±1 milliard. La durée est bornée à 24 heures.

Ne sont jamais journalisés :

- body ou payload brut ;
- cookie, session, authorization ou JWT ;
- adresse e-mail ;
- URL complète ou chemin fourni par le navigateur ;
- prompt ou profil complet ;
- secret Supabase, Stripe, Anthropic ou VAPID ;
- endpoint ou subscription push ;
- stack complète ou message interne arbitraire.

Les opérations présentes dans le descripteur sont des chemins statiques de route, pas des URL de requête.

## Routes instrumentées

| Route | Événement | Domaine | Issues principales |
|---|---|---|---|
| `GET /api/ai-quota` | `AI_QUOTA_REQUEST` | `ai_quota` | success, rejected quota/auth, failed interne |
| `POST /api/user/sync-locale` | `LOCALE_SYNC_REQUEST` | `locale` | success, skipped locale absente, rejected auth, failed interne |
| `POST /api/user/locale` | `LOCALE_UPDATE_REQUEST` | `locale` | success, rejected validation/auth, failed persistance/interne |
| `GET /api/feedback/mine` | `FEEDBACK_READ_REQUEST` | `feedback` | success, rejected auth, failed persistance/interne |
| `POST /api/feedback/mark-all-read` | `FEEDBACK_MARK_READ_REQUEST` | `feedback` | success, rejected auth, failed persistance/interne |
| `POST /api/vitals` | `WEB_VITAL_REQUEST` | `vitals` | success avec nom/valeur bornés, rejected validation |
| `POST /api/log-error` | `CLIENT_LOG_REQUEST` | `client_log` | success, rejected limite/validation, failed parsing/persistance |
| `POST /api/weekly-diagnostic` | `WEEKLY_DIAGNOSTIC_REQUEST` | `weekly_diagnostic` | success, skipped existant, rejected auth/quotas, failed interne |

Les formes de réponses legacy et tous les statuts restent ceux documentés dans [`API_SIMPLE_ROUTE_MIGRATION.md`](API_SIMPLE_ROUTE_MIGRATION.md). Le seul ajout public est l'en-tête `x-request-id`.

## Inventaire avant/après

Avant cette tranche :

- aucune des huit routes ne propageait `x-request-id` ;
- sept appels `console.*` ad hoc existaient dans leurs `route.ts` ;
- un huitième `console.log` existait dans le service Web Vitals ;
- les erreurs n'avaient pas de format, raison ou ID commun.

Après cette tranche :

- huit routes sur huit créent un observateur et terminent toutes leurs réponses avec lui ;
- zéro `console.*` ad hoc dans les huit routes et leurs services ;
- les sorties sont émises uniquement par le writer commun ;
- les routes critiques hors périmètre gardent leur `createSecurityAudit` existant et ne sont pas modifiées.

L'inventaire est bloqué par [`simple-api-observability-inventory.test.ts`](../tests/unit/simple-api-observability-inventory.test.ts).

## Tests ciblés

```bash
npx vitest run \
  tests/unit/api-route-observability.test.ts \
  tests/unit/security-audit-log.test.ts \
  tests/unit/api-response-contract.test.ts \
  tests/unit/simple-api-observability-inventory.test.ts \
  tests/unit/supabase-access-migration-routes.test.ts \
  tests/unit/simple-api-route-contracts.test.ts \
  tests/unit/simple-api-route-inventory.test.ts
```

Les tests prouvent la réutilisation et le remplacement de l'ID, la cohérence corps/header/log, l'expurgation des secrets connus, le bornage, le log unique, les raisons validation/auth et la couverture fermée des huit routes.

## Limites et suite

- Le reste des routes API conserve ses mécanismes historiques; aucune conformité globale n'est revendiquée.
- `createSecurityAudit` reste spécialisé pour les refus de sécurité Stripe, invitations, push et admin.
- Les logs de fournisseurs situés plus profondément dans le générateur de diagnostic ne sont pas migrés par cette tranche de frontière HTTP.
- Le stockage, l'agrégation et les alertes de logs ne sont pas ajoutés ici.
