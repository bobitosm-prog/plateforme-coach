# Factories des clients Supabase

Les trois frontières Supabase sont centralisées sous `lib/supabase/` et utilisent le schéma `Database` généré décrit dans [`SUPABASE_TYPES.md`](SUPABASE_TYPES.md). Elles ne constituent aucune autorisation métier et ne remplacent ni RLS ni `auth.getUser()`.

## Baseline au 16 juillet 2026

L'audit de `app`, `lib`, `tests` et `scripts` compte 76 créations dans 76 fichiers : 25 `createBrowserClient`, 26 `createServerClient` et 25 `createClient`. L'application contient 23 fichiers créant directement un client navigateur, 25 utilisant directement un client session serveur et 21 fichiers de routes/lib référençant la service-role.

Les incohérences observées sont : clients souvent non typés, lecture d'environnement répétée, conventions cookies recopiées, service-role construite dans plusieurs routes/crons, clients navigateur tantôt globaux tantôt recréés, et mélange fréquent entre client session et client privilégié.

Cette tranche ne migre aucun de ces usages. Les exports historiques `supabase`, `createSupabaseRouteClient` et `supabaseAdmin` restent compatibles pendant la transition.

## Quel client utiliser ?

| Contexte | API | Identité/RLS | Singleton |
|---|---|---|---|
| Composant `use client` | `getSupabaseBrowserClient()` | session navigateur, RLS | oui, par runtime navigateur |
| Isolation navigateur explicite | `createSupabaseBrowserClient()` | session navigateur, RLS | non |
| Route, Server Action, Server Component | `createSupabaseServerClient()` | cookies de la requête, RLS | jamais |
| Webhook, cron, opération privilégiée | `createSupabaseAdminClient()` | service-role, bypass RLS | non; autorisation préalable |

## Browser

[`lib/supabase/browser.ts`](../lib/supabase/browser.ts) lit seulement les URL et clé anonyme publiques. Il ne dépend ni de `server-only`, ni de `next/headers`, ni du module admin. Une configuration absente produit une erreur expurgée.

```ts
'use client'
const supabase = getSupabaseBrowserClient()
```

Le singleton évite plusieurs gestionnaires de session dans le même runtime. La factory directe reste disponible pour une isolation volontaire.

## Server lié à la session

[`lib/supabase/server.ts`](../lib/supabase/server.ts) est `server-only`, crée une instance typée par appel et câble `getAll`/`setAll` sur le cookie store courant.

```ts
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
```

Une écriture de cookie peut être refusée dans un Server Component; `setAll` l'ignore alors et une réponse mutable ou le middleware doit assurer le rafraîchissement. Une opération sensible utilise toujours `auth.getUser()`, jamais une identité fournie par le navigateur.

## Admin/service-role

[`lib/supabase/admin.ts`](../lib/supabase/admin.ts) et [`lib/supabase/env.ts`](../lib/supabase/env.ts) sont `server-only`. La factory ne prend aucun argument, ne lit aucun cookie et désactive persistance, auto-refresh et détection de session dans l'URL.

```ts
// Après authentification et autorisation métier.
const admin = createSupabaseAdminClient()
```

Posséder la service-role n'est jamais une preuve d'autorisation. La route doit d'abord déterminer l'identité ou vérifier un contrat serveur signé, puis vérifier rôle, relation ou administration. La factory n'accepte ni URL, ni clé, ni identité et ses erreurs ne contiennent aucune valeur d'environnement.

## Types, imports et tests

- Les trois nouvelles factories retournent `SupabaseClient<Database>`.
- Les alias de clients ne dupliquent pas le schéma généré.
- Le graphe browser ne contient aucune variable privée; admin et env commencent par `import 'server-only'`.
- Les tests mockent les constructeurs SDK : aucun réseau.
- Les gardes localhost restent spécifiques aux fixtures/scripts, pas à la production.
- Les exports legacy gardent temporairement leur surface large pour ne pas propager les divergences de schéma connues dans les routes avant leur migration.

## Migration future

Les créations existantes seront migrées par tranches : caractérisation, remplacement par la factory appropriée, suppression de la lecture d'environnement locale, typecheck tables/vues/RPC, puis tests RLS/E2E. Les dix accès représentatifs et les repositories sont des tâches distinctes. Un client session ne devient jamais admin par migration mécanique.

La stratégie locale est décrite dans [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md). Les frontières de données injectées sont documentées dans [`SUPABASE_REPOSITORIES.md`](SUPABASE_REPOSITORIES.md).
