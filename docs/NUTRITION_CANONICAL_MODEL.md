# Modèle Nutrition canonique

> Statut : proposition documentaire acceptée pour guider la Phase 4. Aucun type
> applicatif, schéma SQL ou comportement de production n'est créé par ce
> document. Le modèle est dérivé de l'[inventaire des formats existants](NUTRITION_FORMATS_INVENTORY.md).

## 1. But et frontières

Le modèle fournit un vocabulaire métier stable pour représenter aliments,
portions, recettes, repas, consommations, journées et plans. Il doit permettre
une migration progressive des formats actuels sans prétendre que leurs champs
ambigus sont équivalents.

Il ne constitue pas :

- un diagnostic médical ou une prescription clinique ;
- une autorisation d'écriture ou un remplacement de la RLS ;
- une décision sur les futures tables SQL ;
- une garantie que le schéma distant correspond aux migrations locales ;
- un moteur implicite de conversion entre masse, volume et unité.

Les principes d'ownership restent alignés avec les
[frontières Supabase](SUPABASE_REPOSITORIES.md) et la
[matrice RLS](RLS_TEST_MATRIX.md). La structure documentaire reprend la méthode
du [modèle Training](TRAINING_CANONICAL_MODEL.md), sans partager ses objets.

## 2. Vocabulaire et identités

Chaque objet persistant ou échangeable possède :

| Champ conceptuel | Règle |
|---|---|
| `id` | Identité stable, opaque, unique dans son type et jamais dérivée du nom. |
| `owner` | Autorité métier explicite : client, coach, plateforme ou aucune pour une projection externe non persistée. |
| `source` | Origine factuelle : catalogue, utilisateur, coach, IA, import, fournisseur ou legacy. |
| `formatVersion` | Version du contrat canonique ou identifiant du format legacy. |
| `createdAt` / `updatedAt` | Instants UTC lorsque l'objet est persistant. |
| `provenance` | Fournisseur, jeu de données, calcul, hypothèses et référence legacy sans donnée sensible. |
| `warnings` | Avertissements structurés produits par une conversion ; jamais des corrections silencieuses. |

Une référence legacy associe au minimum `legacyFormat`, table ou frontière
d'origine, identifiant d'origine si disponible et version connue. Un nom libre
ne devient jamais une identité catalogue.

## 3. Aliment canonique

### 3.1 `FoodCatalogEntry`

Un aliment de catalogue est une description réutilisable, distincte d'une
quantité consommée :

- `id` stable ;
- `primaryName` non vide et `aliases` localisés ou historiques ;
- `kind` : `global_catalog`, `community`, `custom`, `external_candidate` ;
- `brand` optionnelle ;
- `barcode` optionnel, accompagné de son fournisseur et sans supposer une
  unicité mondiale entre catalogues ;
- `nutritionBasis` explicite ;
- `provenance` et éventuelle version du jeu de données ;
- `verificationStatus` : `verified`, `user_declared`, `provider_reported`,
  `estimated`, `unknown` ;
- `owner` obligatoire pour un aliment personnalisé, créateur distinct de
  l'owner pour une contribution communautaire ;
- état `active`, `deprecated` ou `unknown` sans suppression de l'historique.

Les sources actuelles correspondent à `food_items`, `community_foods`,
`custom_foods`, `FITNESS_FOODS` et aux candidats Open Food Facts/photo IA. Elles
ne sont pas fusionnées sur le seul nom ou code-barres.

### 3.2 `FoodSnapshot`

Un repas, une recette ou un journal conserve un snapshot du nom, de la base et
des valeurs utilisées au moment du calcul. Une correction ultérieure du
catalogue ne réécrit pas silencieusement l'historique. Le snapshot peut
référencer un `FoodCatalogEntry`, mais reste calculable sans lui.

Un aliment libre non relié est représenté par un snapshot `unresolved_legacy` ;
il ne reçoit pas d'identifiant catalogue inventé.

## 4. Valeurs nutritionnelles

### 4.1 `NutritionBasis`

Toute densité nutritionnelle déclare exactement une base :

- `per_100_g` ;
- `per_100_ml` ;
- `per_portion`, avec définition de portion ;
- `per_unit`, avec unité nommée ;
- `unknown` uniquement pour isoler une donnée legacy non calculable.

Une densité ne contient jamais la quantité effectivement consommée. Une valeur
déjà multipliée est un `NutritionAmount`, pas une `NutritionDensity`.

### 4.2 `NutritionValues`

Le noyau comprend :

- énergie en `kcal` ;
- protéines, glucides, lipides et fibres en grammes ;
- micronutriments optionnels identifiés par un code stable, une valeur et une
  unité explicite (`mg`, `µg`, etc.) lorsqu'ils existent ;
- `precision` : précision du fournisseur ou du calcul ;
- `valueStatus` par nutriment : `known`, `estimated`, `not_provided`,
  `not_applicable`, `invalid`.

Zéro signifie une valeur connue égale à zéro. Une valeur absente reste
`not_provided` et ne devient pas zéro. Les valeurs non finies ou négatives sont
invalides, sauf convention explicitement documentée pour un futur nutriment.

### 4.3 Arrondis

- Les calculs intermédiaires conservent leur précision décimale ; aucun arrondi
  n'est appliqué aliment par aliment avant le total.
- Les valeurs persistées conservent la précision source et la règle de calcul.
- L'affichage peut arrondir les kcal à l'unité et les grammes au dixième, sans
  modifier les valeurs métier.
- Un total est arrondi une seule fois à la frontière d'affichage ou d'export.
- Une différence due à l'arrondi ne doit pas être compensée en modifiant un
  aliment ou une macro.

### 4.4 Calcul des montants et totaux

Pour une densité par 100 g :

```text
montant_nutriment = densité_nutriment × masse_g / 100
```

La même règle vaut pour 100 ml. Une portion/unité exige une conversion connue
vers sa base. Les totaux sont la somme des montants calculables. Ils exposent :

- `calculationStatus`: `complete`, `partial`, `unavailable` ;
- les éléments exclus et leur raison ;
- la date, la version de calcul et les hypothèses.

Un total partiel ne doit jamais être présenté comme complet. Les calories ne
sont pas recalculées automatiquement depuis les macros si une énergie source
existe ; un contrôle de cohérence peut signaler l'écart sans écraser la source.

Le contrôle énergétique des macronutriments utilise `4 kcal/g` pour les
protéines, `4 kcal/g` pour les glucides et `9 kcal/g` pour les lipides. La fibre
n'est pas incluse dans ce contrôle : son rendement énergétique dépend d'une
règle non définie dans le dépôt et reste donc fail-closed. La tolérance entre
énergie déclarée et énergie issue des macros est toujours fournie explicitement
par l'appelant ; aucun écart ne constitue automatiquement une corruption.

### 4.5 Concordance avec un total legacy

La comparaison conserve deux projections legacy distinctes :

- le total **observé**, qui reproduit un éventuel fallback historique vers
  zéro ;
- le total **comparable**, où tout nutriment absent reste `null`.

Seule la projection comparable participe aux différences numériques. Un zéro
explicitement fourni reste comparable ; un zéro produit parce qu'une fibre ou
une macro manque ne l'est pas. Un total déclaré différent d'une somme
canonique reste `divergent`, sans être automatiquement corrigé ni déclaré
corrompu. Les alias admis et les tolérances appartiennent à un contrat
versionné ; leur extension exige une preuve de producteur legacy.

Le [contrat de snapshot legacy](NUTRITION_LEGACY_SNAPSHOTS.md) formalise cette
provenance : valeurs calculées et déclarées restent séparées, les alias
observés sont conservés et tout conflit est fail-closed. Les formats
historiques sans version restent lisibles avec `legacy_unknown`.

## 5. Portions et unités

### 5.1 `Quantity`

Une quantité est une union explicite :

- `mass` en grammes ;
- `volume` en millilitres ;
- `unitCount` avec unité stable et nombre ;
- `namedPortion` avec identifiant/version de portion ;
- `legacyText` pour une chaîne non convertible telle que `1 grande`.

Les valeurs doivent être finies et strictement positives pour une consommation
ou un ingrédient. L'unité de stockage canonique de masse est le gramme et celle
de volume le millilitre ; l'affichage peut convertir.

### 5.2 `PortionDefinition` et conversion

Une portion nommée associe un libellé, une quantité de référence et sa source.
Une conversion masse/volume nécessite une densité spécifique à l'aliment. Une
conversion unité/masse nécessite une portion spécifique et versionnée.

En l'absence de conversion explicite :

- conserver la quantité d'origine ;
- marquer le calcul `partial` ou `unavailable` ;
- produire un warning stable ;
- ne pas employer une valeur par défaut de 100 g.

## 6. Recette

### 6.1 `Recipe`

Une recette versionnée comprend :

- identité, titre, description, catégorie et tags ;
- owner client/coach/plateforme ;
- visibilité séparée de l'ownership ;
- `ingredients`, chacun avec `FoodSnapshot` ou sous-recette et `Quantity` ;
- étapes structurées et ordonnées ;
- nombre de portions produites strictement positif ;
- temps de préparation/cuisson optionnels ;
- provenance `user`, `coach`, `ai`, `import`, `platform` ou `legacy` ;
- version, date de calcul, statut de validation et warnings.

Les nutriments totaux sont calculés depuis les ingrédients calculables, puis
divisés par le nombre de portions. Les macros persistées dans `recipes` restent
des snapshots legacy jusqu'à comparaison ; elles ne sont pas déclarées plus
fiables que les ingrédients JSON.

Les ingrédients seedés `{name, quantity: string, unit}` et ceux générés par IA
`{name, quantity_g, calories, proteins, carbs, fat}` sont deux adaptateurs
distincts.

## 7. Repas

### 7.1 `PlannedMeal`

Un repas planifié contient :

- identité stable dans la version du plan ;
- type contrôlé et libellé d'affichage distinct ;
- heure ou fenêtre locale optionnelle ;
- éléments ordonnés : aliment, recette ou alternative ;
- quantités prescrites ;
- notes et règles déclaratives ;
- totaux calculés avec leur statut.

### 7.2 `ConsumedMeal`

Un repas consommé est un fait distinct :

- owner client dérivé de la session à la frontière d'écriture ;
- date locale, timezone et instant d'enregistrement ;
- éléments effectivement consommés avec snapshots et quantités ;
- notes optionnelles et provenance (`manual`, `barcode`, `photo_estimate`,
  `planned_import`, `saved_meal`, `legacy`) ;
- référence optionnelle au repas planifié, jamais déduite seulement du type et
  de la date ;
- totaux calculés, statut de complétude et warnings.

`MealCompletion` représente le choix de marquer un repas planifié terminé. Il
n'est ni une preuve de consommation détaillée, ni un total nutritionnel.

## 8. Journée alimentaire

`FoodDay` regroupe pour un owner :

- `localDate` au format civil et timezone IANA ;
- snapshot d'objectifs applicable à cette date ;
- repas consommés ;
- références aux repas planifiés applicables ;
- totaux consommés et planifiés, séparés ;
- `completeness`: `empty`, `partial`, `declared_complete`, `unknown` ;
- sources legacy et warnings.

La date UTC du serveur ne remplace pas la date locale. Un changement de timezone
ne déplace pas rétroactivement une journée sans règle de migration explicite.

Coexistence des historiques actuels :

| Source legacy | Projection canonique | Limite conservée |
|---|---|---|
| `daily_food_logs` | éléments de `ConsumedMeal` regroupés explicitement | `food_id` ne relie qu'un catalogue ; noms libres fréquents. |
| `meal_logs` | flux consommé legacy séparé | aucun rapprochement automatique avec `daily_food_logs`. |
| `meal_tracking` | `MealCompletion` | ne crée aucun aliment consommé. |

Deux lignes aux mêmes date/type/macros ne sont jamais dédupliquées sans clé ou
preuve métier.

## 9. Plan alimentaire

Le contrat de persistance est fixé par
[l'ADR 0007](adr/0007-nutrition-plan-persistence-contract.md) : `meal_plans`
utilise exclusivement `plan` et `active`; `client_meal_plans` conserve
`client_id`/`coach_id` en SQL et recevra ultérieurement `week_start` et un
statut SQL par migration additive. Objectifs, totaux et provenance
appartiennent à `NutritionPlanEnvelopeV1` dans `plan`. Aucune identité ou
autorité RLS n'est dupliquée dans le JSON.

### 9.1 `MealPlanDefinition`

Un plan est un agrégat versionné :

- identité et `version` immuables ;
- owner créateur : client, coach ou plateforme ;
- bénéficiaire explicite et distinct du créateur ;
- objectifs nutritionnels snapshotés ;
- timezone et plage de validité ;
- jours et repas planifiés ordonnés ;
- alternatives explicites, sans remplacement implicite par nom ;
- règles et contraintes déclaratives ;
- provenance et warnings ;
- statut `draft`, `active`, `replaced`, `archived`, `unknown_legacy`.

Un plan actif ne devient pas mutable en place : une modification significative
crée une nouvelle version/snapshot et remplace l'ancienne. Une seule version
peut être active par bénéficiaire et contexte, mais cette invariant devra être
garantie transactionnellement avant d'être appliquée.

### 9.2 Affectation coach/client

`MealPlanAssignment` relie une version de plan, un client bénéficiaire et un
coach. Sa création/mutation exige une relation coach/client active vérifiée côté
serveur. Une ancienne affectation reste consultable comme historique selon la
politique autorisée, mais une relation inactive ne permet aucun nouvel acte de
gestion.

Plan personnel et plan coach sont deux sources distinctes. Leur priorité
d'affichage legacy (plan personnel préféré dans NutritionTab, plan coach seul
dans le loader dashboard) n'est pas élevée au rang d'invariant canonique.

## 10. Objectifs, préférences et contraintes

### 10.1 `NutritionTargets`

Un snapshot d'objectifs comprend kcal et macros, période de validité, source,
méthode, date de calcul et statut. Les objectifs `profiles.*_goal` actuels sont
des projections legacy. Une cible absente ne reçoit pas une valeur par défaut
dans le domaine ; les valeurs UI 2000/2200/2500 restent des fallbacks legacy.

### 10.2 `NutritionPreferences`

- régime contrôlé avec `unknown_legacy` pour les chaînes non reconnues ;
- allergies déclarées ;
- exclusions et aliments non appréciés ;
- aliments appréciés ;
- préférences par type de repas ;
- contraintes religieuses/culturelles déclarées ;
- contraintes médicales déclaratives, sans interprétation ni diagnostic.

Les synonymes (`vegetarian`/`vegetarien`, `gluten_free`/`sans_gluten`, clés de
repas FR/EN) sont traduits par adaptateur et leur valeur source est conservée.
Une préférence ne prouve pas la sécurité allergénique d'un aliment ou d'une
recette.

## 11. Ownership, autorités et accès

| Acteur | Autorité canonique |
|---|---|
| Client | Gère ses consommations, repas sauvegardés, aliments personnalisés et plans personnels selon RLS. Son identité vient de la session, jamais d'un `userId` navigateur. |
| Coach | Lit et gère seulement les plans des clients activement liés, dans les limites du contrat serveur et de la RLS. |
| Plateforme | Gère catalogues globaux, recettes publiques et règles versionnées via une frontière serveur contrôlée. |
| Service serveur | Exécute IA, imports, diagnostics et maintenance après authentification/autorisation. Le `service_role` est borné et n'est jamais exposé au navigateur. |
| Fournisseur externe | Produit des candidats et données de provenance ; il n'accorde ni ownership ni statut vérifié local. |

Le catalogue global n'est pas mutable par un utilisateur uniquement parce qu'il
est authentifié. Une contribution communautaire conserve son créateur. Les
valeurs navigateur, métadonnées IA et noms d'aliments ne constituent jamais une
preuve d'identité ou d'autorisation.

## 12. Invariants et validation

1. Toute quantité calculée connaît sa base et son unité.
2. Densité nutritionnelle et montant consommé sont deux types distincts.
3. `0` et `unknown` ne sont jamais interchangeables.
4. Un total complet ne contient aucun élément exclu ou non calculable.
5. Planifié, marqué terminé et consommé sont trois faits distincts.
6. Un snapshot historique ne change pas lors d'une mise à jour catalogue.
7. Tout objet personnel a un owner explicite dérivé d'une identité serveur.
8. Toute affectation coach exige une relation active au moment de la mutation.
9. Une conversion impossible échoue ou reste isolée ; elle ne choisit pas 100 g
   ni une densité moyenne par défaut.
10. Un format inconnu ne devient pas un objet canonique valide.
11. Une sortie IA/photo/fournisseur reste `estimated` ou `provider_reported`
    tant qu'elle n'est pas validée selon une règle explicite.
12. Les allergies et contraintes médicales restent déclaratives ; le système ne
    promet pas l'absence d'allergène par simple correspondance textuelle.
13. Les entrées et snapshots ne sont pas mutés par les adaptateurs ou calculs.
14. Les erreurs et warnings sont structurés, bornés et sans payload personnel.

La validation produit un résultat discriminé : `valid`, `invalid` ou
`unsupported_legacy`. Les erreurs ont un code stable, un chemin et une raison
expurgée. `partial` décrit un calcul incomplet, pas un objet structurellement
invalide.

## 13. États inconnus et politique fail-closed

Les valeurs suivantes restent isolées : unité inconnue, base inconnue, owner
absent, aliment non résolu, timezone absente, version de plan inconnue et JSON
malformé. Elles peuvent être affichées comme données legacy avec avertissement,
mais ne peuvent pas :

- alimenter un total déclaré complet ;
- être sauvegardées comme nouveau format canonique ;
- déclencher une conversion, une affectation ou une autorisation ;
- écraser une donnée source.

## 14. Traçabilité et versionnement

`formatVersion` versionne la structure ; `calculationVersion` versionne les
règles de calcul ; `sourceVersion` identifie si possible le catalogue ou le
fournisseur. Une évolution additive compatible conserve la version majeure ;
une modification sémantique crée une nouvelle version et un adaptateur.

Chaque calcul ou conversion conserve : instant, source, hypothèses, éléments
exclus, version, format legacy et warnings. Les prompts, images, profils complets
et payloads fournisseur ne sont pas stockés dans cette traçabilité.

## 15. Événements métier proposés

Ces événements décrivent de futures frontières et ne sont pas implémentés :

- `FoodCatalogEntryRegistered` / `FoodCatalogEntryVerified` ;
- `RecipeVersionCreated` ;
- `MealPlanDrafted`, `MealPlanActivated`, `MealPlanReplaced`,
  `MealPlanArchived` ;
- `MealPlanAssignedToClient` ;
- `ConsumedMealRecorded`, `ConsumedMealCorrected` ;
- `MealCompletionMarked` ;
- `NutritionTargetsChanged` ;
- `NutritionCalculationFlaggedPartial` ;
- `LegacyNutritionConversionRejected`.

Ils devront être idempotents et ne remplaceront pas les transactions nécessaires
aux écritures multi-tables.

## 16. Adaptateurs legacy attendus

| Adaptateur | Entrée | Sortie / règle |
|---|---|---|
| Plan personnel | `meal_plans.plan_data/is_active` ou `plan/active` | lire les deux formes ; écrire à terme uniquement `plan/active` selon l'ADR 0007. |
| Plan coach | `client_meal_plans.plan` et cibles runtime | enveloppe dans `plan`; affectation SQL séparée ; objectifs avec provenance dans le JSON. |
| Jour IA français | `repas`, `aliment`, `quantite_g`, macros FR | journée planifiée ; refuser les repas/aliments non structurés. |
| Jour `lib/meal-plan` | `meals`, `totals`, macros abrégées | snapshot planifié ; comparer les totaux, ne pas leur faire confiance implicitement. |
| Template textuel | `qty: "60g"`, `1 grande` | quantité si parsable, sinon `legacyText` non calculable. |
| Journal principal | `daily_food_logs` | éléments consommés avec snapshot ; préserver `food_id/custom_name`. |
| Journal secondaire | `meal_logs` | flux consommé legacy distinct, sans déduplication. |
| Complétion | `meal_tracking` avec `completed` ou champs runtime | `MealCompletion`, jamais un repas consommé. |
| Repas sauvegardé | `saved_meals.foods` et synonymes macro/quantité | repas réutilisable ; signaler totaux divergents. |
| Catalogues | `food_items`, `community_foods`, `custom_foods`, `FITNESS_FOODS` | projections distinctes vers `FoodCatalogEntry`, provenance conservée. |
| Recettes | seed SQL et sortie IA | versions de recette distinctes, ingrédients non résolus isolés. |
| Fournisseurs | Open Food Facts et analyse photo | candidat externe estimé, jamais catalogue vérifié automatiquement. |
| Préférences | `profiles.meal_preferences`, arrays et clés FR/EN | préférences structurées, champ source conservé. |

## 17. Migration progressive

1. Ajouter d'abord des tests documentaires et d'invariants pour unités, calculs,
   arrondis et séparation planifié/consommé.
2. Créer des types purs et validateurs sans dépendance Supabase/React.
3. Implémenter les adaptateurs read-only avec fixtures synthétiques ; aucune
   écriture canonique à ce stade.
4. Créer des repositories projetant explicitement les formats actuels, sans
   `select('*')` et sans masquer les colonnes divergentes.
5. Comparer en lecture les totaux legacy et canoniques, journaliser uniquement
   des codes/warnings expurgés.
6. Définir ensuite le schéma SQL, les contraintes, transactions et RLS dans une
   tranche dédiée, après vérification du schéma réellement déployé.
7. Faire une double lecture contrôlée puis une double écriture seulement si une
   stratégie de réconciliation et rollback existe.
8. Migrer progressivement NutritionTab, coach, diagnostics et IA ; conserver
   les snapshots legacy jusqu'à preuve de conversion.
9. Retirer un format uniquement après inventaire des lignes restantes,
   comparaison déterministe et validation E2E locale.

## 18. Divergences laissées ouvertes

Le modèle ne choisit volontairement pas :

- entre `meal_plans.plan/active` et `plan_data/is_active` ;
- les colonnes runtime exactes de `client_meal_plans`, `meal_tracking`,
  `saved_meals`, `food_items` et `custom_foods` ;
- la priorité future entre plan personnel et plan coach ;
- une fusion de `daily_food_logs`, `meal_logs` et `meal_tracking` ;
- une équivalence automatique entre catalogues ou noms d'aliments ;
- une conversion de `piece`, `gousse`, `pincee`, `1 grande` ou cru/cuit ;
- une source de vérité entre macros persistées et recalculées ;
- la table fantôme `nutrition` référencée uniquement par la suppression de
  compte ;
- le renforcement RLS, l'admin recettes legacy, la transactionnalité ou
  l'idempotence.

Ces décisions nécessitent vérification du schéma déployé, données représentatives
expurgées et tests dédiés. Les résoudre aujourd'hui par hypothèse risquerait de
corrompre les plans, journaux ou totaux historiques.
