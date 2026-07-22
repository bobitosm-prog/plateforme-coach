# Audit de clôture de la Phase 7 — Plateforme IA

> État préparatoire mis à jour après la migration du transport partagé des
> diagnostics hebdomadaires, le 22 juillet 2026. La clôture reste soumise à un
> audit final séparé de toute migration.

## Verdict

**Phase 7 en attente d'audit final.** Les quinze points d'entrée utilisent
désormais `AiProvider` et aucun transport Anthropic runtime historique ne
subsiste. Cette migration ne clôt pas automatiquement la phase : l'audit final
doit vérifier tous les critères de terminé. La Phase 8 ne doit pas être activée.

## Compteurs reproductibles

| Mesure | Valeur vérifiée | Preuve |
|---|---:|---|
| Points d'entrée IA | 15 | `AI_FEATURES`, goldens et policies fallback contiennent chacun 15 entrées |
| Points d'entrée `AiProvider` | 15 | 13 routes directes + 2 orchestrateurs diagnostic via un générateur partagé |
| Points d'entrée historiques | 0 | aucun transport fournisseur runtime hors adaptateur |
| Expressions HTTP Anthropic directes | 0 | seul l'adaptateur commun effectue le transport |
| Clients SDK directs hors adaptateur | 0 | le dernier client direct runtime a été retiré du batch d'instructions |
| Sites d'invocation runtime totaux | 1 | adaptateur Anthropic commun |
| Modèles fournisseur runtime distincts | 3 | Haiku 4.5, Sonnet 4.6, Opus 4.8 |
| Golden fixtures / policies fallback / features usage | 15 / 15 / 15 | registres typés correspondants |

Commandes :

```bash
rg -l "createAnthropicProvider" app/api --glob 'route.ts'
rg -n "fetch\(['\"]https://api\.anthropic\.com/v1/messages" app/api lib --glob '*.ts'
rg -n "new Anthropic|\.messages\.create" app/api lib --glob '*.ts'
rg -c "entryPoint:" tests/fixtures/ai-golden/contracts.ts
rg -c "policy\('" lib/ai/fallbacks/registry.ts
```

## Quinze points d'entrée

| Feature | Entrée | Transport | Modèle | Prompt | Sortie / validation | Usage et principal |
|---|---|---|---|---|---|---|
| `chat-ai` | `POST /api/chat-ai` | `AiProvider` | registre Sonnet | Athena | texte validé | quota, user |
| `generate-recipe` | `POST /api/generate-recipe` | `AiProvider` | registre Haiku | recette | JSON + Zod | usage, user |
| `generate-meal-plan` | `POST /api/generate-meal-plan` | `AiProvider`, 7 appels | registre Opus | journée Nutrition | JSON + Zod, partial legacy | quota lourd, user |
| `analyze-meal-photo` | `POST /api/analyze-meal-photo` | `AiProvider` multimodal | registre Sonnet | repas photo | JSON + Zod | quota, user |
| `suggest-exercise` | `POST /api/suggest-exercise` | `AiProvider` | registre Haiku | alternative | JSON + Zod | quota, user |
| `adapt-workout` | `POST /api/adapt-workout` | `AiProvider` | registre Sonnet | adaptation | JSON + Zod | usage, user |
| `generate-exercise-instructions` | `POST /api/generate-exercise-instructions` | `AiProvider`, batch séquentiel | registre Haiku | instructions | JSON + Zod, batch partial | usage, admin user |
| `generate-program` | `POST /api/generate-program` | `AiProvider` | registre Haiku | programme legacy | JSON + Zod | usage, user |
| `generate-custom-program` | `POST /api/generate-custom-program` | `AiProvider` + SSE | registre Opus | Training | tool + Zod | quota lourd, user |
| `training-regen` | `POST /api/training-regen/cron` | `AiProvider` partagé | registre Opus | Training | tool + Zod, partial | usage, serveur + sujet |
| `suggest-overload` | `POST /api/suggest-overload` | `AiProvider` + écriture | registre Haiku | surcharge | JSON + Zod + écriture | usage, user |
| `analyze-body` | `POST /api/analyze-body` | `AiProvider` multimodal/tool | registre Opus | corps | tool + Zod | quota lourd, user |
| `analyze-progress-photo` | `POST /api/analyze-progress-photo` | `AiProvider` multimodal | registre Opus | 2 builders photo | texte libre borné et validé | quota lourd, user |
| `weekly-diagnostic` | `POST /api/weekly-diagnostic` | `AiProvider` partagé | registre Opus | diagnostic | tool + Zod | usage logged, user |
| `weekly-diagnostic-cron` | `POST /api/weekly-diagnostic/cron` | même générateur `AiProvider` | registre Opus | diagnostic | tool + Zod, partial | usage, serveur + sujet |

Les quinze entrées ont un golden, une policy fallback et utilisent la frontière
d'usage commune. Les diagnostics propagent le signal de leur requête sans
ajouter de timeout effectif, retry ou fallback de modèle.

### Contrats des deux diagnostics migrés

| Feature | Annulation / timeout / retry | Tokens et coût | Erreurs et logs | Golden / fallback / test de contrat |
|---|---|---|---|---|
| `weekly-diagnostic` | signal HTTP propagé; aucun timeout effectif/retry | modèle réel et tokens optionnels finalisés | erreurs fournisseur/SQL expurgées | golden / no-fallback / contrats manuel et générateur |
| `weekly-diagnostic-cron` | signal serveur propagé; arrêt avant lot suivant; concurrence 5 inchangée | une opération par utilisateur tenté | erreurs sûres dans `details`, aucun identifiant loggé | golden / explicit_partial / contrats cron et générateur |

Le builder diagnostic reste unique et produit la même invocation pour manuel et
cron. Le `tool_use` est décodé par l'adaptateur puis validé par
`weeklyDiagnosticOutputSchema`. Le manuel dérive son principal de la session;
le cron conserve `CRON_SECRET`, un principal serveur et un sujet utilisateur.
Collecte, calculs, persistance, planification et push restent dans le générateur
métier partagé.

## Définition de terminé

La roadmap exige textuellement : tous les appels via provider commun; toutes les sorties structurées validées; durée, modèle, tokens/coût et résultat exposés par endpoint; aucune migration technique mêlée à un changement de prompt.

| Critère | État | Preuve et risque | Action minimale |
|---|---|---|---|
| Tous appels via provider | **met à réauditer** | 15/15; 0 transport direct | confirmer par audit final |
| Toutes sorties structurées validées | **met** | parseurs et Zod communs sur JSON/tool | préserver pendant migration |
| Texte libre borné/valide | **met** | Athena et progression photo valident leur texte | préserver fail-closed |
| Durée/résultat observables | **met** | 15 passent par usage/finalisation | préserver la frontière |
| Modèle/tokens/coût | **met à réauditer** | modèle réel/tokens propagés; absence distincte de zéro | confirmer les quinze flux |
| Modèles centralisés | **met à réauditer** | diagnostics résolus par `anthropic-opus-4.8` | scanner les runtimes |
| Prompts séparés | **met** | 15 builders purs et goldens | conserver les empreintes |
| Parsing centralisé | **met** pour structuré | helpers communs | ajouter texte libre au moment de sa migration |
| Quotas/usages atomiques | **met** | 15 `AI_FEATURES`, RPC/service commun | ne pas modifier les quotas |
| Goldens / fallbacks | **met** | 15/15 et 15/15 | garder les gardes exhaustives |
| Erreurs expurgées | **met à réauditer** | diagnostic mappe provider, SQL et push sans détail brut | audit global des quinze flux |
| Logs sans données sensibles | **partial à réauditer** | diagnostic nettoyé; dette globale à rescanner | audit final dédié |
| Annulation/timeout/retry communs | **partial à réauditer** | diagnostics propagent le signal; aucun nouveau timer/retry | vérifier chaque flux |
| Tests déterministes historiques | **met à réauditer** | contrats route/générateur/cron ajoutés | exécuter matrice finale |
| Couverture cron | **met à réauditer** | lots, partial, échec total et annulation couverts | audit final |
| Migration sans prompt mêlé | **met** | builders et goldens | comparaison exacte |
| Critère Phase 8 | **not_applicable** | baseline performance décochée | ne pas activer Phase 8 |

## Migration diagnostic réalisée

| Ordre | Feature(s) | Forme | Complexité / risque | Test manquant | Partage possible |
|---:|---|---|---|---|---|
| 1 | `weekly-diagnostic` | tool + écritures/push | migré | no-fallback, session, signal HTTP | générateur partagé |
| 2 | `weekly-diagnostic-cron` | même tool + batch | migré | lots de 5, explicit_partial, signal serveur | générateur partagé |

## Décision roadmap

Les cases existantes restent inchangées : elles attestent des tranches
réalisées, pas de la définition globale. La Phase 7 reste active jusqu'à son
audit final. La Phase 8 et sa baseline restent décochées.

`analyze-progress-photo` conserve Opus 4.8, ses builders, `max_tokens=2048`
pour l'évaluation et `1024` pour les branches simple/comparaison, ainsi que
l'ordre face/dos/profil/texte ou ancienne/actuelle/texte. Session, limite IP
3/min, quota 10/h et 6 opérations lourdes sur 30 jours restent inchangés.
Le texte est désormais borné avec `aiFreeTextSchema`; une absence ou une sortie
invalide échoue sans fabriquer d'analyse. Le fallback historique explicite
d'une comparaison vers une analyse simple lorsque l'ancienne image ne peut
être téléchargée reste conservé.

La route ne persiste rien. Le consommateur onboarding ne transforme plus une
erreur HTTP expurgée en contenu IA envoyé au plan Nutrition. Signal HTTP,
modèle réel et tokens sont propagés; images, URL, profil, prompt et sortie ne
sont ni journalisés ni placés dans les erreurs publiques.

Prochaine tâche unique : **auditer la clôture de la Phase 7 contre sa définition
de terminé, les quinze flux, les scans de confidentialité et les validations
complètes, sans migration fonctionnelle supplémentaire**.
