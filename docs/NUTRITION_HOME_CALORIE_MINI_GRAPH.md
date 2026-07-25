# Mini-graphe calories de Home

## Périmètre

C01 couvre uniquement la sparkline `weekData` interne à `EnergyCard`. Le
résumé journalier Home (`consumedKcal`, objectif et macros de
`NutritionCard`) appartient aux consommateurs A01/A02 et n'est pas modifié.

Le flux réel est :

`HomeTab → effet mini analytics → lecture directe daily_food_logs →
aggregateHomeCalorieMiniGraph → état caloriesWeekData → EnergyCard →
sparkline SVG`.

Il n'existe ni hook ni repository intermédiaire. La lecture directe reste
justifiée : le repository journal projette toutes les colonnes, impose deux
tris et un autre contrat de limite, tandis que le mini-graphe lit seulement
`calories,date`, sans ordre, avec sa fraîcheur de retour Home.

## Contrat de lecture inchangé

| Propriété | Avant | Après |
|---|---|---|
| table | `daily_food_logs` | identique |
| owner | `user_id = session.user.id` | identique |
| projection | `calories, date` | identique |
| fenêtre | `date >= UTC J-7` | identique |
| borne haute SQL | aucune | identique |
| ordre | aucun | identique |
| limite | 200 | identique |
| forme | collection | identique |
| requêtes C01 | 1 | 1 |
| refresh | montage + `homeRefreshKey` | identique |
| cache/polling | état React local / aucun | identique |

Le seuil J−7 et la date courante sont calculés avec `toISOString()`, comme
avant. Le helper matérialise les huit dates inclusives J−7…J pour montrer les
jours sans ligne comme des lacunes; une éventuelle ligne future retournée par
l'absence historique de borne haute est ignorée.

Le schéma PostgREST déployé a été vérifié en lecture seule le 25 juillet 2026 :
`date` est un `date` non nullable, `calories` un `numeric` non nullable, la
projection répond en 200 et les lignes observées sont `string/number`.

## Sémantique

- nombre fini non négatif et chaîne numérique non vide : valeur connue;
- zéro : valeur connue et point visible;
- `null`, `undefined`, champ absent ou chaîne vide : inconnue, donc lacune;
- texte non numérique, `NaN`, infini, négatif ou type incompatible : ligne
  invalide ignorée;
- aucune ligne pour une date : lacune `missing`;
- collection vide confirmée : huit lacunes;
- erreur Supabase : série visible précédente conservée;
- réponse obsolète après changement d'owner/retour Home : ignorée par compteur
  et cleanup.

Une ligne invalide n'empêche pas une autre ligne valide du même jour de
contribuer. En revanche, une ligne inconnue rend le total quotidien inconnu :
un total partiel ne doit pas être présenté comme total complet.

`EnergyCard` conserve ses trois props et son rendu circulaire. La valeur
`calories` de `weekData` accepte désormais `null` afin de couper la polyline
sans inventer un zéro. Les suites de points connus gardent le tracé
historique; une valeur connue isolée, y compris zéro, est rendue par un point.

## Frontières non réutilisées

- `aggregateAnalyticsNutritionByDate` travaille sur quatre métriques, une
  fenêtre locale et ne synthétise pas les jours absents;
- `aggregateWeeklyDiagnosticNutrition` travaille sur la semaine précédente
  complète Europe/Zurich et produit des moyennes pour l'IA;
- `readHomeNutritionSummary` travaille uniquement sur le jour courant avec
  plan, complétions et logs.

Le helper C01 est donc spécifique et pur. Il n'ajoute aucune requête, aucun
cache, aucune écriture et aucune dépendance à `NutritionPlanEnvelopeV1`.
