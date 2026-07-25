# Audit de clôture Nutrition read-only

> Audit exécuté le 24 juillet 2026 sur `8e5dd4a`. Il couvre les accès
> exécutables à `meal_plans`, `client_meal_plans`, `daily_food_logs`,
> `meal_tracking`, `saved_meals`, les objectifs Nutrition de `profiles`, ainsi
> que les vues/RPC qui transportent ces données. Les écritures sont seulement
> inventoriées ; elles ne sont ni migrées ni modifiées.

## Verdict

Le domaine Nutrition read-only est **clôturable**.

Les lectures de plans sont clôturables : elles passent par les readers
spécialisés déjà validés, ou sont des écritures hors périmètre. Les dix
consommateurs initialement classés C distinguent désormais panne, inconnue,
donnée invalide et état vide selon leur contrat propre.
Le backend observé ne contient actuellement aucune macro nulle dans
`daily_food_logs`; il n'y avait donc pas de régression de données visible lors
de l'audit initial. Les types générés autorisent néanmoins
`protein/carbs/fat = null`, ce qui justifiait la dette exécutable désormais
traitée. Les deux divergences historiques de concordance sont des exceptions
métier acceptées, distinctes de cet audit; elles ne constituent pas un
consommateur C et ne bloquent plus la Phase 4.

## Catégories

- **A — raccordé à une frontière canonique : 22**
- **B — volontairement non raccordable : 7**
- **C — restant à migrer : 0**
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
| A16 | A | desktop `DesktopDashboard`, journal du jour | `daily_food_logs`, owner session | projection minimale validée; jour UTC exact; `created_at ASC`; sans limite; coll. | montage/changement owner; compteur + cleanup; panne conserve la valeur | `aggregateDesktopNutritionDay`; zéro/inconnue/invalide distincts; C03 raccordé |
| A17 | A | desktop `NutritionView`, graphe 7 jours | `daily_food_logs`, owner session | date/calories; `date >= UTC J−6`; `date ASC`; coll. sans limite | montage/changement owner ou logs du jour; compteur + cleanup; panne conserve la série | `aggregateDesktopNutritionWeek`; zéro/lacune/invalide distincts; C04 raccordé |
| A18 | A | `NutritionTab`, résumé calories/macros et objectifs | lignes A03 + profil dashboard | aucune requête propre; journal owner/jour et objectifs de la projection dashboard | chaque rendu; cycle/erreurs/obsolescence d'A03 et B04; panne conserve la valeur confirmée | `readNutritionTabSummary`; zéro/inconnue/invalide et cible absente distincts; C05 raccordé |
| A19 | A | `NutritionTab`, sous-onglet « Mes repas » | `saved_meals`, owner prop | `select('*')`; `created_at DESC`; coll. sans limite | à chaque entrée; compteur + cleanup; erreur conserve la liste du même owner | `settleSavedMealsLibraryRead`; vide/erreur/obsolète/owner distincts; C06 raccordé |
| A20 | A | badges `macros_on_target` | `profiles` + `daily_food_logs`, owner évalué | cible `single`; logs date/calories `date DESC`; `limit 200`; 1 puis 1 coll. | profil/fin de séance; sans fenêtre ni timezone; compteur owner-scoped; panne/obsolète non récompensables | `getMacrosOnTargetBadgeReader → calculateMacrosOnTargetBadge`; C07 raccordé |
| A21 | A | `generateWeeklyDiagnostic`, objectifs Nutrition | `profiles`, owner diagnostic | `select('*')`; `id`; `single`; même lecture profil partagée | génération serveur one-shot; erreur/rejet arrêtent avant IA/écritures | `resolveWeeklyDiagnosticNutritionGoals`; cible absente/invalide distincte de zéro; C08 raccordé |
| A22 | A | `useCoachAnalytics`, adhérence repas | `meal_tracking`, owners `clientIds` issus des relations actives | user/date/état; `IN clients`; `date >= J-7`; coll. sans ordre/limite | refresh coach; compteur + cleanup; panne conserve la valeur du même coach | `settleCoachMealTrackingRead → aggregateCoachMealAdherence`; vide/sans suivi distinct de 0 %; C10 raccordé |
| B01 | B | `useNutritionPlans`, repas terminés | `meal_tracking`, owner + jour | `meal_type`; jour exact; complété; `limit 50`; coll. | même cycle A04, courant; erreur explicite | état de conformité, pas contenu de plan |
| B02 | B | `checkAndUnlockBadges`, compte repas/scan | `daily_food_logs`, owner | `count exact head`; tout historique; scan ajoute `food_id not null` | à l'évaluation badge; panne devient 0 legacy | compteur gamification, aucune conversion macro |
| B03 | B | `checkAndUnlockBadges`, streak Nutrition | `daily_food_logs`, owner | `date`; `date DESC`; `limit 100`; coll. | à l'évaluation; date SQL; absence = 0 | série de dates, incompatible avec journal/Analytics |
| B04 | B | loader dashboard, objectifs UI | `profiles`, owner session | projection dashboard avec quatre objectifs; `id`; `single` | chargement + cache owner-scoped; erreur bloque/retient écran confirmé | source d'objectifs persistés, pas plan |
| B05 | B | `loadClientDetailProfile` | vue `active_related_profiles`, owner client autorisé par relation coach | projection objectifs/préférences; `id`; `ms` | chargement détail; relation active vérifiée; erreur distincte | vue d'autorisation transverse, non remplaçable par `profiles` |
| B06 | B | `POST /api/chat-ai` | `profiles`, owner authentifié | profil + quatre objectifs; `id`; `single` | une lecture par requête IA; profil absent toléré par prompt legacy | contexte IA serveur, cycle différent de l'UI |
| B07 | B | repositories Nutrition sans appel actif | `meal_plans`, `client_meal_plans`, `meal_tracking`, `saved_meals`, `meal_logs` | listes/find owner-scoped bornés et triés | aucune exécution tant qu'aucun consommateur ne les appelle | capacités réutilisables, pas des migrations à forcer |
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

« Justifiée » ne signifie pas « sémantique partagée ». Les lectures directes
restantes possèdent un owner, une fenêtre ou un contrat distinct documenté;
aucune ligne C ne reste à migrer.

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
zéro. L'OpenAPI déployée décrit les colonnes du journal du jour comme non
nullables, tandis que les types générés conservent ces trois macros
nullables; `profiles.calorie_goal/protein_goal/carbs_goal/fat_goal` et les
totaux de `saved_meals` sont eux aussi nullables.

## Conversions restantes

Aucune conversion silencieuse identifiée dans les lignes C ne reste. Les
fallbacks des lignes B portent des compteurs gamification fail-closed ou des
capacités non exécutées et restent justifiés par leur propre contrat.

Les chaînes numériques ne sont pas produites par PostgREST pour les colonnes
numériques vérifiées. Elles peuvent encore exister dans les JSON de plans et
de repas sauvegardés, déjà traités par leurs readers/snapshots. Le backend
JSON ne sérialise pas `NaN`/`Infinity`. C07 protège désormais ces
valeurs, les chaînes non numériques et les négatifs avant toute attribution.

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

Aucune migration read-only Nutrition ne reste. Les deux divergences
historiques sont acceptées sans backfill. Le chantier futur d'autorité
versionnée des totaux de plan reste distinct et ne doit pas rouvrir les
consommateurs A.

## C10 — clôturé le 25 juillet 2026

C10 utilise désormais
[`settleCoachMealTrackingRead` et `aggregateCoachMealAdherence`](NUTRITION_COACH_ANALYTICS_MEAL_ADHERENCE.md).
La requête groupée, les owners dérivés des relations actives, la projection
runtime, la borne basse inclusive, l'absence de tri/limite et le dénominateur
historique 28 sont inchangés.

Une collection vide réussie et un client sans ligne sont `no_tracking` et
affichent `—`; au moins une ligne valide `false` reste calculable et affiche
un vrai `0%`. Une panne au premier chargement est indisponible, une panne
ultérieure conserve la dernière valeur du même coach, et une réponse obsolète
est ignorée. Les autres métriques coach restent exploitables. Aucune écriture
Nutrition ou coach n'a changé.

## C08 — clôturé le 25 juillet 2026

C08 utilise désormais
[`resolveWeeklyDiagnosticNutritionGoals`](NUTRITION_WEEKLY_DIAGNOSTIC_GOALS.md)
sur la lecture `profiles.select('*').eq('id', owner).single()` déjà partagée
par le diagnostic. Les quatre objectifs sont classés indépendamment :
strictement positif connu, nullable/absent distinct, et zéro, négatif,
non-fini ou texte invalide explicitement invalides.

La cible calorique, l'écart et la conformité protéique restent identiques pour
les données valides. Une cible non calculable devient `?` dans le prompt et
`null` dans les colonnes nullable existantes; elle ne devient jamais zéro.
Glucides et lipides ne créent aucun nouveau calcul et produisent seulement un
drapeau de cohérence si leur objectif manque ou est invalide. Une erreur
Supabase ou un rejet réseau de `profiles` arrête avant l'IA et les écritures.
Le nombre de requêtes, la projection, l'owner, la fenêtre Europe/Zurich et les
blocs d'écriture sont inchangés.

## C07 — clôturé le 25 juillet 2026

C07 utilise désormais
[`getMacrosOnTargetBadgeReader` et `calculateMacrosOnTargetBadge`](NUTRITION_MACROS_ON_TARGET_BADGE.md).
Le seuil calorique historique inclusif de ±10 %, la cible de trois jours, les
deux requêtes conditionnelles, l'owner, l'ordre `date DESC`, la limite 200 et
l'absence de fenêtre/timezone sont conservés.

Une cible absente ou invalide, une consommation inconnue/invalide, une panne
Supabase, un rejet réseau et une réponse obsolète sont non calculables et ne
peuvent atteindre l'attribution du badge. Une collection vide réussie reste
un résultat calculable de zéro jour; les chaînes numériques sont additionnées
numériquement et un zéro consommé reste connu. Aucun autre badge ni aucune
écriture n'a changé.

## C06 — clôturé le 25 juillet 2026

C06 utilise désormais
[`settleSavedMealsLibraryRead`](NUTRITION_SAVED_MEALS_LIBRARY.md). Une
collection vide réussie reste `empty`; erreur Supabase, rejet réseau et
`data = null` deviennent `error`. Une erreur après une liste visible conserve
la liste du même owner. Le compteur et le cleanup ignorent les réponses
obsolètes; un changement d'owner retire immédiatement les anciennes lignes.

La lecture reste strictement identique : une requête à chaque entrée,
`select('*')`, owner `userId`, `created_at DESC`, collection sans limite. Le
sélecteur d'import A05 conserve sa projection aliasée, son état et son cycle
d'overlay indépendants. Les repas historiques et leurs alias JSON restent
pris en charge par le snapshot existant.

Toutes les écritures `saved_meals`, leurs payloads et leurs mises à jour
optimistes sont inchangés.

## C05 — clôturé le 25 juillet 2026

C05 utilise désormais
[`readNutritionTabSummary`](NUTRITION_TAB_SUMMARY.md). Les quatre métriques de
consommation et les quatre objectifs sont validés indépendamment : nombre fini
non négatif et chaîne numérique non vide connus; `null`, `undefined`, champ
absent et chaîne vide inconnus; texte non numérique, `NaN`, infini, négatif ou
type incompatible invalides. Zéro reste un zéro réel. Une métrique inconnue
ou invalide devient une lacune sans masquer les valeurs valides du même jour.

Une collection journal vide confirmée produit quatre zéros connus. Une
première erreur reste indisponible; une erreur après une valeur confirmée la
conserve. Les fallbacks d'objectifs `2000/140/200/60` sont retirés : une cible
absente affiche « Objectif à définir »/`—`, sans pourcentage ou reste inventé.

C05 n'ajoute aucune requête. Le journal conserve ses trois lectures, son
owner, sa date UTC, ses projections, son ordre, ses limites, son compteur et
son cleanup. Les objectifs conservent la lecture `profiles` déjà exécutée par
le dashboard. Aucune écriture Nutrition n'est modifiée.

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

## C03 — clôturé le 25 juillet 2026

C03 utilise désormais `aggregateDesktopNutritionDay` selon le contrat
[`NUTRITION_DESKTOP_DAY_JOURNAL.md`](NUTRITION_DESKTOP_DAY_JOURNAL.md). Un
nombre fini non négatif, y compris zéro, est connu; une chaîne numérique non
vide est convertie. `null`, `undefined`, champ absent et chaîne vide restent
inconnus. Texte non numérique, `NaN`, infini, négatif ou type incompatible
sont invalides. Une macro inconnue ou invalide ne contamine pas les autres
métriques valides de la même journée.

La lecture reste unique et owner-scoped, sur le jour UTC exact, ordonnée par
`created_at ASC`, sans limite. `select('*')` est remplacé par la projection
déployée minimale
`id,user_id,date,meal_type,custom_name,quantity_g,calories,protein,carbs,fat,created_at`.
Une collection vide confirmée conserve le journal vide historique et ses
totaux connus à zéro. Une panne conserve la dernière valeur confirmée; sans
valeur précédente, le journal affiche un état indisponible. Le compteur et le
cleanup neutralisent les réponses obsolètes.

Le graphe sept jours C04 possède désormais sa propre frontière; la requête et
le reader C03 restent inchangés. Les écritures, les surfaces Home et les
résultats rendus pour toute donnée valide restent inchangés.

## C04 — clôturé le 25 juillet 2026

C04 utilise désormais `aggregateDesktopNutritionWeek` selon le contrat
[`NUTRITION_DESKTOP_WEEK_GRAPH.md`](NUTRITION_DESKTOP_WEEK_GRAPH.md). Les sept
dates UTC J−6…J restent rendues avec leurs libellés locaux historiques. Un
zéro réel est connu; jour absent, valeur inconnue et valeur invalide deviennent
des lacunes distinctes. Plusieurs valeurs valides d'un jour sont additionnées
puis arrondies comme avant.

La requête reste unique et owner-scoped : `date, calories`,
`date >= UTC J−6`, sans borne haute, `date ASC`, sans limite. Une collection
vide confirmée produit sept lacunes. Un `error` Supabase ou un rejet réseau
conserve la dernière série visible; sans série précédente, le graphe affiche
un état indisponible. Le compteur et le cleanup ignorent les réponses
obsolètes et interdisent la conservation d'une série d'un autre owner.

C03, Home, Analytics et le diagnostic restent hors diff. Aucune écriture
Nutrition n'a été modifiée.
