# Inventaire des prompts, modèles et contrats de sortie IA

> État constaté dans le dépôt au 21 juillet 2026. Ce document décrit le code
> existant sans modifier les prompts, les modèles, les quotas ni les contrats.

L'[interface commune du provider IA](AI_PROVIDER_INTERFACE.md) est désormais
définie comme cible de migration. Chat Athena, Recipes, Suggest Exercise et
les trois points d'entrée de génération Training et le plan Nutrition l'utilisent désormais via
l'[adaptateur Anthropic](AI_ANTHROPIC_ADAPTER.md).

Le [registre des modèles et coûts](AI_MODEL_COST_REGISTRY.md) relie désormais
les trois identifiants runtime et le modèle opérationnel legacy à des
identifiants logiques, capacités, limites et tarifs vérifiés. Il ne remplace
aucun littéral runtime et ne constitue ni un fallback ni une migration.

L'[extraction des frontières de prompts](AI_PROMPT_BOUNDARIES.md) est terminée :
les quinze points d'entrée délèguent désormais leur contrat exact à des
builders purs. Les transports, modèles, paramètres, parseurs et contrats HTTP
restent inchangés; sept points d'entrée utilisent désormais `AiProvider`.

## Périmètre et méthode

L'inventaire recoupe les routes `app/api`, les services `lib`, leurs
consommateurs, les tests, les doubles fournisseurs et les scripts
opérationnels. Un « point d'entrée » est une route HTTP ou cron exposant une
fonctionnalité IA. Une « invocation fournisseur » est une expression de code
qui appelle Anthropic, même lorsqu'elle est partagée par plusieurs routes.

Commandes reproductibles, en excluant le fichier de travail concurrent :

```bash
rg -n "messages\.create|api\.anthropic\.com/v1/messages|getChatAnthropicMessagesUrl\(\)|fetchImpl\(" \
  app lib scripts --glob '!scripts/enrich-parent-exercises.mjs'
rg -n "model: ['\"]claude-" app lib scripts \
  --glob '!scripts/enrich-parent-exercises.mjs'
rg -l "chat-ai|generate-recipe|suggest-exercise|generate-exercise-instructions|generate-program|generate-custom-program|generate-meal-plan|adapt-workout|suggest-overload|analyze-meal-photo|analyze-body|analyze-progress-photo|weekly-diagnostic|training-regen" \
  tests e2e --glob '*.{ts,tsx,mjs}'
```

### Compteurs vérifiés

| Mesure | Compteur | Détail |
|---|---:|---|
| Points d'entrée runtime | 15 | 12 routes utilisateur, 3 routes cron/techniques |
| Invocations Anthropic runtime | 9 sites | 1 adaptateur HTTP partagé par 7 points d'entrée, 7 autres transports HTTP, 1 appel SDK |
| Invocation hors runtime | 1 | script de backfill utilisant le SDK |
| Modèles runtime distincts | 3 | Haiku 4.5, Sonnet 4.6, Opus 4.8 |
| Modèle supplémentaire hors runtime | 1 | Opus 4.7 dans le script de backfill |
| Flux SSE applicatifs | 2 | programme Training et plan Nutrition |
| Appels SDK streaming | 0 | les SSE enveloppent des réponses Anthropic non streamées |
| Sorties à outil forcé | 3 frontières | Training, analyse corporelle, diagnostic hebdomadaire |
| Endpoints à JSON dans du texte | 8 | parsing centralisé; recette et suggestion passent aussi par `AiProvider` |
| Endpoints principalement texte libre | 2 | chat Athena, analyse de photos de progression |

Les classes de sortie se chevauchent avec le transport : les deux endpoints
SSE émettent respectivement un résultat d'outil structuré et des journées JSON
semi-structurées.

## Carte des modèles et transports

| Modèle exact | Frontières runtime | Transport |
|---|---|---|
| `claude-haiku-4-5-20251001` (`anthropic-haiku-4.5`) | recette, suggestion d'exercice, instructions d'exercice, programme coach legacy, surcharge progressive | HTTP direct, sauf instructions via SDK |
| `claude-sonnet-4-6` (`anthropic-sonnet-4.6`) | chat Athena, adaptation de séance, analyse de repas photographié | HTTP direct; seul le chat possède une URL locale injectée et bornée |
| `claude-opus-4-8` (`anthropic-opus-4.8`) | programme Training canonique/cron, plan Nutrition, diagnostic hebdomadaire, analyse corporelle, analyse de photos de progression | adaptateur commun pour Training/Nutrition; HTTP direct ailleurs |
| `claude-opus-4-7` (`anthropic-opus-4.7-legacy`) | backfill hors runtime des traductions d'exercices | SDK, modèle divergent à traiter séparément |

Les sept points d'entrée migrés utilisent des identifiants logiques résolus par
le registre. Les huit autres flux conservent leurs littéraux historiques.

La [politique explicite des fallbacks](AI_FALLBACK_POLICY.md) couvre les quinze
features. Onze n'autorisent aucun fallback; quatre préservent uniquement un
résultat partiel historique composé de fragments déjà valides. Aucune feature
n'autorise un fallback de modèle, de fournisseur ou une donnée stale.

## Matrice exhaustive des flux

### Chat et coaching conversationnel

| Flux | Entrée et consommateur | Prompt et données | Sortie, validation et échec | Autorité, quota, tests et dette |
|---|---|---|---|---|
| Chat Athena | `POST /api/chat-ai`; `useChatAI` puis `ChatAI` | `COACH_SYSTEM_PROMPT` enrichi côté serveur par le profil et les dix derniers messages; message utilisateur borné à 500 caractères | Texte libre via `AiProvider`, réponse JSON `{ message }`; persistance user avant l'appel et assistant en best effort | Session serveur, invité refusé, limite IP et quota horaire; adaptateur commun, faux serveur E2E local, erreurs expurgées et tokens disponibles journalisés |

Références : [harnais E2E Athena](E2E_CHAT_HARNESS.md),
[`lib/coach-knowledge.ts`](../lib/coach-knowledge.ts) et
[`lib/anthropic/chat-transport.ts`](../lib/anthropic/chat-transport.ts).

### Nutrition

| Flux | Entrée et consommateur | Prompt et données | Sortie, validation et échec | Autorité, quota, tests et dette |
|---|---|---|---|---|
| Génération de recette | `POST /api/generate-recipe`; `RecipesSection` | Système avec exemple JSON; profil, objectifs, régime, aliments inclus/exclus fournis par le navigateur | JSON texte via `AiProvider`, parsing central et `recipeOutputSchema`; arrondis conservés | Session et limite IP; garde `invited` navigateur historique préservée; adaptateur injecté et tests de route, erreurs expurgées |
| Génération de plan | `POST /api/generate-meal-plan`; six producteurs actuels dont onboarding, préférences et détail client | Système et prompt quotidien construits dans le service; objectifs, préférences, allergies, régime et contexte cumulatif fournis au provider | Sept appels JSON séquentiels via `AiProvider`, schéma Zod puis adaptation; SSE `progress`, puis `done`; une journée invalide devient vide sans marqueur public de partialité | Session serveur, limite réelle 3/min IP, 10/h et 6/30 jours lourds, invité refusé; une réservation, tokens/coûts agrégés, annulation propagée, aucun timeout/retry ajouté |
| Analyse de repas photographié | `POST /api/analyze-meal-photo`; `NutritionTab` | Image Base64 navigateur, multimodal sans prompt système distinct | JSON validé par parsing commun et `mealPhotoOutputSchema` | Session, limite IP et quota IA; image 5 MB max, média forcé JPEG; transport direct et message d'exception brut |

La génération de plan utilise désormais l'adaptateur commun. L'analyse de repas
photographié reste un flux distinct non migré. Voir le
[service de génération Nutrition](NUTRITION_MEAL_GENERATION_SERVICE.md).

### Training

| Flux | Entrée et consommateur | Prompt et données | Sortie, validation et échec | Autorité, quota, tests et dette |
|---|---|---|---|---|
| Suggestion d'alternative | `POST /api/suggest-exercise`; aucun consommateur actif trouvé | Système `EXERCISE_SWAP_PROMPT`; exercice, motif, muscles, équipement et type reçus | JSON texte via `AiProvider`, parsing central et schéma exact de trois suggestions | Session, limites IP/IA et usage inchangés; route orpheline, adaptateur injecté et erreurs expurgées |
| Instructions d'exercice | `POST /api/generate-exercise-instructions`; endpoint admin/batch sans consommateur UI trouvé | Prompt utilisateur par exercice, sans prompt système; nom, groupe et équipement de la base | JSON validé par parsing commun et `exerciseInstructionsOutputSchema`; résultat batch partiel | Session, e-mail admin exact, limite IP, service role; SDK Anthropic; erreurs par exercice journalisant nom et message; pas de test de route dédié |
| Programme coach legacy | `POST /api/generate-program`; détail client coach | Prompt unique sans champ système séparé; profil client et paramètres d'entraînement | JSON texte via `AiProvider`, validé par `legacyTrainingProgramOutputSchema`, puis sept jours legacy normalisés | Session, limite IP et usage inchangés; erreurs fournisseur expurgées, annulation reliée au signal HTTP |
| Programme Training | `POST /api/generate-custom-program`; onboarding, builder et diagnostic | Système dynamique avec règles, sexe, équipement et catalogue; prompt utilisateur avec profil et objectifs | Outil forcé `generate_program` via `AiProvider`, validé par `modernTrainingProgramOutputSchema`, puis SSE `progress`/`done` inchangé | Session, limites IP/IA, quota global, usage avant appel; service partagé avec le cron; annulation finalisée séparément |
| Régénération Training | `POST /api/training-regen/cron`; planificateur serveur | Même service et mêmes prompts que le programme Training | Même outil validé; écritures par client et agrégat succès/erreur partiel conservés | `CRON_SECRET` et service role; concurrence bornée à trois; ordre désactivation/insertion/prochaine date inchangé; pas de retry fournisseur |
| Adaptation de séance | `POST /api/adapt-workout`; aucun consommateur actif trouvé | Système `PROGRAM_GENERATION_PROMPT`; exercices, durée et type de séance reçus | Tableau validé par parsing commun et `adaptedWorkoutOutputSchema` | Session et limite IP; route orpheline, transport direct et message d'exception brut |
| Surcharge progressive | `POST /api/suggest-overload`; action dashboard client | Système extrait; exercice, charge, répétitions et quatre historiques lus côté serveur | JSON validé par parsing commun et `overloadSuggestionOutputSchema`; insertion d'une suggestion | Session, limite IP, garde invité; service role, transport direct et détails SQL possibles |

### Progression, photos et diagnostic

| Flux | Entrée et consommateur | Prompt et données | Sortie, validation et échec | Autorité, quota, tests et dette |
|---|---|---|---|---|
| Analyse corporelle | `POST /api/analyze-body`; contrôleur Progression | Système d'analyse; trois URL de photos, poids et taille | Outil forcé `body_analysis_output` avec estimations, forces, améliorations, symétrie et résumé; présence de l'outil vérifiée, pas de validation Zod | Session, limites IP/IA et quota global; retry 429 uniquement dans le consommateur (3 essais); URL téléchargées côté serveur, corps fournisseur journalisé et parfois renvoyé |
| Analyse de photos | `POST /api/analyze-progress-photo`; onboarding et Progression | Deux branches : évaluation trois vues ou comparaison simple; photos téléchargées, contexte et mesures éventuels | Texte libre dans les deux branches, sans schéma; réponse `{ analysis }` | Session, limites IP/IA et quota global; aucune reprise serveur; URL et extraits d'erreur journalisés; téléchargement d'URL non borné à une origine de stockage explicite |
| Diagnostic hebdomadaire manuel | `POST /api/weekly-diagnostic`; `HomeTab` | Système et prompt assemblant entraînement, nutrition, poids, bien-être, objectifs et profil lus côté serveur | Outil forcé `weekly_diagnostic_output`; score, points forts/alerte, ajustements, objectif et `raisonnement`; absence de validation Zod; écrit diagnostic et prochaine date | Session, limite IP; pas de quota IA commun visible dans la route; persistance multi-étapes et push en best effort. Le raisonnement fournisseur est persisté |
| Diagnostic hebdomadaire cron | `POST /api/weekly-diagnostic/cron`; planificateur serveur | Même générateur que le flux manuel | Même outil et mêmes écritures; résultat par utilisateur partiel | `CRON_SECRET` et service role; logs contenant préfixes d'identifiants et erreurs; aucun retry/timeout fournisseur |

## Contrats de prompt et de sortie

### Prompts système et utilisateur

- 12 des 14 invocations runtime fournissent un champ `system`. Les exceptions
  sont les instructions d'exercice et le programme coach legacy, dont toutes
  les instructions sont placées dans le message utilisateur.
- Tous les appels construisent au moins un message utilisateur dynamique.
- Les prompts sont inline dans les routes ou services, sauf les constantes de
  connaissance coach/Training et les deux services déjà extraits.
- Les données envoyées couvrent profil, objectifs, santé déclarative,
  nutrition, historique d'entraînement, mesures, photos et conversations. Il
  n'existe pas de politique commune de minimisation ou de redaction avant
  transport.

### Sorties structurées

Les trois frontières à outil forcé transmettent un JSON Schema puis valident la
sortie avec les schémas Zod communs. Les huit sorties JSON-dans-texte passent
par le parsing et les schémas communs. Les deux flux texte libre restent
distincts; la progression photo ne borne pas encore son texte dans sa route
historique.

### Texte libre et SSE

- Athena et l'analyse de progression photographique acceptent du texte libre.
- Aucun appel `messages.stream` n'existe. Les SSE de MoovX sont construits par
  les routes après des appels Anthropic classiques.
- Le flux Training émet `progress`, `done` ou `error`; le flux Nutrition émet
  `progress` puis `done`. Les consommateurs possèdent leurs propres parseurs de
  lignes et ignorent parfois les événements non reconnus.

## Authentification, quotas et résilience

| Mécanisme | État observé |
|---|---|
| Identité | Les routes utilisateur relisent la session Supabase. La recette conserve toutefois une décision de rôle issue du corps navigateur |
| Routes cron | `CRON_SECRET` puis client service role |
| Limite IP | Présente sur les 12 routes utilisateur |
| Limite IA horaire | Présente sur chat, alternatives, programme custom, plan Nutrition, analyses photo/corps; absente ou non uniforme ailleurs |
| Quota global | Programme custom, plan Nutrition, analyse corporelle et analyse de progression |
| Timeout fournisseur | Aucun timer réseau commun activé; l'adaptateur commun classe annulation et `TimeoutError`, et les routes migrées propagent leur signal sans inventer d'échéance |
| Retry fournisseur | Aucun retry serveur commun; analyse corporelle possède un retry 429 côté client |
| Fallback | Registre commun 15/15; quatre partials historiques. La progression photo conserve encore deux textes génériques silencieux dans son runtime historique |

L'usage est souvent enregistré avant la réussite fournisseur. Les statuts 429,
500 et les sorties invalides ne sont pas mappés uniformément.

## Journalisation et confidentialité

Les frontières les plus prudentes sont le service Nutrition et l'adaptateur
commun. Ailleurs, plusieurs routes journalisent des corps fournisseur,
des textes invalides, des URL de photos, des noms d'exercice, des messages
d'exception ou des détails SQL. Certaines réponses HTTP/SSE retransmettent un
message brut. Aucun token ou clé n'est volontairement loggé, mais les contenus
peuvent révéler prompt, données personnelles ou détails internes.

Le diagnostic hebdomadaire persiste un champ `raisonnement` produit par le
modèle. Ce champ doit être considéré comme une sortie métier sensible et non
comme une trace technique fiable.

## Tests, mocks et frontières locales

- [`tests/mocks/anthropic.ts`](../tests/mocks/anthropic.ts) simule SDK et HTTP :
  texte, outil, réponse malformée, 429 et 500; le prompt système enregistré est
  expurgé.
- [`scripts/fake-anthropic-server.mjs`](../scripts/fake-anthropic-server.mjs)
  est le faux serveur HTTP E2E. Il n'est branchable qu'au chat Athena par la
  garde locale stricte actuelle.
- Les tests dédiés couvrent surtout les sept flux migrés, la génération de plan
  Nutrition et le harnais chat. Les quinze flux ont des goldens, mais les huit
  transports historiques manquent encore de contrats de route complets.
- Le document [Mocks de fournisseurs](TEST_PROVIDER_MOCKS.md) mentionne onze
  chemins `fetch`; le code courant possède huit expressions HTTP runtime et un
  appel SDK runtime. Ce compteur documentaire historique est obsolète.
- Le script `backfill-exercise-i18n.mjs` est un consommateur SDK hors runtime et
  utilise Opus 4.7; il n'est ni un endpoint produit ni couvert par la frontière
  commune.

## Divergences et risques prioritaires

1. Huit flux restent hors du provider commun : HTTP direct et SDK coexistent encore.
2. Neuf littéraux fournisseur subsistent dans ces flux; le script opérationnel a déjà
   dérivé vers une autre version d'Opus.
3. Les sorties structurées utilisent les schémas communs, mais le texte libre
   de progression photo accepte encore un contenu absent comme succès générique.
4. Timeout, retry, quota, usage et mapping d'erreur ne sont pas uniformes.
5. Des corps fournisseur, contenus invalides, URL et détails internes peuvent
   entrer dans les logs ou réponses.
6. La recette prend une décision d'autorité à partir de données navigateur;
   surcharge et instruction utilisent un service role localement sans
   frontière provider commune.
7. Deux routes sont sans consommateur actif (`suggest-exercise`,
   `adapt-workout`) et une route batch admin n'a pas de consommateur UI.
8. Les deux SSE ne streament pas le fournisseur et n'ont pas un protocole
   d'erreur/partialité commun.
9. Les images sont téléchargées depuis des URL fournies au serveur sans
   allowlist de stockage explicite visible dans ces routes.
10. Les tests contractuels restent concentrés sur Athena et Nutrition; les
    sorties Training, Progression et diagnostic disposent désormais de goldens
    synthétiques communs avec les autres points d'entrée ; voir
    [Golden fixtures IA](./AI_GOLDEN_FIXTURES.md).

## État du parsing structuré au 20 juillet 2026

Les onze parseurs structurés distincts recensés utilisent désormais la
[frontière commune de parsing et validation](AI_STRUCTURED_PARSING.md). Les
paires route/cron Training et diagnostic partagent chacune leur parseur de
service. Athena et les trois analyses photo restent du texte libre; le parsing
SSE applicatif reste une responsabilité de transport distincte.

Les formes HTTP/SSE, prompts, modèles et écritures sont conservés. Les sorties
malformées, ambiguës, hors bornes ou incompatibles avec les schémas sont
désormais refusées fail-closed, sans log de leur contenu brut.

## État des quotas et usages au 20 juillet 2026

La [matrice détaillée des quinze flux](AI_USAGE_QUOTAS.md) conserve sept
policies horaires DB, quatre quotas lourds globaux et huit flux sans quota DB
effectif. Les quinze points d'entrée passent désormais par la réservation et
la finalisation communes; la migration additive conserve les lignes legacy et
remplace le mécanisme non atomique `COUNT` puis `INSERT`.

## Ordre de migration recommandé

1. Définir une interface provider commune sans changer prompts ni modèles.
2. Centraliser timeout, classification d'erreur et métadonnées d'appel.
3. Créer un registre explicite des modèles et coûts.
4. Séparer chaque prompt du transport en conservant des snapshots mesurés.
5. Ajouter les schémas de sortie et golden fixtures avant migration de chaque
   endpoint.
6. Migrer d'abord les petits flux orphelins/Haiku, puis Chat et Recipes, avant
   les générations Training/Nutrition et les analyses multimodales.

## Références

- [Modèle Nutrition canonique](NUTRITION_CANONICAL_MODEL.md)
- [Modèle Training canonique](TRAINING_CANONICAL_MODEL.md)
- [Contrats de réponse API](API_RESPONSE_CONTRACT.md)
- [Taxonomie d'erreurs API](API_ERROR_TAXONOMY.md)
- [Validation API](API_VALIDATION.md)
- [Observabilité API](API_OBSERVABILITY.md)
- [Schémas de sortie IA](AI_OUTPUT_SCHEMAS.md)
- [Parsing et validation structurée](AI_STRUCTURED_PARSING.md)
- [Quotas et journalisation d'usage](AI_USAGE_QUOTAS.md)
- [Stratégie de test](TESTING_STRATEGY.md)
