# Garde des constructions de clients Supabase

> Contrat RC1 du 24 juillet 2026. Cette garde fige la dette existante sans la
> déclarer canonique et interdit toute construction directe supplémentaire.

## Frontières autorisées

| Contexte | Factory canonique | Construction SDK autorisée |
|---|---|---|
| Navigateur | `getSupabaseBrowserClient()` ou `createSupabaseBrowserClient()` | `lib/supabase/browser.ts` |
| Serveur avec session/RLS | `createSupabaseServerClient()` | `lib/supabase/server.ts` |
| Administration/service-role | `createSupabaseAdminClient()` après autorisation | `lib/supabase/admin.ts` |
| Middleware | frontière de rafraîchissement dans `proxy.ts` | `proxy.ts` |

Ces quatre occurrences sont les seules factories runtime autorisées. Un
repository ou service reçoit un `SupabaseClient<Database>` injecté et ne crée
jamais son propre client. Un import `type` depuis `@supabase/supabase-js` est
autorisé.

Les tests utilisent `tests/fixtures/supabase.ts`. Les scripts locaux possèdent
leurs contrats propres et restent hors du périmètre runtime `app/`/`lib/`;
leur présence n'autorise aucune construction applicative. Aucun secret ou
service distant n'est lu par la garde.

## Inventaire figé

Le scan trouve **57 constructions runtime** :

- 4 canoniques : navigateur 1, serveur 1, administration 1, middleware 1 ;
- 53 dettes legacy : 19 `createBrowserClient`, 19 `createServerClient` et
  15 `createClient`.

La liste exacte et normative est
[`construction-baseline.ts`](../lib/supabase/construction-baseline.ts). Chaque
entrée contient le fichier, la ligne, la colonne et le constructeur. Elle ne
contient ni glob, ni dossier, ni motif large. Les 53 entrées legacy couvrent
exactement 30 constructions routes/auth, 19 composants/hooks et 4 modules
`lib/`. Cette liste est une dette, pas une permission pour recopier le code.

## Fonctionnement fail-closed

[`construction-guard.ts`](../lib/supabase/construction-guard.ts) analyse l'AST
TypeScript/JavaScript. Il reconnaît les imports nommés, renommés, namespace,
`require`, imports dynamiques, appels qualifiés et `new SupabaseClient`.
[`check-supabase-client-constructions.ts`](../scripts/check-supabase-client-constructions.ts)
parcourt intégralement `app/`, `lib/` et `proxy.ts`.

La commande échoue si une occurrence nouvelle apparaît, si une occurrence
autorisée est déplacée ou multipliée, si une entrée devient obsolète, ou si un
constructeur SDK runtime est importé sans occurrence suivie. Elle ne consulte
ni Git, ni diff, ni staging :

```bash
npm run supabase:factories:check
```

`npm test` exécute aussi les tests de la garde ; la même commande est donc
utilisable en CI.

## Réduire la dette

Pour migrer une entrée :

1. caractériser le contrat et l'autorité du consommateur ;
2. remplacer la construction par la factory appropriée ou injecter le client ;
3. exécuter les tests métier/RLS concernés ;
4. supprimer l'entrée exacte de `LEGACY_SUPABASE_CONSTRUCTIONS`.

Oublier l'étape 4 fait échouer la garde avec une entrée `missing`. Ajouter une
entrée pour contourner un échec exige une décision architecturale documentée ;
la règle normale est de migrer le nouveau code vers les factories.
