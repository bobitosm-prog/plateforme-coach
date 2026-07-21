# Types Supabase canoniques

Les types de base MoovX sont générés exclusivement depuis le schéma `public` de la stack Supabase locale reconstruite par les migrations versionnées. Le fichier [database.types.ts](../lib/supabase/database.types.ts) est un artefact généré : il ne doit jamais être corrigé ou complété manuellement.

Les frontières qui instancient les clients typés sont documentées dans [`SUPABASE_CLIENT_FACTORIES.md`](SUPABASE_CLIENT_FACTORIES.md).

## Commandes

```bash
npm run supabase:local:reset
npm run supabase:types:generate
npm run supabase:types:check
```

`supabase:types:generate` vérifie d'abord le contrat local et l'ordre réel des migrations, puis exécute la CLI installée dans le dépôt avec `gen types --local --schema public`. La commande refuse les variables de projet distant, les URLs non locales et une stack indisponible ou en retard de migration.

`supabase:types:check` génère le même contrat dans un répertoire temporaire, compare octet par octet avec le fichier versionné et nettoie le temporaire dans un `finally`. Elle échoue avec la commande corrective si une migration a rendu le fichier obsolète.

Après toute migration : reset local, génération, revue du diff généré, tests de contrat puis vérification. `supabase/.temp` n'est ni lu ni utilisé comme source de vérité. Le fichier ne contient aucune URL, clé ou donnée de ligne.

## API TypeScript

Le module manuel [types.ts](../lib/supabase/types.ts) réexporte sans duplication :

- `Database` et `Json`;
- `Tables`, `TablesInsert`, `TablesUpdate` et `Enums`;
- `Views`, `FunctionArgs` et `FunctionReturns`;
- les alias représentatifs `ProfileRow` et `ActiveRelatedProfileRow`.

Exemples :

```ts
import type { FunctionArgs, Tables, TablesInsert, Views } from '@/lib/supabase/types'

type Profile = Tables<'profiles'>
type NewPayment = TablesInsert<'payments'>
type RelatedProfile = Views<'active_related_profiles'>
type InvitationArgs = FunctionArgs<'consume_coach_invitation'>
```

Le fichier généré est exclu d'ESLint car son style appartient à la CLI. Le script, le module d'alias et les consommateurs restent lintés.

## Contrats couverts

Le test `tests/unit/supabase-database-types.test.ts` vérifie les contrats `Row`, `Insert` et `Update` de `profiles`, `coach_clients`, `coach_invitations`, `payments`, `push_subscriptions` et `messages` (dont `image_url` nullable), ainsi que la vue `active_related_profiles`.

La migration d'usage IA ajoute au type généré les métadonnées techniques
bornées de `ai_usage_logs` et les RPC `reserve_ai_usage`,
`finalize_ai_usage` ainsi que leurs variantes serveur. Leurs retours JSON sont
validés par l'adaptateur métier; le type généré ne prétend pas décrire seul les
unions discriminées.

Il vérifie aussi les arguments et retours des RPC :

- `assign_default_coach`;
- `consume_coach_invitation`;
- `claim_stripe_webhook_event`;
- `finalize_stripe_webhook_event`.

Les contrats négatifs TypeScript prouvent que `payments.amount` est obligatoire à l'insertion et que `profiles.subscription_price`, `payments.stripe_checkout_session_id` et l'autorité Stripe dans la vue projetée n'existent pas. Les fixtures Supabase partagées utilisent désormais `SupabaseClient<Database>` et `TablesInsert<'profiles'>`, ce qui démontre l'utilisation réelle sans migrer les dix accès applicatifs réservés à une tâche ultérieure.

## État mesuré avant centralisation

- aucun type `Database` existant;
- 82 créations directes de clients Supabase dans `app`, `lib`, tests, E2E et scripts;
- 590 appels `.from()`/`.rpc()` dans `app` et `lib`;
- 247 déclarations locales `type`/`interface`, dont plusieurs représentations de profils, paiements, relations et séances;
- 886 occurrences de `any`, dont 66 assertions `as any` et au moins 62 lignes mêlant directement accès Supabase et `any`.

Ces nombres constituent un inventaire, pas une autorisation de migration massive dans cette tranche. Les futurs clients typés, factories et repositories devront réduire progressivement ces contournements.

## Divergences code/schéma détectées

Le fichier généré reflète honnêtement les 139 migrations. Les divergences suivantes restent dans le code et ne sont pas ajoutées artificiellement au type.

| Domaine | Colonnes utilisées mais absentes | Producteurs/lecteurs observés | Classement et suite |
|---|---|---|---|
| `payments` | `stripe_checkout_session_id`, `paid_at`, `description` | checkout plateforme, webhook Stripe, historique client, revenus coach et administration | Colonnes réellement nécessaires au comportement actuel ou migration de baseline manquante. Risque élevé : les écritures peuvent échouer sur une reconstruction canonique. À trancher dans le domaine Billing, sans modifier les types. |
| `profiles` | `stripe_onboarding_complete` | checkout, webhook, onboarding coach, dashboard et revenus coach | Autorité active mais absente des migrations; la garde la protège seulement comme clé historique optionnelle. Baseline incomplète ou modèle Connect à revoir avant typage des clients applicatifs. |
| `profiles` | `coach_bio`, `cgu_accepted_at` | onboarding coach, dashboard et profil coach | `coach_bio` est fonctionnellement utilisé; `cgu_accepted_at` n'est aujourd'hui qu'un lecteur. Colonnes nécessaires ou code historique à analyser avant migration. |
| `profiles` | `subscription_price` | routes/admin utilisateurs et dashboard coach | Dette historique déjà identifiée. Aucune migration canonique ne crée la colonne; ne pas la réintroduire sans décision Billing explicite. |

La colonne existante `payments.stripe_id` pourrait représenter une ancienne autorité Stripe, mais aucune substitution n'est faite sans contrat métier. De même, les types ne choisissent pas entre suppression de code mort, ajout de migration ou changement de modèle.

## Limites actuelles

- Les clients partagés `browser/server/admin` ne sont pas encore tous paramétrés par `Database`; cette migration appartient aux futures factories Supabase.
- Les types générés garantissent la forme du schéma, pas les permissions RLS ni la validation des données JSON.
- Les retours JSON de RPC restent `Json`; leurs contrats métier détaillés doivent être validés séparément.
- Le schéma `auth` n'est pas versionné dans cet artefact : seul `public` est volontairement généré.
