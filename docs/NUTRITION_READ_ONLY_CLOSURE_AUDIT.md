# Audit de clôture Nutrition read-only

> Audit exécuté le 24 juillet 2026 sur `8e5dd4a`. Il couvre les accès
> exécutables à `meal_plans`, `client_meal_plans`, `daily_food_logs`,
> `meal_tracking`, `saved_meals`, les objectifs Nutrition de `profiles`, ainsi
> que les vues/RPC qui transportent ces données. Les écritures sont seulement
> inventoriées ; elles ne sont ni migrées ni modifiées.

## Verdict

Le domaine Nutrition read-only **n'est pas encore clôturable**.

Les lectures de plans sont clôturables : elles passent par les readers
spécialisés déjà validés, ou sont des écritures hors périmètre. En revanche,
sept consommateurs read-only conservent une sémantique legacy qui peut
transformer une panne, une inconnue ou une donnée nullable en zéro/absence.
Le backend observé ne contient actuellement aucune macro nulle dans
`daily_food_logs`; il n'y a donc pas de régression de données visible à
corriger pendant cet audit. Le contrat déployé autorise néanmoins
`protein/carbs/fat = null`, ce qui rend la dette exécutable et empêche une
clôture honnête.

## Catégories

- **A — raccordé à une frontière canonique : 15**
- **B — volontairement non raccordable : 7**
- **C — restant à migrer : 7**
- **D — écriture/producteur hors périmètre : 6**
- **E — faux positif, capacité inutilisée ou documentation/test : 5**
- **Total : 40 lignes**

Une ligne représente un consommateur logique et non chaque occurrence
textuelle. Une même ligne peut donc couvrir les deux requêtes indissociables
d'un hook, mais jamais deux cycles de fraîcheur différents.

## Matrice exhaustive

Abréviations : `coll.` = collection, `ms` = `maybeSingle`, `R` = repository,
`PR` = `createActivePersonalMealPlanReader`, `CR` =
`createClientDetailAssignedPlanReader`, `HE` =
`readHomeNutritionSummary`, `WA` =
`aggregateWeeklyDiagnosticNutrition`. « Courant » signifie compteur de
requête/cleanup neutralisant les réponses obsolètes.

| ID | Cat. | Fichier, fonction/surface | Source et owner | Projection, filtres, ordre, limite, forme | Date, fraîcheur, erreurs | Format/frontière et statut |
|---|---|---|---|---|---|---|
| A01 | A | `HomeTab`, résumé Énergie/Nutrition | `meal_plans`, `user_id = session.user.id` | projection aliasée R; `is_active=true`; `created_at DESC`; `limit 1`; `ms` | UTC jour courant; montage/retour Home; courant; erreur conserve la valeur | `R → PR → HE`; canonical/legacy contrôlés; raccordé |
| A02 | A | `HomeTab`, résumé consommé | `meal_tracking` + `daily_food_logs`, même owner | `meal_type`, `calories`; égalité jour; limites 20; coll. | même cycle A01; courant; invalidité numérique fail-closed dans HE | HE spécialisé; non réutilisable par Analytics |
| A03 | A | `useNutritionJournal.reload` | `daily_food_logs`, owner prop | projection journal; jour sélectionné, `created_at ASC`; plus dates `>= J-30`; coll.; sans limite journal | recharge jour/user; courant + cleanup; erreur explicite, valeur précédente conservée | hook journal spécialisé; pas une enveloppe de plan |
| A04 | A | `useNutritionPlans.reload` | `meal_plans`, owner prop | projection R; actif; `created_at DESC`; `limit 1`; `ms` | jour/user; courant + cleanup; absent distinct d'erreur | `R → PR`; canonical/legacy contrôlés |
| A05 | A | `NutritionTab.openSavedMealSelection` | `saved_meals`, `user_id` | projection aliasée `SAVED_MEAL_PROJECTION`; `created_at DESC`; coll. | à l'ouverture; compteur obsolète; erreur visible | snapshot/selection purs déjà raccordés |
| A06 | A | `loadClientDetailNutrition`, plan assigné | `client_meal_plans`, coach + client | cibles + plan; deux owners; `created_at DESC`; `limit 1`; `ms` | chargement détail; erreurs expurgées en indisponible | `R → CR`; canonical/legacy contrôlés |
| A07 | A | `loadClientDetailNutrition`, plan personnel | `meal_plans`, owner client | même contrat que A01 | même chargement parallèle; erreur globale expurgée | `R → PR`; fallback personnel volontaire |
| A08 | A | `loadClientDetailNutrition` / `loadClientDetailWeeklyTracking` | `meal_tracking`, owner client | date/type/état; `date >= lundi`; complété; `limit 200`; coll. | lundi local UI; chargement puis changement de semaine; erreur indisponible | frontière détail client, sémantique distincte |
| A09 | A | `useInitialGeneration`, contrôle d'existence | `meal_plans`, owner client | projection R; actif; sans ordre; `limit 1`; coll. | une fois par montage/flag; cleanup rendu; panne déclenche fallback historique | `R → PR → contrôle pur`; contrat particulier préservé |
| A10 | A | `createNutritionMeasurementsLoader`, plan coach | `client_meal_plans`, owner client | projection déployée plan; `created_at DESC`; `limit 1`; `ms` | chargement dashboard/cache owner-scoped; erreurs et absence distinctes | `readLatestCoachMealPlan`; canonical/legacy contrôlés |
| A11 | A | `generateWeeklyDiagnostic`, consommation | `daily_food_logs`, owner diagnostic | date + 4 macros; semaine `[lundi,lundi)`; coll.; sans ordre/limite | semaine précédente complète Europe/Zurich; requête serveur; erreurs/inconnues traitées par métrique | `WA`; zéro/inconnue/invalide distincts |
| A12 | A | `RecipesSection/useNutritionRecipes` | `recipes`, owner + public | projection R; owner ou `is_public`; `created_at DESC`; `limit 50`; coll. | montage/retry; courant + cleanup; erreur explicite | repository Nutrition; hors enveloppe de plan |
| A13 | A | `useAnalytics/createAnalyticsReadModel` | `daily_food_logs`, owner | projection journal; `date >= J-7 local`; `date DESC, created_at DESC`; `limit 100`; coll. | refresh Analytics; compteur courant; erreur conserve la série visible | `aggregateAnalyticsNutritionByDate`; sommes journalières null-aware; C02 raccordé |
| A14 | A | `HomeTab`, mini-graphe calories | `daily_food_logs`, owner session | calories/date; `date >= UTC J-7`; sans ordre; `limit 200`; coll. | montage/retour Home; compteur + cleanup; panne conserve la série | `aggregateHomeCalorieMiniGraph`; zéro/absence/invalide distincts; C01 raccordé |
| A15 | A | `HomeTab`, transport du résumé consommé | `meal_tracking` + `daily_food_logs`, même owner qu'A02 | projections/filtres/limites A02; 2 coll. dans les 3 lectures Home | UTC aujourd'hui; montage/retour Home; compteur + cleanup; pannes sourcées | `classifyHomeNutritionCollectionRead → readHomeNutritionSummaryFromReads`; C09 raccordé |
| B01 | B | `useNutritionPlans`, repas terminés | `meal_tracking`, owner + jour | `meal_type`; jour exact; complété; `limit 50`; coll. | même cycle A04, courant; erreur explicite | état de conformité, pas contenu de plan |
| B02 | B | `checkAndUnlockBadges`, compte repas/scan | `daily_food_logs`, owner | `count exact head`; tout historique; scan ajoute `food_id not null` | à l'évaluation badge; panne devient 0 legacy | compteur gamification, aucune conversion macro |
| B03 | B | `checkAndUnlockBadges`, streak Nutrition | `daily_food_logs`, owner | `date`; `date DESC`; `limit 100`; coll. | à l'évaluation; date SQL; absence = 0 | série de dates, incompatible avec journal/Analytics |
| B04 | B | loader dashboard, objectifs UI | `profiles`, owner session | projection dashboard avec quatre objectifs; `id`; `single` | chargement + cache owner-scoped; erreur bloque/retient écran confirmé | source d'objectifs persistés, pas plan |
| B05 | B | `loadClientDetailProfile` | vue `active_related_profiles`, owner client autorisé par relation coach | projection objectifs/préférences; `id`; `ms` | chargement détail; relation active vérifiée; erreur distincte | vue d'autorisation transverse, non remplaçable par `profiles` |
| B06 | B | `POST /api/chat-ai` | `profiles`, owner authentifié | profil + quatre objectifs; `id`; `single` | une lecture par requête IA; profil absent toléré par prompt legacy | contexte IA serveur, cycle différent de l'UI |
| B07 | B | repositories Nutrition sans appel actif | `meal_plans`, `client_meal_plans`, `meal_tracking`, `saved_meals`, `meal_logs` | listes/find owner-scoped bornés et triés | aucune exécution tant qu'aucun consommateur ne les appelle | capacités réutilisables, pas des migrations à forcer |
| C03 | C | desktop `DesktopDashboard` journal du jour | `daily_food_logs`, owner session | `select('*')`; jour UTC exact; `created_at ASC`; coll. | montage desktop; aucun cleanup; erreur conserve/masque état | quatre sommes `|| 0`; projection large non canonique |
| C04 | C | desktop `NutritionView`, graphe 7 jours | `daily_food_logs`, owner session | date/calories; `date >= J-6`; `date ASC`; coll. sans limite | effet dépend aussi des logs du jour; erreur devient sept zéros | `data || []`, `r.calories || 0`, jour absent = 0 |
| C05 | C | `NutritionTab.getDailyLogsMacros` et objectifs | lignes A03 + profil dashboard | aucune requête propre; macros lues du journal; objectifs profil | chaque rendu; journal distingue l'erreur mais rendu additionne null à 0 | macros `|| 0`; objectifs absents deviennent 2000/140/200/60 |
| C06 | C | `NutritionTab`, sous-onglet « Mes repas » | `saved_meals`, owner | `select('*')`; `created_at DESC`; coll. sans limite | à l'ouverture du sous-onglet; aucun compteur/cleanup | erreur Supabase transformée en liste vide, doublon sémantique de A05 |
| C07 | C | badges `macros_on_target` | `profiles` + `daily_food_logs`, owner | objectif `single`; logs date/calories `date DESC limit 200` | évaluation badge; erreurs non distinguées | objectif absent/panne et logs absents/panne deviennent 0 |
| C08 | C | diagnostic, objectifs | `profiles`, owner diagnostic | `select('*')`; `id`; `single` | même requête serveur que A11; profil absent échoue | `Number(profile.*_goal || 0)` transforme objectif nullable en zéro |
| C10 | C | `useCoachAnalytics`, adhérence repas | `meal_tracking`, owners `clientIds` issus des relations | user/date/état; `IN clients`; `date >= J-7`; coll. sans limite | refresh coach; aucun compteur; erreur ignorée | panne devient 0 repas et 0 % d'adhérence pour tous |
| D01 | D | génération initiale, préférences, détail diagnostic, IA coach | `meal_plans` | `update is_active` puis `insert` legacy | déclenchements explicites | producteurs/écritures figés |
| D02 | D | détail client, onboarding photo, AbsCalculator | `client_meal_plans` | insert/update/upsert; parfois `.select('id')` après mutation | actions coach/onboarding | écriture; le `select` de retour n'est pas une lecture autonome |
| D03 | D | journal, photo, import, copie, FoodSearch, scanner | `daily_food_logs` | insert/update/delete multiples | mutations utilisateur | payloads hors périmètre |
| D04 | D | `useNutritionPlans.toggleMeal` | `meal_tracking` | upsert owner/jour/type | mutation optimiste | hors périmètre |
| D05 | D | création/édition/suppression « Mes repas » | `saved_meals` | insert/update/delete | mutations utilisateur | hors périmètre |
| D06 | D | profil, diagnostic appliqué, détail client | `profiles` / RPC `update_active_client_profile` | update/RPC objectifs | mutations explicites | aucune RPC Nutrition read-only trouvée |
| E01 | E | `tests/**`, fixtures et gardes statiques | toutes | chaînes et doubles | jamais en production | faux positifs de recherche |
| E02 | E | `docs/**` et archives | toutes | exemples/contrats | jamais exécutés | documentation uniquement |
| E03 | E | `lib/profile-service.getProfile` | `profiles` | `select('*')`, cache 60 s | aucun appel runtime trouvé | capacité morte, pas consommateur |
| E04 | E | `/api/generate-recipe` | profil reçu dans le body | aucune lecture Supabase de profil | par requête IA | donnée cliente, pas accès read-only DB |
| E05 | E | `increment_scan_count`, `update_active_client_profile`, suppression compte | RPC Nutrition adjacentes | mutations uniquement | actions explicites | aucune vue/RPC de calcul Nutrition read-only |

## Lectures directes justifiées

Les accès directs suivants ne doivent pas être raccordés à
`NutritionPlanEnvelopeV1`, car ils ne lisent pas un document de plan :

- journal sélectionné et calendrier de `useNutritionJournal`;
- complétions du jour dans `useNutritionPlans`;
- suivi hebdomadaire du détail client;
- compteurs et dates de badges;
- suivi des repas dans les analytics coach;
- objectifs de `profiles` et de `active_related_profiles`;
- consommation spécialisée du diagnostic hebdomadaire.

« Justifiée » ne signifie pas « sans dette ». Les sept lignes C restantes
restent directes ou
legacy pour une raison fonctionnelle identifiable, mais doivent recevoir une
sémantique explicite avant clôture.

## Schéma runtime vérifié

La vérification distante read-only a exécuté les projections suivantes avec
succès sur le backend déployé :

- `daily_food_logs(date,calories,protein,carbs,fat)`;
- `meal_tracking(user_id,date,meal_type,is_completed)`;
- `saved_meals(id,user_id,name,meal_type,foods,total_calories,total_proteins,total_carbs,total_fats,created_at)`;
- `meal_plans(id,user_id,created_by,plan_data,is_active,created_at)`;
- `client_meal_plans(id,client_id,coach_id,calorie_target,protein_target,carb_target,fat_target,plan,created_at,updated_at)`;
- `profiles(id,calorie_goal,protein_goal,carbs_goal,fat_goal)`.

Les alias/colonnes runtime `plan_data`, `is_active`, `is_completed`,
`total_proteins`, `total_fats` et les quatre cibles coach existent donc bien,
même lorsqu'ils divergent des types générés. Aucune nouvelle projection n'a
été introduite.

Sur les données déployées observées, les comptages globaux
`daily_food_logs.protein IS NULL`, `carbs IS NULL` et `fat IS NULL` valent
tous zéro. Les types générés conservent néanmoins ces trois colonnes
nullables; `profiles.calorie_goal/protein_goal/carbs_goal/fat_goal` et les
totaux de `saved_meals` sont eux aussi nullables.

## Conversions restantes

| Conversion | Emplacements | Conséquence |
|---|---|---|
| `x || 0` sur macros nullables | C03, C05 | inconnue assimilée à consommation nulle |
| `data || []` / `data ?? []` sans tester `error` | C04, C06, C10 | panne assimilée à absence ou série nulle |
| objectif nullable `|| 0` | C07, C08 | cible inconnue assimilée à cible nulle |
| objectifs UI codés en fallback | C05 | absence de profil affichée comme objectifs plausibles |
| jour manquant rempli à zéro | C04 | absence de journal indiscernable d'un vrai zéro |

Les chaînes numériques ne sont pas produites par PostgREST pour les colonnes
numériques vérifiées. Elles peuvent encore exister dans les JSON de plans et
de repas sauvegardés, déjà traités par leurs readers/snapshots. `NaN`,
`Infinity` et les négatifs ne sont pas validés dans C03–C05/C07; le backend
JSON ne sérialise pas `NaN`/`Infinity`, mais les valeurs négatives restent un
cas de contrat non protégé.

## Garde statique

`tests/unit/nutrition-read-only-closure-static.test.ts` reconstruit
l'inventaire des lectures exécutables dans `app/` et `lib/` :

- toute nouvelle lecture personnelle de plan hors repository fait échouer la
  garde;
- les deux seuls lecteurs déployés de `client_meal_plans` restent explicites;
- les fichiers qui lisent journal, suivi et repas sauvegardés sont inventoriés;
- un `.select()` de retour après mutation n'est pas compté comme consommateur.

La garde ne fige ni projection, ni ordre, ni limite des lectures non-plan :
ces contrats restent couverts par leurs tests métier existants.

## Ordre de traitement restant

1. C03 dashboard desktop : distinguer les inconnues des zéros dans le journal
   du jour sans toucher à C04.
2. C04 dashboard desktop : retirer les doubles lectures ou aligner leur
   sémantique sans changer le nombre global de requêtes sans justification.
3. C05/C06 NutritionTab : distinguer macros/repas absents des pannes et retirer
   les objectifs plausibles inventés.
4. C07 badges, C08 diagnostic objectifs et C10 coach analytics : rendre les
   pannes/inconnues non récompensables et non interprétables comme zéro.

Chaque étape nécessite sa propre caractérisation avant modification. Aucune
écriture Nutrition ne doit être incluse.

## C02 — clôturé le 25 juillet 2026

C02 utilise désormais `aggregateAnalyticsNutritionByDate`. Un nombre fini
non négatif, y compris zéro, est connu; une chaîne numérique non vide est
convertie; `null`, `undefined`, champ absent et chaîne vide restent inconnus;
texte non numérique, `NaN`, infini, négatif ou type incompatible sont
invalides. Une inconnue/invalide rend seulement cette métrique du jour
`null`; les autres métriques valides du même jour restent additionnées.

Les jours sans ligne ne sont pas synthétisés. Analytics ne calcule aucune
moyenne Nutrition : il n'existe donc aucun dénominateur journalier à modifier.
Les graphiques présentent une lacune pour la métrique inconnue et le CSV une
cellule vide, jamais un faux zéro. Une erreur Supabase conserve la série
visible précédente; une collection vide confirmée la remplace par `[]`; le
coordinateur existant continue d'ignorer les réponses obsolètes.

La requête reste une lecture owner-scoped unique, projection journal,
`date >= date locale J-7`, ordre `date DESC, created_at DESC`, `limit 100`.
Le helper du diagnostic hebdomadaire n'est pas réutilisé : il travaille sur
la semaine précédente complète Europe/Zurich, produit des moyennes par
métrique pour l'IA et possède une gestion différente des jours absents.

## C01 — clôturé le 25 juillet 2026

C01 utilise désormais `aggregateHomeCalorieMiniGraph`. Le contrat
[`NUTRITION_HOME_CALORIE_MINI_GRAPH.md`](NUTRITION_HOME_CALORIE_MINI_GRAPH.md)
distingue valeur connue, inconnue, invalide et jour absent. Un vrai zéro reste
un point connu; une inconnue ou un jour absent coupe la sparkline; une ligne
invalide est ignorée sans contaminer une autre valeur valide du jour.

La requête reste directe, unique et owner-scoped : `calories,date`,
`date >= UTC J-7`, sans ordre, `limit 200`. Une collection vide confirmée
produit huit lacunes J−7…J. Une erreur Supabase conserve la série visible et
le compteur avec cleanup neutralise une réponse obsolète. Le résumé Home
A01/A02, ses trois requêtes, `EnergyCard` hors sparkline et `NutritionCard`
restent inchangés.

## C09 — clôturé le 25 juillet 2026

C09 utilise désormais `classifyHomeNutritionCollectionRead` et
`readHomeNutritionSummaryFromReads`. Les deux réponses directes du résumé
Home distinguent une réussite vide d'un `error` Supabase ou d'un rejet réseau.
Un échec produit un `failure` expurgé avec la source `meal_tracking`,
`daily_food_logs` ou les deux; `settleHomeNutritionSummary` conserve alors la
valeur visible. Une réponse obsolète reste neutralisée avant le calcul.

Les trois lectures, leur ordre de démarrage, owner, projections, jour UTC,
filtres, limites, `Promise.all`, `homeRefreshKey`, compteur et cleanup sont
inchangés. Si les deux collections réussissent, la frontière délègue les
données telles quelles à `readHomeNutritionSummary`; son calcul n'a pas été
modifié. Le mini-graphe C01, `EnergyCard` et `NutritionCard` restent hors diff.
