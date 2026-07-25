# Objectifs Nutrition du diagnostic hebdomadaire

## Périmètre

C08 couvre exclusivement la lecture des quatre objectifs Nutrition de
`profiles` pendant la génération du diagnostic hebdomadaire. La consommation
`daily_food_logs`, son agrégation, le rendu du diagnostic et toutes les
écritures restent inchangés.

Cette lecture n'est pas un plan Nutrition : `NutritionPlanEnvelopeV1` et les
readers de `meal_plans` ne sont donc pas applicables. La frontière
`resolveWeeklyDiagnosticNutritionGoals` est un résolveur pur spécifique au
contrat du diagnostic.

## Flux réel

Le flux manuel est :

`Home → POST /api/weekly-diagnostic → createWeeklyDiagnostic →
generateWeeklyDiagnostic → profiles + lectures hebdomadaires →
resolveWeeklyDiagnosticNutritionGoals → calculs déterministes →
buildWeeklyDiagnosticInvocation → IA → écritures existantes →
WeeklyDiagnosticDetailContent`.

Le cron appelle le même générateur avec l'owner client ciblé. Le flux est
serveur, one-shot : il ne possède ni cache, ni polling, ni état React, ni
cleanup. Une génération déjà présente est neutralisée par la lecture
idempotente de `weekly_diagnostics`.

## Lecture et schéma runtime

La lecture reste exactement :

```text
profiles
  .select('*')
  .eq('id', userId)
  .single()
```

Elle fait partie des cinq lectures parallèles initiales. L'owner est l'identité
de session pour le flux manuel et le client ciblé pour le cron. La semaine est
la semaine complète précédente, calculée en `Europe/Zurich`; elle ne filtre pas
la ligne `profiles`.

La projection read-only distante `profiles(id, calorie_goal, protein_goal,
carbs_goal, fat_goal)` répond HTTP 200. Les types générés déclarent les quatre
colonnes `number | null`. Un échantillon runtime normalisé a confirmé des
nombres et des valeurs nulles, sans exposer de donnée utilisateur.

Le nombre, la projection, le filtre, la forme `single` et le parallélisme des
requêtes sont inchangés. Le rejet réseau de cette lecture est seulement
normalisé dans le même résultat transport que l'erreur Supabase.

## Contrat zéro, absence et invalidité

Chaque objectif est résolu indépendamment :

- nombre fini strictement positif : `known`;
- chaîne numérique non vide, finie et strictement positive : `known`, afin de
  préserver la coercition historique;
- `null`, `undefined`, champ absent ou chaîne vide : `absent`;
- zéro, négatif, chaîne non numérique, `NaN`, `Infinity` ou autre type :
  `invalid`.

Un objectif réel à zéro n'est pas calculable dans ce contrat : il rendrait
impossibles les comparaisons de conformité et ne représente pas une cible
Nutrition exploitable. Une absence ou une invalidité n'est jamais remplacée
par zéro.

Le résultat global est :

- `complete` si les quatre objectifs sont connus;
- `partial` si au moins un objectif est connu et un autre ne l'est pas;
- `unavailable` si tous sont absents;
- `invalid` si aucun n'est connu et au moins un est invalide.

## Effet de chaque objectif

- `calorie_goal` alimente la cible calorique du prompt, l'écart calorique, le
  contrôle « prise de muscle mais déficit » et
  `weekly_diagnostics.calorie_avg_target`;
- `protein_goal` alimente la cible protéique du prompt, le pourcentage de
  conformité et `weekly_diagnostics.protein_compliance_pct`;
- `carbs_goal` et `fat_goal` n'alimentent historiquement aucun calcul du
  diagnostic; leur absence ou invalidité produit uniquement un drapeau de
  cohérence explicite.

Une consommation valide reste visible même si son objectif manque. Le prompt
affiche `?` pour une cible, un écart ou une conformité non calculable, et
reçoit un drapeau par objectif absent ou invalide. Les quatre objectifs valides
produisent le même prompt, les mêmes nombres et les mêmes résultats qu'avant.
Une semaine vide conserve des objectifs connus, mais ses consommations restent
inconnues selon le contrat de l'agrégation hebdomadaire.

## Erreurs et réponses obsolètes

Une erreur Supabase ou un rejet réseau de `profiles` arrête la génération avec
`profile_read_failed`, avant l'appel IA et avant toute écriture. Elle ne devient
ni profil absent, ni cible zéro. Une ligne réellement absente reste le cas
historique `Profile introuvable`.

Le générateur n'a aucune réponse obsolète possible à neutraliser : un appel
possède un owner, une fenêtre et une seule exécution, et l'idempotence protège
les répétitions. Il n'existe pas de « valeur visible précédente » dans ce flux
serveur.

## Écritures et comportement visible

Les blocs d'insert du diagnostic et d'update de `next_diagnostic_at` ne sont pas
modifiés. Seule leur entrée calculée devient honnête : une cible calorique ou
une conformité protéique non calculable est persistée à `null`, jamais à zéro.
La consommation valide et toutes les données complètement valides conservent
leur résultat historique.

Aucune écriture `meal_plans`, aucune mutation Nutrition, aucun payload de
sauvegarde et aucun producteur de plan n'est modifié.
