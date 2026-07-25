# Badge Nutrition `macros_on_target`

> Statut : C07 raccordé le 25 juillet 2026. La correction porte uniquement
> sur les deux lectures et le calcul read-only qui décident si ce badge est
> calculable. Les autres badges et toutes les écritures restent inchangés.

## Flux réel

Le contrôle possède deux déclencheurs :

```text
ProfileTab, au montage/changement de session.user.id
  → snapshot user_badges
  → checkAndUnlockBadges
  → getConditionValue('macros_on_target')
  → getMacrosOnTargetBadgeReader
       ├─ profiles(calorie_goal)
       └─ daily_food_logs(date, calories)
  → calculateMacrosOnTargetBadge
  → currentValues, puis contrôle du seuil du badge
  → état React ProfileTab
  → BadgesModal / éventuelle BadgeCelebration
```

```text
Fin de séance, après la tentative de sauvegarde des sets
  → checkAndUnlockBadges
  → même reader et même calcul
  → newlyUnlockedIds
  → chargement des badges nouvellement obtenus
  → célébration existante de fin de séance
```

Il n'existe ni polling, ni timer, ni abonnement realtime, ni cache de valeur.
Le reader conserve uniquement un numéro de requête par client Supabase et
owner afin qu'une réponse plus ancienne devienne `stale`. `ProfileTab`
exécute son contrôle à son montage; la fin de séance exécute un autre contrôle
au moment de l'action utilisateur.

## Requêtes préservées

Le nombre et les chaînes PostgREST restent identiques :

1. `profiles.select('calorie_goal').eq('id', userId).single()`;
2. si la cible historique est truthy,
   `daily_food_logs.select('date, calories').eq('user_id', userId)
   .order('date', { ascending: false }).limit(200)`.

Une cible absente, `null`, zéro, chaîne vide ou `NaN` arrête donc encore le
flux après une requête. Une cible positive valide, négative, infinie ou une
chaîne non vide exécute encore les deux lectures; la validation métier
intervient avant toute attribution. Une panne `profiles` produit une requête,
une panne `daily_food_logs` en produit deux.

Le propriétaire est toujours l'utilisateur évalué : `profiles.id = userId`
et `daily_food_logs.user_id = userId`. Il n'y a pas de filtre de date : la
fenêtre historique est constituée des 200 dernières lignes selon `date DESC`,
pas de 200 jours. Les lignes sont regroupées par la chaîne SQL `date` exacte;
aucune conversion locale/UTC n'est effectuée. Plusieurs lignes valides du
même jour sont additionnées.

## Schéma runtime

Les deux projections ont été appelées en lecture seule sur le backend
déployé le 25 juillet 2026 et répondent HTTP 200 :

- `profiles(id, calorie_goal)`;
- `daily_food_logs(user_id, date, calories)`.

Les types générés décrivent `profiles.calorie_goal` comme `number | null`.
Ils décrivent `daily_food_logs.date` comme `string`, `calories` comme
`number` et `user_id` comme `string | null`. La frontière reste défensive
face aux valeurs legacy ou aux doubles de test : champ absent, chaînes,
`NaN`, infini, négatif et owner explicite incorrect.

Aucune nouvelle projection n'a été introduite. `user_id` n'est volontairement
pas ajouté à la projection historique des logs; l'owner reste imposé par le
filtre. Le calcul refuse néanmoins un owner différent lorsqu'une ligne
injectée en fournit explicitement un.

## Cause racine

L'ancien cas `macros_on_target` ignorait les objets `error`, utilisait
`!prof?.calorie_goal`, `logs?.length`, `byDate[date] || 0` et
`log.calories || 0`. Il retournait donc le même nombre `0` pour :

- une cible absente ou nulle;
- une cible réelle à zéro;
- une panne de la lecture profil;
- une collection réellement vide;
- une panne de la lecture du journal;
- des calories nulles, absentes ou `NaN`.

Les chaînes numériques étaient concaténées au lieu d'être additionnées.
`checkAndUnlockBadges` appliquait ensuite un second
`currentValues[type] || 0`, sans pouvoir distinguer un calcul à zéro d'un
calcul impossible. Une panne pouvait ainsi être présentée comme un progrès
calculé et aucune frontière n'empêchait une donnée partielle d'être utilisée.

## Règle métier

Le nom historique parle de macros, mais le contrat déployé ne compare que la
consommation calorique journalière avec `profiles.calorie_goal`. Cette
sémantique n'est pas élargie.

- un jour correspond si
  `abs(caloriesDuJour - objectif) / objectif <= 0,10`;
- les bornes −10 % et +10 % sont inclusives;
- le badge `macros_perfect` est obtenu à partir de 3 jours correspondants;
- une cible doit être un nombre fini strictement positif;
- une consommation doit être un nombre fini non négatif;
- une chaîne numérique non vide est convertie en nombre;
- un zéro de consommation est une valeur connue;
- une cible réelle à zéro n'est pas calculable, car la tolérance relative a
  un dénominateur nul;
- une collection vide réussie est calculable et vaut 0 jour correspondant;
- toute ligne inconnue ou invalide rend le badge non calculable : un calcul
  incomplet ne peut pas attribuer une récompense.

Les résultats de toutes les données valides restent identiques à
l'implémentation historique, y compris les arrondis inexistants et les deux
bornes inclusives.

## États et cycle de lecture

| Situation | Résultat C07 | Valeur exposée | Attribution |
|---|---|---:|---|
| cible et lignes valides | `ready/calculable` | nombre de jours | seuil historique |
| collection réussie `[]` | `ready/calculable` | `0` | non |
| cible absente ou nulle | `ready/not_calculable: goal_absent` | absente | impossible |
| cible zéro, négative ou invalide | `ready/not_calculable: goal_invalid` | absente | impossible |
| calories nulles ou absentes | `ready/not_calculable: consumption_unknown` | absente | impossible |
| calories négatives/non finies/non numériques | `ready/not_calculable: consumption_invalid` | absente | impossible |
| owner explicite différent | `ready/not_calculable: owner_mismatch` | absente | impossible |
| erreur Supabase ou rejet réseau | `failure`, source explicite | absente | impossible |
| réponse plus ancienne | `stale` | ignorée | impossible |

Le service n'invente pas de cache de valeur. Après une valeur visible, une
nouvelle panne rend donc C07 indisponible au prochain résultat au lieu de
réutiliser cette valeur pour une attribution. Dans `BadgesModal`, une
condition absente n'est plus rabattue sur zéro et n'entre pas dans « Presque
débloqués ». La carte verrouillée générale demeure visuellement identique;
une panne n'affiche ni faux progrès, ni célébration, ni succès.

## Pourquoi les autres frontières ne sont pas réutilisées

- `nutrition-tab-summary` travaille sur un jour sélectionné, quatre macros et
  les objectifs déjà chargés par le dashboard;
- `desktop-nutrition-day` agrège un jour UTC destiné au journal desktop;
- Analytics agrège sept jours et conserve indépendamment les métriques
  partielles;
- Home possède ses propres cycles, limites et contrats de cartes;
- le diagnostic couvre une semaine Europe/Zurich avec quatre métriques.

C07 couvre au contraire les 200 dernières lignes sans borne calendaire,
charge lui-même une seule cible, et décide d'une récompense persistante. Une
frontière dédiée est nécessaire pour rester fail-closed sans modifier les
autres contrats.

## Périmètre préservé

Les props et callbacks de `ProfileTab`, `BadgesModal` et de la fin de séance
restent identiques. Les projections, owners, ordre, limite, cadence et
résultats valides sont conservés. Les calculs des autres badges ne changent
pas.

Aucun `insert`, `update`, `upsert`, `delete`, RPC, payload, mutation React ou
producteur IA n'a été modifié. Les payloads existants de `user_badges` et
`user_xp` sont inchangés; C07 empêche seulement une valeur non calculable
d'atteindre ces écritures.
