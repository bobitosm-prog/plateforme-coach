# Interface commune du provider IA

> Contrat défini le 20 juillet 2026. Aucune route IA ne l'utilise encore : il
> s'agit d'une frontière indépendante du fournisseur, prête pour les migrations
> progressives de Phase 7.

## Objectifs

Le module [`lib/ai/provider`](../lib/ai/provider/) formalise les demandes IA,
leurs résultats, la validation structurée, les délais et le cycle de vie d'un
flux. Il ne connaît ni Anthropic, ni HTTP, ni React, Next.js, Supabase ou le
navigateur.

Le contrat vise quatre usages distincts :

- texte libre avec `AiTextRequest` ;
- JSON ou sortie semi-structurée avec `AiJsonRequest<T>` ;
- outil structuré avec `AiToolRequest<T>` ;
- streaming avec `AiProvider.stream()` et `AiStreamEvent<T>`.

Le SSE reste un choix d'adaptateur HTTP situé au-dessus du flux. Le noyau ne
construit donc ni `Response`, ni événement SSE, et ne suppose pas que le
fournisseur possède une API de streaming native.

## API publique exacte

Le point d'import public est `lib/ai/provider/index.ts` :

```ts
interface AiProvider {
  generate(request: AiTextRequest, context: AiRequestContext): Promise<AiResult<string>>
  generate<T>(request: AiJsonRequest<T> | AiToolRequest<T>, context: AiRequestContext): Promise<AiResult<T>>
  stream(request: AiTextRequest, context: AiRequestContext): AsyncIterable<AiStreamEvent<string>>
  stream<T>(request: AiJsonRequest<T> | AiToolRequest<T>, context: AiRequestContext): AsyncIterable<AiStreamEvent<T>>
}
```

Exports complémentaires :

- `AI_PROVIDER_LIMITS`, requêtes, messages, blocs texte/image, outils et
  contexte ;
- `AiResult<T>`, `AiSafeError`, `AiErrorCode`, `AiResultMetadata`,
  `AiStopReason` et `AiTokenUsage` ;
- `validateAiRequest()` et `validateStructuredOutput()` ;
- `normalizeAiProviderError()`, `normalizeMetadata()` et `aiFailure()` ;
- `runAiOperation()` avec scheduler et annulation injectés ;
- `createAiStreamLifecycle()` pour fermer un flux exactement une fois ;
- ports `AiCancellationSignal`, `AiTimeoutScheduler` et `AiClock`.

## Entrées bornées

`validateAiRequest()` applique une validation déterministe avant transport :

| Élément | Borne |
|---|---:|
| Correlation ID | 128 caractères, alphabet technique borné |
| Prompt système | 100 000 caractères |
| Messages | 1 à 100 |
| Bloc texte | 200 000 caractères |
| Image Base64 | 14 000 000 caractères |
| Outils | 1 à 32 pour une demande outil |
| Nom d'outil | 128 caractères |
| Tokens demandés | 1 à 100 000 |
| Timeout | 1 à 300 000 ms |
| Température | 0 à 1 lorsqu'elle est fournie |

Les outils doivent avoir des noms uniques et l'outil forcé doit appartenir à
la liste déclarée. Le noyau accepte les blocs image Base64 JPEG, PNG, WebP et
GIF, mais ne télécharge jamais une URL et ne manipule aucun secret.

Ces bornes protègent la frontière commune; elles ne changent pas les limites
des routes existantes tant que celles-ci ne sont pas migrées.

## Résultats et métadonnées

Un succès contient obligatoirement :

```ts
{
  ok: true
  output: 'text' | 'json' | 'tool'
  value: T
  metadata: {
    correlationId: string
    requestedModel: string
    actualModel: string
    stopReason: 'end_turn' | 'max_tokens' | 'tool_use' | 'refusal' | 'unknown'
    usage?: {
      inputTokens?: number
      outputTokens?: number
      cacheReadTokens?: number
      cacheWriteTokens?: number
    }
  }
}
```

Le modèle demandé et celui réellement utilisé restent séparés. L'interface ne
permet donc pas de masquer un fallback. Les compteurs de tokens absents restent
absents; les valeurs négatives, non entières ou non finies sont éliminées au
lieu d'être transformées en zéro.

## Erreurs expurgées

Un échec ne contient que `code`, `retryable` et les métadonnées techniques
bornées. Les codes sont :

| Code | Signification | Retryable par défaut |
|---|---|---|
| `provider_refused` | refus explicite ou requête non acceptée | non |
| `quota_exceeded` | quota ou rate limit fournisseur | oui |
| `timeout` | échéance locale atteinte | oui |
| `network_error` | transport indisponible ou erreur fournisseur 5xx | oui |
| `invalid_output` | sortie absente, malformée ou rejetée par validation | non |
| `unexpected_error` | panne non classée | non |
| `cancelled` | annulation demandée localement | non |

Il n'existe aucun champ pour un message brut, un prompt, un payload, une
réponse fournisseur, un e-mail, un token, une image ou un secret. Un adaptateur
peut journaliser le code et le correlation ID, jamais l'exception source.

## Validation structurée

`AiJsonRequest<T>` et `AiToolRequest<T>` exigent un
`AiOutputValidator<T>`. Le validateur reçoit `unknown` et retourne uniquement
`{ ok: true, value }` ou `{ ok: false }`. `validateStructuredOutput()` :

- ne dépend d'aucune bibliothèque de schéma ;
- permet d'injecter Zod ultérieurement ;
- convertit toute exception du validateur en refus fail-closed ;
- ne propage ni message, ni valeur brute ;
- ne mute pas l'entrée.

Un adaptateur fournisseur reste responsable d'extraire le texte, le JSON ou
l'input d'outil, puis d'appeler ce validateur avant de construire un succès.

## Timeout et annulation

`runAiOperation()` reçoit explicitement l'opération, le timeout, un scheduler
et un signal d'annulation. Il garantit :

- aucun retry automatique ;
- annulation possible avant ou pendant l'appel ;
- première terminaison gagnante ;
- annulation du timer et désabonnement dans tous les cas ;
- nettoyage idempotent après annulations répétées ;
- rejet de Promise transformé en `unexpected_error` expurgé.

Le port ne peut pas forcer l'arrêt physique d'un transport. L'adaptateur HTTP
ou SDK futur devra relier `AiCancellationSignal` à son mécanisme d'annulation.
Une réponse tardive est ignorée par la frontière, mais la ressource réseau doit
encore être libérée par cet adaptateur.

## Streaming et fermeture

Les événements autorisés sont : `started`, `text_delta`,
`structured_delta`, `usage`, `completed` et `failed`. Un échec terminal indique
si une sortie partielle avait déjà été produite.

`createAiStreamLifecycle()` mémorise cette partialité, refuse tout événement
après le premier terminal et rend l'annulation idempotente. Le consommateur ou
l'adaptateur SSE doit en plus :

1. relier la déconnexion au signal d'annulation ;
2. appeler le nettoyage du transport ;
3. n'émettre qu'une traduction SSE du terminal accepté ;
4. ne jamais convertir une sortie partielle en succès silencieux.

## Compatibilité avec les frontières locales

Le contrat n'impose aucune URL ou SDK. Un futur adaptateur Anthropic pourra
donc recevoir :

- le `fetch` du mock partagé Vitest ;
- l'URL validée par le transport local Athena ;
- le faux serveur `/v1/messages` utilisé par le harnais E2E ;
- le `fetchImpl` déjà injecté par la génération Nutrition.

Cette compatibilité ne signifie pas que ces frontières ont été migrées. Les 15
points d'entrée recensés continuent d'utiliser exactement leur implémentation
historique.

## Garanties d'architecture

Les gardes statiques vérifient l'absence d'import React, Next.js, Anthropic,
Supabase et `app/`, ainsi que l'absence de `fetch`, API navigateur,
`createClient`, `service_role`, message d'erreur brut ou boucle de retry.

Le noyau ne choisit pas le modèle, ne calcule pas les quotas, ne persiste rien,
ne construit pas de prompt et ne journalise rien. Ces responsabilités restent
dans les futurs adaptateurs et services applicatifs.

## Limites et suite

- Aucun adaptateur Anthropic commun n'existe encore.
- Aucun des 15 points d'entrée n'est migré.
- Les timeouts ne seront effectifs sur le réseau qu'après câblage d'un
  transport annulable.
- Les schémas métier Zod et golden fixtures restent à créer.
- Le registre des modèles/coûts, la politique de retry et l'observabilité
  détaillée restent hors de cette tranche.

La prochaine étape de la roadmap est de centraliser timeouts, retries et
erreurs sur cette interface, sans modifier silencieusement les politiques des
flux existants.

## Références

- [Inventaire des prompts, modèles et sorties](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Mocks de fournisseurs](TEST_PROVIDER_MOCKS.md)
- [Harnais E2E Athena](E2E_CHAT_HARNESS.md)
- [Service de génération Nutrition](NUTRITION_MEAL_GENERATION_SERVICE.md)
- [Taxonomie des erreurs API](API_ERROR_TAXONOMY.md)
