# Fixtures de personas MoovX

> Source de vérité : `tests/fixtures/personas.json`. Ces fixtures sont exclusivement synthétiques et locales.

## Contrat des personas

| Persona | Rôle `profiles.role` | Abonnement | Onboarding | Relation par défaut | Capacités attendues | Interdictions explicites |
|---|---|---|---|---|---|---|
| `client` | `client` | `client_monthly` / `active` | terminé | aucune | interface client et fonctionnalités de son offre | aucune capacité coach ou admin; aucune donnée étrangère |
| `coach` | `coach` | `coach_monthly` / `active` | onboarding coach terminé | aucune | interface coach; agir sur un client uniquement avec relation autorisée | aucune autorité admin; aucun client étranger |
| `invited` | `client` | `invited` / `active` | terminé | à créer explicitement | fonctionnalités déléguées au coach selon les gardes métier | IA et flux réservés au client autonome; `invited` n'est jamais un rôle |
| `lifetime` | `client` | `lifetime` / `lifetime` | terminé | aucune | accès client à vie | aucune capacité admin ou coach; `lifetime` n'est jamais un rôle |
| `admin` | `client` | `client_monthly` / `active` | terminé | aucune | admin uniquement si son e-mail est exactement la valeur `ADMIN_EMAIL` du processus de test | le booléen de manifeste et le rôle ne confèrent aucune autorité applicative |
| `secondClient` | `client` | `client_monthly` / `active` | terminé | aucune | vérifier l'isolation entre clients | données du premier client |
| `secondCoach` | `coach` | `coach_monthly` / `active` | onboarding coach terminé | aucune | vérifier l'isolation entre coachs | relations et clients du premier coach |

Les UUID et e-mails du manifeste sont publics, stables et réservés aux tests SQL. Les E2E utilisent `personaForRun`, qui conserve le contrat mais produit un UUID et un suffixe d'e-mail uniques. Aucun identifiant ou e-mail réel n'est accepté.

## Catégories de données

- **Constantes publiques** : personas, UUID SQL, e-mails sous `moovx.example.test`, rôles et abonnements.
- **Secrets locaux éphémères** : mot de passe Auth et clé service-role issus du processus local. Ils sont passés aux helpers, jamais stockés dans le manifeste ni journalisés.
- **Données par scénario** : suffixe d'exécution, identifiants Auth E2E, comptes Stripe synthétiques et attributs propres au scénario.
- **Données SQL persistantes pendant un test** : `test.personas`, comptes `auth.users`, profils et relations créés par `test.seed_personas()`; ils doivent être supprimés par `test.cleanup_personas()`.

## API TypeScript

```ts
import { createRunSuffix, personaForRun } from '../tests/fixtures/personas'
import {
  createLocalAdminClient,
  createLocalPersona,
  upsertCoachClientRelation,
  setPersonaSubscription,
  cleanupLocalPersonas,
} from '../tests/fixtures/supabase'

const admin = createLocalAdminClient({
  url: process.env.API_URL!,
  serviceRoleKey: process.env.SERVICE_ROLE_KEY!,
  mode: 'e2e',
})
const client = personaForRun('client', createRunSuffix())
const coach = personaForRun('coach', createRunSuffix())
const ids: string[] = []

try {
  ids.push(await createLocalPersona(admin, client, ephemeralPassword))
  ids.push(await createLocalPersona(admin, coach, ephemeralPassword))
  await upsertCoachClientRelation(admin, coach.id, client.id, 'active')
  await setPersonaSubscription(admin, client.id, 'invited', 'active')
} finally {
  await cleanupLocalPersonas(admin, ids)
}
```

`createLocalAuthUser` est volontairement non idempotent : une seconde création du même compte échoue explicitement. Les profils, relations et seeds SQL utilisent un upsert idempotent. `createLocalPersona` supprime le compte Auth si la création du profil échoue.

## API PostgreSQL

```sql
\ir test-personas.sql
SELECT test.seed_personas();
SELECT test.set_persona_relation('coach', 'client', 'active');
-- assertions RLS/RPC
SELECT test.set_persona_relation('coach', 'client', 'inactive');
SELECT test.cleanup_personas();
```

Le fichier `tests/integration/test-personas.sql` est généré par :

```bash
node scripts/generate-test-personas-sql.mjs
```

Le test unitaire compare octet par octet la sortie du générateur et le SQL versionné afin d'empêcher deux sources de vérité divergentes.

## Sécurité locale

- `createLocalAdminClient` exige explicitement `mode: 'test'` ou `mode: 'e2e'`.
- Seuls `http(s)://127.0.0.1` et `http(s)://localhost` sont acceptés.
- La clé service-role n'est jamais incluse dans une erreur ou un log.
- Les helpers vivent sous `tests/fixtures` et ne doivent jamais être importés depuis `app`, `lib` ou un autre code de production.
- Le nettoyage supprime d'abord les relations, puis les profils et enfin les comptes Auth, y compris après échec partiel.
- L'administrateur doit être authentifié avec l'e-mail exact configuré; `role`, abonnement lifetime ou marqueur de manifeste ne remplacent pas ce contrat.

## Utilisation démontrée

- **Unitaire** : `tests/unit/stripe-setup-products-authorization.test.ts` utilise les e-mails partagés et `tests/unit/test-personas.test.ts` valide le contrat.
- **Intégration** : `tests/integration/supabase-baseline-assertions.sql` seed les personas, teste les relations active/inactive, rejoue le seed et nettoie.
- **E2E** : `e2e/coach-checkout.spec.ts` crée les sept personas via Auth/PostgREST locaux et réutilise les helpers de relation/nettoyage.
