# Caractérisation Nutrition du diagnostic hebdomadaire

## Conclusion

**Aucune migration vers `NutritionPlanEnvelopeV1` n'est applicable.**

Le diagnostic hebdomadaire ne possède aucun consommateur read-only de
`meal_plans` ou `client_meal_plans`. Ses objectifs viennent du profil et sa
consommation vient du journal alimentaire. Ajouter un reader de plan
augmenterait le nombre de requêtes et introduirait une nouvelle autorité sans
équivalent historique. L'utiliser uniquement comme garde serait une
dépendance morte ; l'utiliser comme source d'objectifs modifierait le
diagnostic.

## Flux manuel réel

```text
HomeTab
  → WeeklyDiagnosticCard.onGenerate
  → POST /api/weekly-diagnostic
  → createWeeklyDiagnostic
    → session authentifiée / rate limit / suivi d'usage IA
  → generateWeeklyDiagnostic
    → calcul de la dernière semaine complète Europe/Zurich
    → contrôle d'idempotence weekly_diagnostics
    → lectures parallèles profil, nutrition, poids, séances, diagnostic précédent
    → lecture conditionnelle workout_sets
    → agrégats déterministes historiques
    → buildWeeklyDiagnosticInvocation
    → fournisseur IA + validation structurée
    → insert weekly_diagnostics
    → update profiles.next_diagnostic_at
    → push best effort
  → réponse JSON
  → HomeTab.setLatestDiagnostic
  → WeeklyDiagnosticCard
```

Le cron utilise le même générateur après avoir sélectionné les profils clients
arrivés à échéance. Il traite des lots de cinq. Cette caractérisation ne
modifie ni le déclenchement manuel, ni le cron.

## Lectures du générateur

Le contrôle d'idempotence s'exécute d'abord. S'il trouve une ligne, le
générateur s'arrête après cette unique lecture. Sinon, cinq lectures partent
en parallèle, puis une sixième est conditionnelle à la présence de séances.

| Autorité | Projection | Owner et fenêtre | Ordre / limite / forme | Rôle |
|---|---|---|---|---|
| `weekly_diagnostics` | `id, score_semaine` | `user_id`, `week_start = lundi` | aucun ordre, `maybeSingle` | idempotence |
| `profiles` | `*` | `id = userId` | `single` | objectifs et contexte |
| `daily_food_logs` | `date, calories, protein, carbs, fat` | `user_id`, `date >= weekStart`, `date < weekEnd` | collection, sans ordre ni limite | consommation |
| `weight_logs` | `date, poids` | `user_id`, `date >= weekStart` | `date ASC`, collection sans limite | variation de poids historique |
| `workout_sessions` | `id, date, completed` | `user_id`, `date >= weekStart`, `date < weekEnd` | collection, sans ordre ni limite | adhérence |
| `weekly_diagnostics` | `score_semaine, ajustements, objectif_semaine_prochaine, applied_changes` | `user_id`, `week_start < lundi` | `week_start DESC`, limite 1, `maybeSingle` | comparaison précédente |
| `workout_sets` conditionnel | `weight, reps, completed` | IDs des séances, `completed = true` | collection, sans ordre ni limite | tonnage |

Avant l'IA, cela représente six lectures quand aucune séance n'existe et sept
quand `workout_sets` est lu. Après une persistance réussie,
`push_subscriptions` peut être lu en best effort ; la suppression de
souscriptions expirées est une maintenance push existante, pas une écriture
Nutrition.

Il n'existe :

- aucune lecture `meal_plans` ;
- aucune lecture `client_meal_plans` ;
- aucune lecture `meal_tracking` ;
- aucune lecture `saved_meals`.

Les deux accès `meal_plans` de
`WeeklyDiagnosticDetailContent.regenMealPlan` sont exclusivement
`update` puis `insert`, après génération SSE. Ils restent hors de toute
frontière read-only et n'ont pas été modifiés.

## Sources Nutrition et agrégation sécurisée

Les quatre objectifs `calorie_goal`, `protein_goal`, `carbs_goal` et
`fat_goal` sont lus dans `profiles`. Leur contrat nullable est résolu par la
frontière pure documentée dans
[`NUTRITION_WEEKLY_DIAGNOSTIC_GOALS.md`](NUTRITION_WEEKLY_DIAGNOSTIC_GOALS.md).
Calories et protéines alimentent les comparaisons historiques; glucides et
lipides ne participent à aucun calcul et signalent seulement une cible absente
ou invalide. L'objectif produit, le TDEE, le niveau, le score fitness, le poids
courant et le nombre de séances planifiées viennent du même profil.

La consommation vient uniquement de `daily_food_logs`. La projection conserve
`date, calories, protein, carbs, fat`, mais le diagnostic ne consomme que la
date, les calories et les protéines. `carbs` et `fat` ne participent à aucun
calcul; `meal_type`, `quantity_g`, portions et champs legacy ne sont pas
demandés.

Avant sécurisation, `Number(value || 0)` transformait `null`, `undefined`, une
chaîne vide et plusieurs types inattendus en zéro. Un texte non numérique
produisait `NaN`; les valeurs négatives et infinies n'étaient pas refusées.
Chaque date ayant une ligne entrait ensuite dans le dénominateur commun des
deux moyennes.

`aggregateWeeklyDiagnosticNutrition` applique désormais les règles suivantes :

- un nombre fini positif ou nul est connu; zéro reste zéro;
- une chaîne numérique non vide reste acceptée pour préserver la coercition
  legacy démontrée;
- `null`, `undefined`, un champ absent ou une chaîne vide sont inconnus;
- une chaîne non numérique, `NaN`, `Infinity`, un type incompatible ou un
  nombre négatif sont invalides;
- une date invalide ou hors fenêtre exclut toute la ligne;
- si une ligne du jour est inconnue ou invalide pour une métrique, ce jour est
  exclu de la moyenne de cette métrique; l'autre métrique reste indépendante;
- plusieurs lignes valides du même jour sont sommées avant la moyenne;
- aucune valeur connue pour une métrique produit `null`, jamais zéro.

La semaine vide est `unavailable`, sans moyenne inventée. Une semaine
partielle moyenne chaque métrique sur ses seuls jours entièrement connus. Une
semaine est `complete` uniquement avec sept jours connus pour calories et
protéines, sans issue. `daysLogged` reste le nombre de dates valides possédant
au moins une ligne afin de préserver le signal historique de saisie.

Le payload IA présente `?` pour moyenne, écart ou conformité inconnus et reçoit
un signal de cohérence explicite. Les colonnes nullable du diagnostic
reçoivent `null`; la forme de l'insert ne change pas. Le détail affiche `—`
pour calories ou conformité inconnues. Les semaines valides produisent
strictement les mêmes nombres, prompt et rendu qu'avant.

## Date, timezone et fraîcheur

Le helper prend une horloge injectable, extrait la date civile dans
`Europe/Zurich`, trouve le lundi de la semaine courante puis recule de sept
jours avec les primitives calendaires communes. La fenêtre Nutrition est semi-ouverte :
`[weekStart, weekEnd)`. Les dates `daily_food_logs` sont des `YYYY-MM-DD`.
Les séances utilisent la même paire de bornes. La lecture poids conserve son
filtre historique sans borne haute.

Il n'existe ni cache, ni polling, ni refresh interne. Le déclenchement manuel
est une requête utilisateur ; le cron filtre les profils arrivés à échéance.
Le signal HTTP est propagé à l'appel IA. Les lectures Supabase ne possèdent
pas de compteur de réponse obsolète côté React : `HomeTab` attend une réponse
unique et remplace `latestDiagnostic` seulement si le JSON contient un
diagnostic.

## Erreurs et schéma runtime

Une absence de profil arrête la génération. Les autres réponses SQL de
collecte sont historiquement traitées comme collections vides lorsque
`data` est absente. Les erreurs fournisseur, validation et persistance sont
expurgées par le générateur et le service HTTP.

Le contrôle distant read-only du 24 juillet 2026 a validé, pour l'owner
anonymisé `…b8df580a` et la fenêtre `2026-07-13` à `2026-07-20`, toutes les
projections ci-dessus : 53 lignes de journal, cinq séances, 108 séries
complétées, aucun poids et un diagnostic précédent. Le profil exposait les
huit champs requis parmi 78 colonnes. Les 53 journaux contenaient exactement
les cinq clés projetées : dates sous forme de chaînes et calories, protéines,
glucides et lipides sous forme de nombres; aucun nombre négatif ou non fini
n'a été observé. Les nullabilités restent celles du schéma, et les autres
types sont couverts défensivement par les tests. La projection de plan canonique aliasée
existe également dans le schéma, mais elle n'appartient pas à ce flux et n'a
pas été ajoutée au générateur. Aucune écriture distante n'a été exécutée.

## Comparaison des autres consommateurs

| Consommateur | Fenêtre et fraîcheur | Sémantique |
|---|---|---|
| résumé Home du jour | date UTC du navigateur, égalité, limite 20, refresh au retour Home | somme plan + logs; `null` calorique vaut zéro mais nombre invalide refuse le résumé |
| mini-graphe Home | sept jours glissants UTC, limite 200 | somme calories legacy avec fallback zéro |
| onglet Nutrition | date sélectionnée, ordre `created_at ASC`, état React et retry | expose les lignes; aucune moyenne hebdomadaire |
| Analytics | fenêtre glissante du read model, ordre repository et limite bornée | `aggregateAnalyticsNutritionByDate`, inconnus et invalides distincts, jamais convertis implicitement en zéro |
| diagnostic | dernière semaine civile complète Zurich, collection sans ordre ni limite | moyenne calories/protéines par jours connus, inconnues explicites |

Owner, dates, limites, fraîcheur et sorties diffèrent. Aucun de ces
consommateurs n'est forcé derrière le helper spécialisé du diagnostic.

## Garde et périmètre

La garde statique des producteurs Nutrition vérifie que
`generateWeeklyDiagnostic` ne dépend d'aucune table de plan et que les deux
accès `meal_plans` du détail restent des mutations historiques. Elle ne fige
ni les projections des autres domaines, ni le calcul, ni le fournisseur IA.

La [décision métier ultérieure](NUTRITION_PHASE_4_DIVERGENCE_DECISION.md)
clôt techniquement la Phase 4 sans modifier ce flux. RC1 reste à 0/38 et la
Phase 9 reste inactive.
