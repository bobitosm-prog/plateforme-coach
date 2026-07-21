# Politique commune de résilience IA

> Contrat défini le 20 juillet 2026. Aucun des 15 flux IA runtime n'utilise
> encore cette politique; leurs timeouts, retries et erreurs restent inchangés.

## Constat avant centralisation

L'[inventaire IA](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md) montre des mappings
429/5xx et des erreurs différents selon les routes. Aucun appel Anthropic
serveur ne possède un timeout ou retry commun. L'adaptateur Anthropic sait
classifier annulation et timeout injecté sans créer lui-même d'échéance. L'analyse
corporelle est le seul flux avec un retry observé, effectué côté consommateur
sur 429. Les SSE MoovX ne rejouent pas le transport fournisseur.

Le mock Anthropic partagé et le faux serveur Athena savent produire 429 et
500, mais ne définissent aucune politique. Ils restent inchangés.

## Architecture

La résilience étend [`lib/ai/provider`](../lib/ai/provider/) sans ajouter de
retry à `AiProvider`. Deux niveaux restent séparés :

1. le provider exécute exactement une tentative et retourne `AiResult<T>` ;
2. `executeAiWithResilience()` orchestre explicitement zéro ou plusieurs
   retries selon une politique et une déclaration de sécurité.

Le module n'importe ni fournisseur, transport, framework, base, navigateur ou
code applicatif. Il ne journalise et ne persiste rien.

## API publique

```ts
interface AiRetryPolicy {
  maxAttempts: number
  attemptTimeoutMs: number
  globalBudgetMs: number
  baseDelayMs: number
  maxDelayMs: number
  maxRetryAfterMs: number
  allowQuotaRetry: boolean
}

interface AiOperationSafety {
  kind: 'text' | 'json' | 'tool' | 'stream'
  idempotent: boolean
  idempotencyKey?: string
}

function executeAiWithResilience<T>(
  options: AiResilientOperationOptions<T>,
): Promise<AiOperationResult<T>>
```

Exports purs associés :

- `validateAiRetryPolicy()` ;
- `parseAiRetryAfter()` ;
- `calculateAiBackoff()` ;
- `decideAiRetry()` ;
- `waitForAiDelay()` ;
- `createAiCancellationController()` ;
- types `AiRetryDecision`, `AiAttemptContext`, `AiAttemptOutcome<T>`,
  `AiAttemptMetadata` et `AiOperationResult<T>`.

`runAiOperation()` conserve son contrat existant. L'option additive
`onTimeout` permet à l'orchestrateur d'annuler le transport de la tentative
sans introduire de dépendance réseau.

## Validation de la politique

| Paramètre | Règle |
|---|---|
| `maxAttempts` | entier de 1 à 10; `1` signifie zéro retry |
| `attemptTimeoutMs` | 1 à 900 000 ms |
| `globalBudgetMs` | 1 à 900 000 ms et supérieur ou égal au timeout d'une tentative |
| `baseDelayMs` | 0 à 900 000 ms |
| `maxDelayMs` | 0 à 900 000 ms et supérieur ou égal au délai de base |
| `maxRetryAfterMs` | 1 à 900 000 ms |

Le budget global, le délai par tentative et le nombre maximal de tentatives
sont évalués séparément. Une politique invalide échoue avant toute tentative
avec un résultat `unexpected_error` expurgé et `completion: invalid_policy`.

## Matrice exacte des retries

Les restrictions de flux, d'idempotence et de nombre de tentatives sont
évaluées avant la classe d'erreur.

| Erreur | Retry possible | Conditions supplémentaires |
|---|---|---|
| `provider_refused` | jamais | — |
| `invalid_output` | jamais | — |
| `unexpected_error` | jamais | — |
| `cancelled` | jamais | — |
| `quota_exceeded` | oui | `retryable`, politique autorisant le quota, `Retry-After` valide et borné |
| `timeout` | oui | `retryable` et opération idempotente |
| `network_error` | oui | `retryable` et opération idempotente |

Un résultat marqué `retryable: false` n'est jamais rejoué, même si son code
est normalement éligible.

Règles transversales :

- aucune opération non idempotente n'est retentée ;
- une opération JSON ou outil exige en plus une clé d'idempotence explicite ;
- un stream ayant émis un delta n'est jamais retenté ;
- la dernière tentative n'est jamais suivie d'un retry ;
- un délai qui consommerait le budget restant arrête l'opération ;
- aucun modèle différent n'est accepté entre deux tentatives.

## Retry-After

`parseAiRetryAfter(value, nowMs, maxDelayMs)` accepte :

- un entier strictement positif exprimé en secondes ;
- une date HTTP IMF-fixdate, par exemple
  `Mon, 20 Jul 2026 10:00:04 GMT`.

L'horloge est injectée. Valeur vide, négative, décimale, non finie, date ISO
non HTTP, date expirée, zéro ou délai supérieur au plafond sont refusés. Un
429 sans valeur valide reste final; aucun backoff local ne lui est substitué.

## Backoff et jitter

Les erreurs réseau et timeout utilisent un backoff exponentiel : délai de base
multiplié par `2^(tentative - 1)`, puis plafonné. `AiJitter.apply()` est injecté
et reçoit le délai borné et le numéro de tentative. Une valeur de jitter
négative ou non finie est ignorée; une valeur excessive est plafonnée.

La politique ne fournit aucun jitter aléatoire par défaut. L'appelant doit
choisir explicitement son port, ce qui garantit des tests déterministes et
évite un comportement caché.

## Tentatives et métadonnées

Chaque tentative expose uniquement des primitives techniques :

- numéro, correlation ID et modèle demandé ;
- modèle réellement observé lorsqu'il existe ;
- début, fin, durée et timeout en millisecondes ;
- code de résultat ;
- délai décidé avant la tentative suivante.

Le correlation ID et le modèle demandé sont normalisés une fois puis restent
stables. Si le modèle demandé rapporté par le provider ou le modèle réellement
utilisé change entre deux tentatives, l'orchestrateur retourne
`completion: model_changed` et une erreur expurgée.

`AiOperationResult<T>.completion` vaut `success`, `non_retryable`,
`max_attempts`, `budget_exhausted`, `cancelled`, `model_changed` ou
`invalid_policy`.

## Annulation et nettoyage

L'horloge, le scheduler, le jitter et le signal d'annulation sont injectés.
L'annulation est vérifiée avant la première tentative, pendant une tentative et
pendant le backoff.

Chaque timeout annule le signal propre à la tentative afin que le futur
transport puisse libérer sa ressource. Les timers et listeners sont nettoyés à
la première terminaison; les annulations répétées sont idempotentes. Une
Promise fournisseur tardive ne peut plus modifier le résultat.

Le noyau ne peut pas interrompre physiquement un transport qui ignore le
signal. Cette responsabilité restera obligatoire dans l'adaptateur fournisseur
commun.

## Confidentialité et erreurs finales

L'orchestrateur réutilise les sept codes `AiErrorCode`. Une exception ou valeur
inconnue devient `unexpected_error`; elle n'est ni retentée ni incluse dans le
résultat. Les tentatives ne contiennent jamais prompt, réponse, payload, image,
e-mail, token, secret, stack ou message fournisseur.

Les résultats d'échec ne comportent que code, booléen retryable, identifiants
techniques bornés et métadonnées primitives. Il n'existe aucun logger dans le
noyau.

## Tests contractuels

Les tests couvrent : zéro retry, succès immédiat, timeout puis succès, réseau
jusqu'au dernier essai, erreurs non retentables, opérations non idempotentes,
outil sans clé, stream partiel, les deux formes Retry-After, valeurs invalides,
budget, nombre d'essais, backoff plafonné, jitter, annulation aux trois moments,
stabilité du correlation ID, changement de modèle, expurgation et nettoyage.

Les gardes statiques interdisent imports fournisseur/framework/base/app,
transport réseau, API navigateur, secret, réponse brute et fallback de modèle.

## Limites et migration future

- Aucun flux runtime n'est migré et aucune politique par fonctionnalité n'est
  encore choisie.
- Aucun adaptateur Anthropic commun n'existe.
- Aucune clé d'idempotence IA n'est créée par le noyau.
- Le registre des modèles et coûts reste la prochaine étape de la roadmap.
- Les golden fixtures, schémas métier et observabilité d'usage restent à venir.

## Références

- [Interface commune du provider](AI_PROVIDER_INTERFACE.md)
- [Inventaire des prompts, modèles et sorties](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Mocks fournisseurs](TEST_PROVIDER_MOCKS.md)
- [Harnais E2E Athena](E2E_CHAT_HARNESS.md)
