# Frontières de prompts IA

> État vérifié au 20 juillet 2026. Les quinze points d'entrée IA délèguent leur
> construction de prompt à des frontières pures sans migration vers `AiProvider`.

## Contrat commun

Le module pur [`lib/ai/prompts`](../lib/ai/prompts/) sépare les données métier
des contrats envoyés aux transports historiques. `AiPromptInvocation` conserve
exactement `model`, `max_tokens`, `system`, `messages`, `temperature`,
`tool_choice` et `tools` lorsqu'ils existent.

`immutableInvocation()` fige profondément un contrat nouvellement construit.
Les builders clonant des collections reçues ne figent ni ne modifient leurs
entrées. Le module ne connaît ni `fetch`, SDK Anthropic, React, Next.js,
Supabase, navigateur, variable d'environnement ou code `app/`.

## Flux extraits

| Point d'entrée | Builder | Contrat préservé |
|---|---|---|
| Chat Athena | `buildAthenaInvocation` | profil, historique ordonné, Sonnet 4.6, 1 024 tokens |
| Recettes | `buildRecipeInvocation` | objectifs repas, listes inclure/exclure, Haiku 4.5, 1 500 tokens |
| Analyse de repas | `buildMealPhotoInvocation` | JPEG Base64 puis texte, Sonnet 4.6, 1 000 tokens |
| Suggestion d'exercice | `buildExerciseSwapInvocation` | règle isolation/composé, Haiku 4.5, 500 tokens |
| Adaptation de séance | `buildAdaptWorkoutInvocation` | ordre et projection legacy des exercices, Sonnet 4.6, 800 tokens |
| Instructions d'exercice | `buildExerciseInstructionsInvocation` | message SDK unique, Haiku 4.5, 500 tokens |
| Surcharge progressive | `buildOverloadInvocation` | historique déjà ordonné, température 0,3, Haiku 4.5, 300 tokens |
| Analyse corporelle | `buildBodyAnalysisInvocation` | trois images/media types ordonnés, outil et schéma, Opus 4.8, 1 024 tokens |
| Programme coach legacy | `buildLegacyCoachProgramInvocation` | split et préfatigue injectés, format legacy séparé, Haiku 4.5, 3 000 tokens |
| Programme Training — route | `buildTrainingProgramInvocation` | structures sexe/jours, catalogue, outil, Opus 4.8, 8 000 tokens |
| Programme Training — cron | `buildTrainingProgramInvocation` | même service et même contrat que la route, sans fallback |
| Plan Nutrition séquentiel | `buildMealGenerationSystemPrompt`, `buildSequentialMealDayInvocation` | ordre des jours et contexte protéines déjà utilisées, Opus 4.8, 1 500 tokens/jour |
| Analyse des photos | `buildProgressPhotoAssessmentInvocation`, `buildProgressPhotoInvocation` | branches bilan trois vues, simple et comparaison avant/après, Opus 4.8 |
| Diagnostic manuel | `buildWeeklyDiagnosticInvocation` | agrégats, diagnostic précédent et outil, Opus 4.8, 2 048 tokens |
| Diagnostic cron | `buildWeeklyDiagnosticInvocation` | même générateur métier que le déclenchement manuel |

Les routes et services gardent leur authentification, leurs quotas, écritures,
parsing, transport HTTP/SDK, SSE, statuts et réponses publiques. Ils
sérialisent le contrat du builder à la place d'un objet assemblé inline.

## Couverture actuelle

Les tests vérifient les quinze points d'entrée, paramètres exacts, valeurs minimales, accents, contenu
multiligne, valeurs absentes, ordre des collections, JSON legacy, images,
media types, outil structuré, immutabilité et absence d'import transport. Une
garde statique confirme la délégation des routes et services extraits.

La prochaine action unique est : définir les schémas Zod de sortie.

## Références

- [Inventaire des prompts, modèles et sorties](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Interface commune du provider](AI_PROVIDER_INTERFACE.md)
- [Registre des modèles et coûts](AI_MODEL_COST_REGISTRY.md)
