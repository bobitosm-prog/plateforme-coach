# Sections de `NutritionTab`

## Périmètre

`NutritionTab` reste l'orchestrateur du domaine Nutrition côté client. Il
compose les hooks spécialisés, conserve les mutations historiques et transmet
aux sections extraites uniquement des données typées, des états et des
callbacks. Cette extraction ne change ni les lectures et écritures distantes,
ni les formats legacy, ni les calculs affichés.

## Sections extraites

### Calendrier du journal

`NutritionCalendarSection` rend la navigation par date, le marqueur des jours
contenant des repas et le contexte passé/futur. La date sélectionnée et la
décision de navigation restent pilotées par `NutritionTab`.

### Synthèse calories, eau et macros

`NutritionSummarySection` reçoit les consommations, objectifs, volume d'eau et
callbacks d'ajout. Elle conserve les deux anneaux, les trois jauges de macros et
les libellés français. Les valeurs sont transmises telles quelles : un zéro
explicite reste affiché comme zéro et n'est pas remplacé par une valeur absente.

### Plans alimentaires

`NutritionPlanSection` représente les quatre états mutuellement exclusifs
réellement présents : chargement, absence, plan personnel et plan coach. La
priorité historique du plan personnel est conservée lorsque les deux vues sont
disponibles. Les composants métier existants restent fournis par l'orchestrateur
et les autorités plan personnel/plan coach ne sont pas fusionnées.

### Repas sauvegardés

`NutritionSavedMealsSection` rend recherche, filtres, état vide, cartes,
confirmation de suppression et création. Elle reçoit une projection typée des
repas et aliments ainsi que les callbacks existants. Les lectures et mutations
restent dans les frontières historiques ; la section ne crée aucun client et
n'effectue aucun accès Supabase.

## Frontières et garanties

- Aucun composant extrait n'importe Supabase, un repository, `service_role` ou
  une frontière applicative de mutation.
- Les composants n'exécutent ni effet ni requête ; ils rendent leurs props et
  appellent les callbacks fournis.
- Le journal quotidien, l'eau, les plans et les repas sauvegardés conservent
  leurs formes, ordre, limites, états vide/chargement et textes actuels.
- `daily_food_logs`, `meal_logs` et `meal_tracking` restent des historiques
  distincts.
- Les modales photo, édition, courses, sauvegarde et copie restent coordonnées
  par `NutritionTab`.

## Limites et suite

La façade est désormais sous 500 lignes. Trois frontières complètent les quatre
sections initiales :

- `NutritionJournalMealsSection` rend les cartes de repas, quantités, menus et
  actions à partir de données et callbacks typés ;
- `NutritionPlanContent` partage la composition des plans personnels et coach
  tout en conservant leurs sources et leur priorité distinctes ;
- `NutritionTabOverlays` regroupe les overlays d'édition, photo, sauvegarde,
  copie et réutilisation sans accès Supabase direct.

`NutritionTab` conserve l'état React, les hooks, l'ordre historique des accès
et mutations et la préparation des callbacks. La dette restante porte surtout
sur le typage des formats legacy et les mutations inline ; leur évolution doit
rester séparée de cette extraction visuelle.

## Références

- [Hooks Nutrition](NUTRITION_DOMAIN_HOOKS.md)
- [Inventaire des formats](NUTRITION_FORMATS_INVENTORY.md)
- [Modèle canonique](NUTRITION_CANONICAL_MODEL.md)
