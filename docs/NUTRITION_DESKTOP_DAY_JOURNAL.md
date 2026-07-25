# Journal Nutrition desktop du jour

## Périmètre C03

C03 couvre la lecture du jour partagée par la carte « Nutrition du Jour » du
dashboard desktop et le journal accordéon de `NutritionView`.

Flux :

`page-desktop → DesktopDashboard → lecture directe daily_food_logs →
readDesktopNutritionDayResponse → aggregateDesktopNutritionDay → état React
nutritionDay → DashboardView/NutritionView → anneaux, totaux et lignes`.

Il n'existe ni hook ni export. La lecture reste directe : le repository du
journal projette davantage de colonnes, impose `date DESC, created_at DESC` et
une limite, alors que C03 lit un seul jour UTC, conserve `created_at ASC` et
n'a historiquement aucune limite. Analytics travaille sur plusieurs dates et
le diagnostic sur une semaine Zurich avec moyennes; leurs contrats ne sont
pas substituables.

## Requête avant/après

| Propriété | Avant | Après |
|---|---|---|
| table | `daily_food_logs` | identique |
| owner | `user_id = session.user.id` | identique |
| date | aujourd'hui via `toISOString()` | identique |
| projection | `*` | projection minimale validée |
| ordre | `created_at ASC` | identique |
| limite | aucune | identique |
| forme | collection | identique |
| requêtes C03 | 1 | 1 |
| cadence | montage/changement d'owner | identique |
| cache/polling | état React / aucun | identique |

La projection cible est :

`id,user_id,date,meal_type,custom_name,quantity_g,calories,protein,carbs,fat,created_at`.

La vérification PostgREST déployée du 25 juillet 2026 répond en 200. OpenAPI
déclare actuellement toutes ces colonnes non nullables; les types générés
locaux conservent néanmoins `protein`, `carbs` et `fat` nullables. La frontière
traite donc les deux contrats ainsi que les formes legacy/mocks.

Le compteur `desktopNutritionRequest` et son cleanup neutralisent une réponse
d'un ancien owner. Un champ `error` Supabase ou un rejet réseau produit
`failure`; il ne devient ni `[]`, ni zéro, ni « aucun repas ».

## Agrégation et présentation

- nombre fini non négatif, zéro inclus : connu;
- chaîne numérique non vide : convertie pour compatibilité legacy;
- `null`, `undefined`, champ absent et chaîne vide : inconnu;
- chaîne non numérique, `NaN`, infini, négatif ou type incompatible :
  invalide;
- owner ou date inattendu : ligne exclue et résultat invalide, jamais journée
  vide;
- plusieurs repas : somme par métrique, avec l'arrondi final historique;
- collection vide réussie : quatre zéros connus et journal vide;
- inconnue/invalide : uniquement la métrique concernée devient `null`; les
  autres métriques du repas et de la journée restent utilisables.

Une métrique `null` est présentée par `—`. Son anneau de progression n'est pas
dessiné; le fond de jauge et toute la structure visuelle restent identiques.
Les calories/macros inconnues d'une ligne ou d'un repas sont aussi présentées
par `—`, jamais par zéro.

Au premier chargement, le journal affiche « Chargement du journal… ». Une
première panne affiche « Journal indisponible » et des métriques `—`. Après
une valeur confirmée, une panne conserve cette valeur. Une réponse obsolète
ne remplace jamais l'état courant.

## Frontière voisine

C04, la lecture hebdomadaire autonome située dans `NutritionView`, possède
désormais son contrat distinct dans
[`NUTRITION_DESKTOP_WEEK_GRAPH.md`](NUTRITION_DESKTOP_WEEK_GRAPH.md). Elle ne
réutilise pas C03 et n'en modifie ni la requête, ni le reader, ni l'état, ni le
rendu. Les objectifs, callbacks d'ajout, modales, écritures/imports, Home,
Analytics et diagnostic ne changent pas.
