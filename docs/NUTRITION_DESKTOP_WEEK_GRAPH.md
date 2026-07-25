# Graphe Nutrition desktop sur sept jours

## Périmètre C04

C04 couvre exclusivement le graphe « Calories Hebdomadaires » rendu par
`NutritionView` dans le dashboard desktop.

Flux :

`DesktopDashboard → NutritionView → lecture directe daily_food_logs →
readDesktopNutritionWeekResponse → aggregateDesktopNutritionWeek → état React
weekChartState → Recharts BarChart`.

La frontière est spécifique. `desktop-nutrition-day` contrôle un owner et un
jour avec les lignes détaillées du journal. Analytics ne synthétise pas les
jours absents et utilise une fenêtre locale plus large. Le mini-graphe Home
utilise huit jours UTC, une limite 200 et un autre cycle de refresh. Le
diagnostic agrège la semaine précédente Europe/Zurich en moyennes pour l'IA.
Aucun de ces contrats n'est équivalent à C04.

## Requête avant/après

| Propriété | Avant | Après |
|---|---|---|
| table | `daily_food_logs` | identique |
| owner | `user_id = session.user.id` | identique |
| borne de requête | `date >= J−6 UTC`, inclusive | identique |
| borne haute SQL | aucune | identique |
| fenêtre rendue | J−6…J UTC, inclusive | identique |
| projection | `date, calories` | identique, constante validée |
| ordre | `date ASC` | identique |
| limite | aucune | identique |
| forme | collection | identique |
| requêtes par exécution | 1 | 1 |
| cadence | montage de `NutritionView`, changement owner ou `todayFoodLogs` | identique |
| cache/polling | état React / aucun | identique |

La requête peut recevoir une ligne postérieure à J faute de borne haute
historique. La frontière l'exclut explicitement de la fenêtre rendue; aucune
borne SQL n'est ajoutée afin de préserver le contrat de requête.

Les clés calendaires sont calculées avec `toISOString()` : la fenêtre est UTC.
Les libellés de jours gardent le rendu historique
`toLocaleDateString('fr-FR', { weekday: 'short' })` dans le timezone du
navigateur.

La vérification read-only du 25 juillet 2026 a obtenu HTTP 200 pour
`daily_food_logs(date,calories)`. L'OpenAPI déployée décrit `date` comme
`string/date` non nullable et `calories` comme `number/numeric` non nullable;
la réponse observée contient respectivement une chaîne et un nombre.

## Agrégation

- nombre fini non négatif, zéro inclus : connu;
- chaîne numérique non vide : convertie pour compatibilité legacy/mocks;
- `null`, `undefined`, champ absent et chaîne vide : inconnu;
- chaîne non numérique, `NaN`, infini, négatif ou type incompatible :
  invalide;
- plusieurs lignes valides du même jour : addition puis arrondi final
  historique;
- jour sans ligne : point `missing` avec `calories = null`;
- une ligne inconnue ou invalide contamine uniquement son jour, qui devient
  une lacune;
- ligne hors J−6…J ou date invalide : exclue et signalée, jamais convertie en
  zéro;
- collection vide réussie : sept lacunes confirmées.

Une période complète contient sept jours connus. Une période partielle garde
les barres connues et laisse les autres emplacements sans barre. Un vrai zéro
reste un point connu à la ligne de base.

## Erreurs et concurrence

Un champ `error` Supabase ou un rejet réseau produit `failure`; il ne devient
ni collection vide ni série de zéros. Au premier chargement, le graphe affiche
« Chargement du graphique… ». Une première panne affiche « Graphique
indisponible ». Après une série confirmée, une panne conserve cette série.

`desktopNutritionWeekRequest` et le cleanup invalident toute réponse d'une
exécution précédente. Une valeur appartenant à un autre owner n'est jamais
conservée. La dépendance historique `todayFoodLogs` et la cadence de
réexécution restent inchangées.

## Périmètre préservé

C03 conserve sa projection, son reader, son état et son rendu. Home, son
mini-graphe et son résumé, Analytics, le diagnostic hebdomadaire, les
objectifs, props, callbacks, modales et toutes les écritures Nutrition restent
hors diff.
