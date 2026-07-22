# Audit de clôture de la Phase 7 — Plateforme IA

> Audit mis à jour après la migration isolée de `suggest-overload`, le 22 juillet
> 2026. Aucun autre transport, prompt, modèle, quota, route ou consommateur
> n'est modifié par cette tranche.

## Verdict

**Phase 7 incomplète.** Les treize tâches de checklist sont cochées, mais la définition de terminé n'est pas satisfaite : 10 des 15 points d'entrée utilisent `AiProvider`; 5 restent sur transport historique. La Phase 8 ne doit pas être activée.

## Compteurs reproductibles

| Mesure | Valeur vérifiée | Preuve |
|---|---:|---|
| Points d'entrée IA | 15 | `AI_FEATURES`, goldens et policies fallback contiennent chacun 15 entrées |
| Points d'entrée `AiProvider` | 10 | 10 fichiers route créent `createAnthropicProvider` |
| Points d'entrée historiques | 5 | 3 modules HTTP directs couvrant 4 features + 1 route SDK |
| Expressions HTTP Anthropic directes | 4 | dont 2 branches dans `analyze-progress-photo` |
| Clients SDK directs | 1 | `new Anthropic` dans les instructions d'exercice |
| Sites d'invocation runtime totaux | 6 | adaptateur partagé + 4 `fetch` directs + 1 SDK |
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
| `generate-exercise-instructions` | `POST /api/generate-exercise-instructions` | SDK direct | Haiku direct | instructions | JSON + Zod, batch partial | usage, admin user |
| `generate-program` | `POST /api/generate-program` | `AiProvider` | registre Haiku | programme legacy | JSON + Zod | usage, user |
| `generate-custom-program` | `POST /api/generate-custom-program` | `AiProvider` + SSE | registre Opus | Training | tool + Zod | quota lourd, user |
| `training-regen` | `POST /api/training-regen/cron` | `AiProvider` partagé | registre Opus | Training | tool + Zod, partial | usage, serveur + sujet |
| `suggest-overload` | `POST /api/suggest-overload` | `AiProvider` + écriture | registre Haiku | surcharge | JSON + Zod + écriture | usage, user |
| `analyze-body` | `POST /api/analyze-body` | HTTP direct multimodal | Opus direct | corps | tool + Zod | quota lourd, user |
| `analyze-progress-photo` | `POST /api/analyze-progress-photo` | 2 HTTP directs | Opus direct | 2 builders photo | texte libre non validé | quota lourd, user |
| `weekly-diagnostic` | `POST /api/weekly-diagnostic` | HTTP direct partagé | Opus direct | diagnostic | tool + Zod | usage logged, user |
| `weekly-diagnostic-cron` | `POST /api/weekly-diagnostic/cron` | même HTTP direct | Opus direct | diagnostic | tool + Zod, partial | usage, serveur + sujet |

Les quinze entrées ont un golden, une policy fallback et utilisent la frontière d'usage commune. Les transports historiques ne propagent aucun signal d'annulation au fournisseur et n'activent aucun timeout commun.

### Capacités des cinq historiques

| Feature | Annulation / timeout / retry | Tokens et coût | Erreurs et logs | Golden / fallback / test de contrat |
|---|---|---|---|---|
| `generate-exercise-instructions` | aucun signal, timeout ou retry; boucle séquentielle | modèle et tokens agrégés | nom d'exercice et `e.message` loggés | oui / partial / batch route manquant |
| `analyze-body` | aucun signal/timeout serveur; retry 429 ×3 dans le consommateur | métadonnées lues; coût via usage | `e.message` loggé et renvoyé | oui / no-fallback / route multimodale manquante |
| `analyze-progress-photo` | aucun signal/timeout/retry; ancienne image ignorée si téléchargement échoue | métadonnées lues; coût via usage | messages de téléchargement renvoyés; texte absent devient succès générique | oui / no-fallback divergent / deux modes manquants |
| `weekly-diagnostic` | aucun signal, timeout ou retry | métadonnées lues et tokens persistés/estimés | erreurs fournisseur/SQL loggées et parfois propagées | oui / no-fallback / service transport-persist manquant |
| `weekly-diagnostic-cron` | idem, batch concurrence 5 | même métadonnée par utilisateur | erreur brute possible dans `details` | oui / partial / cron panne manquant |

Les builders de prompt sont séparés pour les cinq. Le JSON/tool_use est validé par les schémas et parseurs communs; seule la sortie texte libre de progression photo ne passe pas par `aiFreeTextSchema`. Les principals sont issus de la session pour les routes utilisateur, du contrôle admin pour les instructions et de `CRON_SECRET` avec principal serveur + sujet pour le cron.

## Définition de terminé

La roadmap exige textuellement : tous les appels via provider commun; toutes les sorties structurées validées; durée, modèle, tokens/coût et résultat exposés par endpoint; aucune migration technique mêlée à un changement de prompt.

| Critère | État | Preuve et risque | Action minimale |
|---|---|---|---|
| Tous appels via provider | **unmet** | 10/15; 4 `fetch` directs + 1 SDK | migrer les 5 features historiques |
| Toutes sorties structurées validées | **met** | parseurs et Zod communs sur JSON/tool | préserver pendant migration |
| Texte libre borné/valide | **partial** | progression photo transforme un texte absent en phrase générique réussie | valider fail-closed |
| Durée/résultat observables | **met** | 15 passent par usage/finalisation | préserver la frontière |
| Modèle/tokens/coût | **partial** | métadonnées lues mais 9 littéraux directs et tokens parfois indisponibles | registre + provider, indisponible explicite |
| Modèles centralisés | **partial** | registre complet mais chaînes historiques | supprimer les littéraux migrés |
| Prompts séparés | **met** | 15 builders purs et goldens | conserver les empreintes |
| Parsing centralisé | **met** pour structuré | helpers communs | ajouter texte libre au moment de sa migration |
| Quotas/usages atomiques | **met** | 15 `AI_FEATURES`, RPC/service commun | ne pas modifier les quotas |
| Goldens / fallbacks | **met** | 15/15 et 15/15 | garder les gardes exhaustives |
| Erreurs expurgées | **unmet** | plusieurs routes renvoient/loggent `e.message` | mapper via provider et erreurs publiques sûres |
| Logs sans données sensibles | **partial** | pas de clé/token; noms, erreurs SQL/fournisseur subsistent | retirer contenus bruts |
| Annulation/timeout/retry communs | **unmet** | aucun signal/timeout historique; retry 429 body côté client seulement | propager signal, sans nouveau retry |
| Tests déterministes historiques | **partial** | prompts/schémas/goldens couverts, contrats route incomplets | tests avant chaque migration |
| Couverture cron | **partial** | logique/goldens présents, pannes transport/persistance peu couvertes | service injecté manuel/cron |
| Migration sans prompt mêlé | **met** | builders et goldens | comparaison exacte |
| Critère Phase 8 | **not_applicable** | baseline performance décochée | ne pas activer Phase 8 |

## Cinq transports historiques et ordre recommandé

| Ordre | Feature(s) | Forme | Complexité / risque | Test manquant | Partage possible |
|---:|---|---|---|---|---|
| 1 | `generate-exercise-instructions` | SDK batch JSON | moyenne / élevé | batch partial et tokens | outils Training, contrat séparé |
| 2 | `analyze-body` | tool_use, 3 images | moyenne / élevé | URL, quota, outil invalide | analyses corps/photos |
| 3 | `analyze-progress-photo` | texte libre, 1–3 images | élevée / élevé | deux modes et texte absent | analyses corps/photos |
| 4 | `weekly-diagnostic` | tool + écritures/push | élevée / élevé | transport et échecs partiels | diagnostic manuel/cron |
| 5 | `weekly-diagnostic-cron` | même tool + batch | élevée / élevé | concurrence et agrégat | même service diagnostic |

## Décision roadmap

Les cases existantes restent inchangées : elles attestent des tranches réalisées, pas de la définition globale. La Phase 7 reste active et explicitement incomplète. La Phase 8 et sa baseline restent décochées.

`suggest-overload` conserve son golden exact, `max_tokens=300`,
`temperature=0.3`, le même Haiku, sa limite 10/min et son usage sans quota DB.
Le fournisseur précède toujours l'insertion owner-scoped dans
`progressive_overload_suggestions`; un échec d'insertion reste HTTP 200
`skipped` et finalise l'usage en échec. Les détails SQL/fournisseur sont
expurgés, sans retry, fallback, transaction ou nouveau timeout réseau.
La table legacy n'est toujours pas décrite par les types générés ni par une
migration de création/policy versionnée; cette dette de schéma et l'usage
service-role existant restent explicitement hors de cette migration transport.

Prochaine tâche unique : **migrer `generate-exercise-instructions` vers `AiProvider` avec tests de contrat batch, sans changement de prompt, d'autorité ni de réponse publique**.
