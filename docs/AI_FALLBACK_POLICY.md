# Politique explicite des fallbacks IA

## Principe

Une panne IA ne produit jamais de contenu métier de substitution. MoovX ne change ni de modèle ni de fournisseur silencieusement, ne contourne pas un quota, ne rejoue pas une requête cachée et ne transforme pas une sortie inconnue en zéro. Le registre pur [`lib/ai/fallbacks`](../lib/ai/fallbacks) décrit le comportement observé sans modifier les routes.

Fallback de modèle, fallback de fournisseur, contenu de substitution, réponse publique expurgée, résultat partiel, cache, ancienne donnée validée et signalée stale, valeur de présentation, retry et mode dégradé sans IA restent des notions distinctes. Une réponse publique générique n'est pas un fallback métier.

## Matrice des quinze features

| Feature | Comportement actuel et déclencheur | Résultat / signal partial | Persistance | Décision | Risque principal |
|---|---|---|---|---|---|
| `chat-ai` | erreur fournisseur ou sortie invalide | erreur expurgée, aucun message assistant | assistant non persisté | `no_fallback` | réponse fictive attribuée à Athena |
| `generate-recipe` | erreur ou JSON invalide | erreur, aucune recette vide | aucune recette | `no_fallback` | conseil nutritionnel inventé |
| `generate-meal-plan` | échec d'une journée après démarrage | fragments valides; partial masqué par le SSE legacy | fragments valides | `explicit_partial` | journée vide ambiguë |
| `analyze-meal-photo` | erreur ou analyse invalide | erreur, aucune analyse générique | aucune | `no_fallback` | aliments/macros fictifs |
| `suggest-exercise` | erreur ou sortie invalide | erreur, aucune alternative | aucune | `no_fallback` | alternative inadaptée |
| `adapt-workout` | erreur ou sortie invalide | erreur, aucun programme vide | aucune | `no_fallback` | entraînement dangereux |
| `generate-exercise-instructions` | échec d'un élément du batch | résultats valides et erreur par exercice | agrégat batch | `explicit_partial` | erreur élémentaire masquée |
| `generate-program` | erreur ou programme invalide | erreur, aucun programme ancien/vide | aucune génération | `no_fallback` | faux programme réussi |
| `generate-custom-program` | erreur ou outil invalide | SSE `error`, jamais `done` fictif | aucune génération | `no_fallback` | fausse réussite SSE |
| `training-regen` | échec par client | succès conservés, échecs comptés | seuls succès | `explicit_partial` | persistance multi-étapes |
| `suggest-overload` | erreur ou sortie invalide | erreur, aucune charge par défaut | aucune suggestion | `no_fallback` | surcharge inventée |
| `analyze-body` | erreur ou outil invalide | erreur, aucune estimation générique | aucune analyse | `no_fallback` | estimation pseudo-médicale |
| `analyze-progress-photo` | erreur fournisseur | erreur, aucun texte générique | aucune analyse | `no_fallback` | analyse non issue de l'image |
| `weekly-diagnostic` | erreur ou outil invalide | erreur, aucun score artificiel | aucun diagnostic | `no_fallback` | suivi contaminé |
| `weekly-diagnostic-cron` | échec par utilisateur | diagnostics valides, échecs comptés | seuls diagnostics valides | `explicit_partial` | fausse réussite cron |

Aucune feature n'autorise actuellement `stale_allowed`; aucun cache n'est créé. Une future ancienne donnée exigerait owner, domaine, validation et expiration explicites, puis un signal `stale` au consommateur.

## Matrice des erreurs

| Erreur | Décision commune |
|---|---|
| `provider_refused` | aucun changement de modèle/fournisseur; seuls fragments déjà valides d'un contrat partiel subsistent |
| `quota_exceeded` | aucun fallback, contournement ou partial créé après refus |
| `timeout` | aucun retry implicite; fragments déjà valides seulement pour les quatre contrats partiels |
| `network_error` | même décision que timeout |
| `invalid_output` | aucun contenu synthétique; fragments séparément validés seulement |
| `unexpected_error` | fail-closed pour toutes les features |
| `cancelled` | aucun fallback ni partial supplémentaire |

La matrice exécutable couvre 15 × 7 combinaisons. Une décision partielle exige au moins un fragment valide et copie la liste sans muter l'entrée. Les raisons sont des codes stables sans message fournisseur, prompt, image ou donnée personnelle.

## API publique

- `AI_FALLBACK_POLICIES` : registre exhaustif immuable ;
- `getAiFallbackPolicy(feature)` : politique d'une feature connue ;
- `evaluateAiFallback(context)` : décision discriminée fail-closed ;
- `isAiFallbackAllowed(context)` : prédicat sans effet ;
- `createAiDegradedResult(feature, decision, value)` : résultat `partial` ou, pour une future politique explicite, `stale` ;
- `validateAiStaleCandidate(candidate, context)` : contrôle pur owner/domaine/validation/expiration sans autoriser son usage ;
- `AI_FALLBACK_ERROR_CODES` : sept erreurs normalisées du provider.

Le module n'importe ni React, Next.js, Supabase, Anthropic, navigateur ni `app/`. Il n'effectue aucun accès réseau, stockage ou journalisation.

## Intégration et limites

Le registre reste une frontière de décision pure; les routes n'appellent pas
automatiquement `evaluateAiFallback`. Les comportements runtime migrés suivent
cependant ces contrats : le diagnostic manuel échoue sans score ni persistance,
alors que le cron conserve uniquement les diagnostics utilisateurs déjà
validés et compte séparément les échecs. Le plan Nutrition masque encore la
liste des journées invalides. Crons et batch d'instructions exposent un agrégat
partiel sans transaction. Aucun transport fournisseur historique runtime ne
subsiste hors de l'adaptateur commun.
