# Migration de huit routes API simples

> Tranche Phase 2 réalisée le 17 juillet 2026. Le périmètre est fermé à exactement huit routes. Stripe, invitations, push, chat Athena et les autres routes complexes restent inchangés.

Ces huit frontières appliquent désormais le contrat de [correlation ID et logs structurés](API_OBSERVABILITY.md), sans modifier leurs corps ou statuts legacy.

## Contrat d'architecture

Chaque route migrée suit désormais la séparation suivante :

- `route.ts` : lecture des éléments HTTP, appel du service et adaptation de la réponse historique ;
- `schema.ts` : validation Zod colocée lorsque la requête porte une entrée JSON ;
- `service.ts` : authentification, règles métier, accès repository/Supabase et résultat typé testable ;
- tests : caractérisation des statuts/formes existants, validation des schémas, autorité serveur et inventaire statique fermé.

Les services utilisent exclusivement des codes présents dans la [taxonomie d'erreurs](API_ERROR_TAXONOMY.md). Les routes gardent cependant les corps historiques, car leurs consommateurs lisent directement `remaining`, `reports`, `success`, `diagnostic_id` ou un corps vide. Les envelopper immédiatement dans `ApiResponse` constituerait une rupture. Elles sont donc des adaptateurs de coexistence documentés vers le [contrat de réponse commun](API_RESPONSE_CONTRACT.md). Une future bascule d'enveloppe nécessitera une version ou la migration préalable des consommateurs.

Les schémas utilisent le [helper de validation partagé](API_VALIDATION.md) avec `requireJsonContentType: false` afin de préserver les appels historiques qui n'envoient pas toujours `Content-Type`. Les erreurs de validation sont remappées vers les corps legacy contrôlés.

## Inventaire fermé

| # | Route | Entrée | Service | Réponse et statuts préservés |
|---:|---|---|---|---|
| 1 | `GET /api/ai-quota` | IP serveur | `getAiQuota` | quota à plat `200`; `{ok:false}` en `401`, `429`, `500` |
| 2 | `POST /api/user/sync-locale` | session, aucun body | `readSessionLocale` | `{success,locale}`; `401`; panne historique neutralisée en `200` |
| 3 | `POST /api/user/locale` | `updateLocaleSchema` | `updateSessionLocale` | `{success,locale}`; erreurs texte `400`, `401`, `500`; cookie inchangé |
| 4 | `GET /api/feedback/mine` | session | `readMyFeedback` | `{reports,count,unreadCount}`; `401`, `500` |
| 5 | `POST /api/feedback/mark-all-read` | session, aucun body | `markMyFeedbackRead` | `{success,markedCount}`; `401`, `500` |
| 6 | `POST /api/vitals` | `webVitalSchema` | `recordWebVital` | corps vide `204`; corps vide `400` |
| 7 | `POST /api/log-error` | `clientLogSchema` | `persistClientLog` | `{ok:true}`; `{ok:false}` en `400`, `429`, `500` |
| 8 | `POST /api/weekly-diagnostic` | session et IP serveur | `createWeeklyDiagnostic` | diagnostic à plat; déjà-existant; `401`, deux variantes `429`, `500` |

[`tests/unit/simple-api-route-inventory.test.ts`](../tests/unit/simple-api-route-inventory.test.ts) constitue la liste exécutable. Il vérifie exactement huit chemins uniques, un service colocalisé, seulement trois schémas nécessaires et l'absence des frontières exclues.

## Garanties conservées

### Identité et autorisation

- L'identité vient de `createIdentityRepository(...).getCurrent()` dans les sept services authentifiés ou à authentification facultative.
- Aucun identifiant transmis dans le body ne devient autorité. En particulier, `log-error` ignore toujours `user_id` et `user_email` du navigateur.
- `feedback/mine` filtre sur l'utilisateur de session.
- `feedback/mark-all-read` filtre sur l'utilisateur de session, `read_by_user = false` et une réponse admin non nulle.
- `weekly-diagnostic` applique quota et génération à l'identité de session.
- Aucune factory admin et aucune clé service-role ne sont utilisées par ces huit routes.

### Validation et données

- La locale accepte uniquement `fr`, `en` ou `de`; les clés legacy supplémentaires restent tolérées.
- Web Vitals exige un nom borné et une valeur numérique finie; le timestamp reste créé côté serveur.
- Le journal client exige un message, borne les chaînes dans le service et choisit le niveau dans une liste contrôlée.
- Le rate limiting utilise l'IP dérivée des headers serveur, jamais une valeur du body.
- Pour `log-error`, le rate limit reste exécuté avant le parsing. Un JSON vide ou malformé conserve le `500` historique sur `log-error` et `user/locale`; les valeurs JSON invalides restent en `400`.
- Les erreurs internes ne sont pas ajoutées aux nouveaux contrats publics. Les deux routes feedback conservent temporairement le message PostgreSQL historique en `500`; cette dette sera traitée lors de la bascule complète vers `ApiFailure`.

### Compatibilité Supabase

Les routes feedback utilisent encore `createSupabaseRouteClient`, wrapper de compatibilité session soumis à RLS, car le schéma généré canonique ne contient pas encore `admin_reply`, `read_by_user`, `replied_at` et `replied_by` pourtant consommés par l'application. Aucun type Supabase n'est modifié dans cette tranche. Cette divergence reste documentée et ne justifie pas un client admin.

## Tests

- [`simple-api-route-contracts.test.ts`](../tests/unit/simple-api-route-contracts.test.ts) couvre les schémas, les réponses feedback, l'isolation session, Web Vitals et le diagnostic hebdomadaire.
- [`supabase-access-migration-routes.test.ts`](../tests/unit/supabase-access-migration-routes.test.ts) continue de couvrir quota IA, locales et journal client, y compris l'ordre rate-limit/parsing et les JSON malformés.
- [`simple-api-route-inventory.test.ts`](../tests/unit/simple-api-route-inventory.test.ts) ferme le périmètre à huit routes et vérifie les frontières structurelles.

Commande ciblée :

```bash
npx vitest run \
  tests/unit/supabase-access-migration-routes.test.ts \
  tests/unit/simple-api-route-contracts.test.ts \
  tests/unit/simple-api-route-inventory.test.ts
```

## Dette restante

- Les consommateurs utilisent encore les réponses legacy non enveloppées.
- Les erreurs feedback `500` exposent encore le message de persistance historique.
- Le schéma Supabase généré diverge des colonnes feedback réellement attendues.
- Les routes ne possèdent pas encore toutes un correlation ID ni un journal structuré commun.
- Les services utilisent les factories/repositories existants mais des repositories feedback et diagnostic dédiés n'existent pas encore.
- L'extraction du diagnostic hebdomadaire supprime un constructeur Supabase legacy supplémentaire : le compteur courant passe de 55 à 54 dans 47 fichiers.
