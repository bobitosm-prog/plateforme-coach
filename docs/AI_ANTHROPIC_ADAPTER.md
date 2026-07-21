# Adaptateur Anthropic commun

> État vérifié le 21 juillet 2026. Chat Athena, génération de recette et
> suggestion d'exercice utilisent cette frontière; les douze autres points
> d'entrée IA conservent leur transport historique.

## Responsabilité et API

[`lib/ai/providers/anthropic`](../lib/ai/providers/anthropic/) est un adaptateur
server-only injectable de [`AiProvider`](AI_PROVIDER_INTERFACE.md). Son API
publique est :

```ts
createAnthropicProvider({ apiKey, messagesUrl?, fetchImpl? }): AiProvider
promptInvocationToTextRequest(invocation, providerModel): AiTextRequest
promptInvocationToJsonRequest(invocation, providerModel, validate): AiJsonRequest<T>
abortSignalToAiCancellation(signal): AiCancellationSignal
```

Le SDK Anthropic n'est pas requis : le port HTTP injecté reste compatible avec
le mock Vitest et le faux serveur local `/v1/messages`. L'adaptateur ne choisit
jamais un modèle, ne construit aucun prompt, ne réserve aucun quota et ne
persiste rien.

## Équivalence des trois flux

| Flux | Modèle logique → fournisseur | Sortie | Paramètres préservés |
|---|---|---|---|
| Athena | `anthropic-sonnet-4.6` → `claude-sonnet-4-6` | Markdown texte libre | `max_tokens=1024`, système/profil, dix messages historiques puis message borné |
| Recette | `anthropic-haiku-4.5` → `claude-haiku-4-5-20251001` | JSON texte validé par `recipeOutputSchema` | `max_tokens=1500`, système et message historiques, arrondis HTTP inchangés |
| Suggestion | `anthropic-haiku-4.5` → `claude-haiku-4-5-20251001` | JSON texte validé par `exerciseSuggestionsOutputSchema` | `max_tokens=500`, système, filtres et message historiques |

La recette n'utilisait pas d'outil avant cette migration. Elle reste donc une
sortie JSON textuelle; inventer un `tool_use` aurait modifié la requête et le
contrat fournisseur. Le support outil de l'adaptateur est testé, mais aucun de
ces trois flux ne l'active.

Les builders sous `lib/ai/prompts`, les schémas Zod et le parsing central sont
les seules frontières de prompt et de sortie. Les routes ne contiennent ni
URL Anthropic, ni identifiant fournisseur, ni parsing manuel.

## Erreurs, annulation et confidentialité

Les statuts fournisseur deviennent les erreurs sûres du provider : 429 en
`quota_exceeded`, 5xx/transport en `network_error`, 400/401/403 en
`provider_refused`, réponse malformée en `invalid_output`. Aucun corps,
exception, prompt, message, clé ou contenu invalidé n'est recopié.

`Request.signal` est adapté et relié à l'`AbortController` du transport. Le
listener est retiré dans tous les cas et l'annulation produit `cancelled`.
Les trois flux n'avaient ni timeout serveur ni retry fournisseur : la migration
n'ajoute donc aucun timer, retry ou fallback. `timeoutMs` reste la borne de
validation du contexte provider et ne crée pas à lui seul une échéance réseau.
La politique de résilience commune n'est volontairement pas activée tant qu'un
timeout produit n'est pas décidé.

`stream()` reste non implémenté pour Anthropic et renvoie un échec sûr : aucun
des trois flux migrés n'est streaming. Les SSE Training/Nutrition sont hors de
cette tranche.

## Usages, tokens et coûts

Une seule réservation existante est conservée avant le transport. Le même
correlation ID relie route, provider et finalisation. `input_tokens` et
`output_tokens`, ainsi que les tokens cache présents, sont normalisés; une
absence reste inconnue. Le modèle réellement retourné alimente la finalisation
et l'estimation en micros USD. Succès, échec et annulation sont distincts.

## Tests et limites

Les tests vérifient requêtes exactes, texte, JSON, outil, modèle, tokens,
erreurs expurgées, annulation, quotas, persistance Athena, arrondis recette,
suggestions et absence de double réservation. Le harnais Athena vérifie le
transport local réel et le Markdown hostile inerte.

Limites restantes : les douze autres flux utilisent encore leur transport
historique; aucun timeout produit n'est défini; `stream()` n'est pas migré;
les golden fixtures exhaustives restent une tâche séparée.

## Références

- [Inventaire IA](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Interface provider](AI_PROVIDER_INTERFACE.md)
- [Résilience](AI_RESILIENCE_POLICY.md)
- [Registre des modèles](AI_MODEL_COST_REGISTRY.md)
- [Quotas et usages](AI_USAGE_QUOTAS.md)
