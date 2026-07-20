# Schémas de sortie IA

> Contrats ajoutés le 20 juillet 2026. Ils caractérisent les sorties attendues
> des flux existants, mais ne sont pas encore branchés dans les routes runtime.

## Frontière

Le module [`lib/ai/schemas`](../lib/ai/schemas/) regroupe les schémas Zod par
domaine. Il ne parse pas de texte fournisseur, n'appelle aucun transport et ne
connaît ni React, Next.js, Supabase, Anthropic, le navigateur ou `app/`.

| Domaine | Sorties couvertes | Nature actuelle |
|---|---|---|
| Chat | texte Athena, enveloppe texte/métadonnées fournisseur | texte libre / SSE applicatif |
| Nutrition | recette, journée séquentielle, analyse photo de repas | JSON dans texte |
| Training | alternatives, instructions, adaptation, surcharge, programme legacy, programme moderne | JSON dans texte ou outil |
| Progression | analyse corporelle, analyse/comparaison photo | outil ou texte libre |
| Diagnostic | diagnostic hebdomadaire | outil |

Les types TypeScript publics sont tous dérivés avec `z.infer`. Les schémas
structurés utilisent des objets stricts, sauf l'exercice du programme legacy :
ses champs supplémentaires sont volontairement conservés parce que ce format
historique transporte encore des prescriptions non uniformes.

## API publique

Le point d'import est `lib/ai/schemas/index.ts`. Il exporte les schémas, leurs
types et trois utilitaires :

- `validateAiOutput(schema, input)` retourne un succès typé ou une erreur
  discriminée `invalid_output` ;
- `createAiOutputValidator(schema)` adapte directement Zod au contrat
  `AiOutputValidator<T>` du provider commun ;
- `createToolUseEnvelopeSchema(name, schema)` et `unwrapToolUseInput()`
  caractérisent l'enveloppe outil et le double emballage legacy déjà accepté.

Une erreur ne contient que le nombre d'issues et au plus huit chemins de
champs bornés. Les messages Zod, valeurs, prompts et réponses brutes ne sont
jamais exposés.

## Règles communes

- chaînes non vides et bornées pour les contenus exigés ;
- tableaux bornés afin de refuser les sorties démesurées ;
- nombres finis, positifs ou non négatifs selon le contrat ;
- plages explicites pour scores, confiance et pourcentages ;
- clés inconnues refusées sur les objets structurés ;
- entrée `unknown`, résultat déterministe et aucune mutation de l'entrée ;
- JSON malformé ou tronqué refusé : la frontière ne tente aucune réparation ;
- markdown admis uniquement dans les sorties historiquement libres
  (Athena et analyses photo) ;
- nom d'outil exact exigé et enveloppe étrangère refusée.

## Correspondance avec le runtime

Les schémas suivent les prompts et tool schemas effectivement construits le
20 juillet 2026. Ils n'affirment pas que les parseurs historiques les imposent
déjà.

| Flux | Divergence runtime préservée |
|---|---|
| Recette | le parseur arrondit les macros et peut transformer une valeur absente en `NaN`; le schéma refuse absence et non-fini |
| Journée Nutrition | le service possède déjà une validation manuelle proche, mais reste distinct de Zod |
| Photo repas | la route accepte tout objet JSON; le schéma exige aliments, totaux et confiance documentés |
| Suggestion/instructions/adaptation Training | les routes font seulement `JSON.parse`; le schéma applique les formes exactes demandées par les prompts |
| Programme legacy | les jours manquants sont complétés en repos par la route; le schéma accepte le dictionnaire reçu sans inventer ces jours |
| Programme moderne | l'outil est forcé mais son input n'est pas validé avec Zod après réception |
| Surcharge | seule une charge positive est actuellement vérifiée avant écriture |
| Corps/diagnostic | les tool schemas fournisseur bornent partiellement les valeurs, sans validateur métier local commun |
| Photos de progression | la sortie reste volontairement du texte libre, distingué par `kind` |

Ces divergences sont des entrées pour la prochaine tranche. Aucun parseur,
prompt, modèle, quota, statut HTTP ou consommateur n'a été modifié ici.

## Validation structurée et sécurité

`createAiOutputValidator()` permet au futur adaptateur de fournir le schéma au
[`AiProvider`](AI_PROVIDER_INTERFACE.md) sans coupler celui-ci à Zod. Un refus
est fail-closed et devient seulement `{ ok: false }` côté provider.

Les schémas n'effectuent ni coercition numérique, ni fallback, ni nettoyage de
JSON, ni choix de modèle. Ils ne journalisent rien. Une réponse partielle ne
devient donc jamais un succès par défaut.

## Limites

- Les schémas ne sont branchés sur aucun des 15 points d'entrée.
- Les fixtures sont synthétiques; les golden fixtures par endpoint restent à
  ajouter après migration.
- Le programme Training legacy reste volontairement plus permissif à
  l'intérieur d'un exercice.
- Athena et les analyses photo textuelles ne peuvent valider la sémantique du
  contenu libre.
- La journée Nutrition modélise les clés anglaises réellement consommées par
  le service; les clés françaises appartiennent à une autre frontière legacy.

La prochaine étape unique est de centraliser le parsing et la validation
structurée autour de ces schémas, sans changer les contrats HTTP.

## Références

- [Inventaire des prompts, modèles et sorties](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Frontières de prompts](AI_PROMPT_BOUNDARIES.md)
- [Interface commune du provider](AI_PROVIDER_INTERFACE.md)
- [Modèle Nutrition canonique](NUTRITION_CANONICAL_MODEL.md)
- [Modèle Training canonique](TRAINING_CANONICAL_MODEL.md)
