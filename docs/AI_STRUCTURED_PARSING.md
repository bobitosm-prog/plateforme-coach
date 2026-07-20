# Parsing et validation structurée IA

> Frontière centralisée le 20 juillet 2026. Elle remplace les parseurs ad hoc
> des sorties structurées sans migrer les transports vers `AiProvider`.

## Inventaire avant migration

Onze parseurs runtime distincts traitaient les sorties structurées :

- sept routes extrayaient du JSON texte avec `JSON.parse`, suppression de
  fences ou regex gloutonne : recette, photo repas, suggestion et instructions
  d'exercice, programme coach legacy, adaptation et surcharge ;
- le service Nutrition séquentiel répétait cette extraction puis une validation
  manuelle de chaque journée ;
- trois services recherchaient un bloc `tool_use` et utilisaient un helper
  générique `any` : analyse corporelle, programme Training moderne et diagnostic.

Les routes et cron qui partagent les services Training et diagnostic ne
possédaient pas de parseur supplémentaire. Athena, les trois variantes photo
de progression et leurs SSE applicatifs sont du texte libre. Le décodeur SSE
Training parse des événements HTTP produits par MoovX, pas une sortie IA
structurée; il reste donc séparé.

Contrairement au libellé de travail initial, la recette observée n'utilise pas
`tool_use` : son prompt exige du JSON dans un bloc texte. Cette réalité est
conservée et testée.

## API publique

[`lib/ai/parsing`](../lib/ai/parsing/) exporte :

```ts
parseAiJson(input, options)
parseAiToolUse(input, expectedName)
parseAndValidateAiOutput(input, schema, options)
parseAndValidateToolUse(input, expectedName, schema)
normalizeAiStructuredOutput(schema, input)
unwrapLegacyToolInput(input)
```

Chaque fonction retourne `AiStructuredParsingResult<T>` :

```ts
type AiStructuredParsingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AiStructuredParsingError }
```

L'erreur publique contient uniquement `code: 'invalid_output'`, une raison
stable, et éventuellement le nombre d'issues et au plus huit chemins expurgés.
Elle ne peut transporter ni exception, message Zod, sortie brute, prompt,
image ou payload.

## Contrats de décodage

- limite par défaut : 200 000 caractères, contrôlée avant `JSON.parse` ;
- JSON exact accepté ;
- fence Markdown complète acceptée uniquement avec `allowMarkdownFence` ;
- texte autour du JSON accepté uniquement avec
  `allowLegacySurroundingText` pour les flux historiques concernés ;
- l'extraction legacy utilise un scanner équilibré conscient des chaînes et
  échappements, jamais une regex gloutonne ;
- JSON tronqué, doublement encodé ou non conforme refusé ;
- aucune coercition, réparation ou valeur vide de secours ;
- collections, profondeur utile et clés inconnues bornées par les
  [schémas Zod](AI_OUTPUT_SCHEMAS.md).

Les raisons possibles sont : `empty_input`, `input_too_large`,
`markdown_fence_not_allowed`, `unexpected_surrounding_text`, `invalid_json`,
`invalid_shape`, `missing_tool_use`, `ambiguous_tool_use`, `wrong_tool_name`,
`invalid_tool_input` et `excessive_tool_input_wrapping`.

## Outils structurés

Un seul bloc `tool_use` est autorisé. Son nom doit être exactement celui
attendu. L'absence, le mauvais nom et plusieurs outils sont refusés.

Le wrapper historique `{ input: output }` est accepté seulement lorsqu'il est
l'unique propriété racine. Un second wrapper est refusé. Cette règle remplace
le helper générique `unwrapToolInput` dans tous ses consommateurs runtime sans
supprimer le fichier legacy, qui peut encore servir de référence historique.

## Flux migrés

| Flux | Contrat | Schéma | Compatibilité |
|---|---|---|---|
| Recette | JSON texte, fence et texte autour legacy | `recipeOutputSchema` | réponse `{ recipe }` et arrondis conservés |
| Plan Nutrition séquentiel | JSON texte par jour | `legacyNutritionDayOutputSchema` | journée vide légitime distincte d'une journée invalide; plan partiel conservé |
| Photo repas | JSON texte multimodal | `mealPhotoOutputSchema` | corps HTTP inchangé |
| Suggestion exercice | tableau JSON texte | `exerciseSuggestionsOutputSchema` | réponse `{ suggestions }` inchangée |
| Instructions exercice | JSON texte fenced | `exerciseInstructionsOutputSchema` | écritures et compteur conservés |
| Programme coach legacy | objet JSON texte | `legacyTrainingProgramOutputSchema` | ajout des jours de repos manquants conservé |
| Programme Training route/cron | outil `generate_program` | `modernTrainingProgramOutputSchema` | résolution catalogue et écritures inchangées |
| Adaptation séance | tableau JSON texte | `adaptedWorkoutOutputSchema` | réponse `{ exercises }` inchangée |
| Surcharge | objet JSON texte | `overloadSuggestionOutputSchema` | statuts, insertion et messages historiques par classe d'erreur conservés |
| Analyse corporelle | outil `body_analysis_output` | `bodyAnalysisOutputSchema` | réponse HTTP inchangée |
| Diagnostic manuel/cron | outil `weekly_diagnostic_output` | `weeklyDiagnosticOutputSchema` | persistance et notification inchangées |

## Durcissements fail-closed

Les anciennes regex acceptaient le premier objet/tableau plausible dans un
texte arbitraire et plusieurs routes acceptaient tout résultat de
`JSON.parse`. Désormais :

- les clés inconnues et types incorrects sont refusés ;
- nombres négatifs, non finis ou hors plage sont refusés ;
- une sortie partielle ne reçoit ni zéro, ni tableau ou objet de secours ;
- les réponses outil ambiguës et noms incorrects sont refusés ;
- les logs ajoutés par cette migration ne contiennent plus de réponse outil
  brute ;
- le plan Nutrition continue après une journée invalide, mais la marque comme
  échec et conserve `partial`/`failedDays`.

L'acceptation du texte autour du JSON reste une compatibilité legacy explicite
sur les routes qui l'acceptaient déjà. Elle pourra être supprimée seulement
après migration contractuelle de ces producteurs.

## Architecture et limites

Le noyau n'importe ni React, Next.js, Supabase, SDK Anthropic, navigateur,
réseau ou `app/`. Il ne choisit ni prompt, modèle, timeout, retry ou quota.

Restent hors périmètre :

- Athena et les analyses photo de progression, volontairement textuelles ;
- framing et parsing SSE applicatif ;
- transport Anthropic commun et migration vers `AiProvider` ;
- golden fixtures par endpoint, prévues après migration provider ;
- suppression définitive du helper `lib/anthropic/unwrap-tool-input.ts`.

## Références

- [Inventaire des prompts, modèles et sorties](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Schémas de sortie IA](AI_OUTPUT_SCHEMAS.md)
- [Interface commune du provider](AI_PROVIDER_INTERFACE.md)
- [Frontières de prompts](AI_PROMPT_BOUNDARIES.md)
