# Lecture « Mes repas » de `NutritionTab`

> Statut : C06 raccordé le 25 juillet 2026. La correction porte uniquement
> sur le transport read-only de `saved_meals`; toutes les écritures et le
> sélecteur d'importation restent inchangés.

## Flux réel

```text
Navigation NutritionTab vers « Mes repas »
  → useSavedMealsLibrary
  → effet owner/subTab
  → saved_meals
       .select('*')
       .eq('user_id', userId)
       .order('created_at', { ascending: false })
  → beginSavedMealsLibraryRead
  → settleSavedMealsLibraryRead
  → état React owner-scoped
  → NutritionSavedMealsReadNotice
  → NutritionSavedMealsSection
       ├─ édition
       ├─ suppression
       └─ création
```

Le sous-onglet exécute une seule requête à chaque entrée. Il n'a ni cache, ni
polling, ni limite. Quitter le sous-onglet exécute le cleanup et invalide la
réponse en cours. Le changement de `userId` ou du client Supabase relance le
même cycle.

Les écritures existantes ne rafraîchissent pas la lecture :

- une création réussie préfixe la ligne renvoyée;
- une édition réussie remplace localement la ligne;
- une suppression réussie la retire localement;
- fermer puis rouvrir le sous-onglet remplace la collection par une nouvelle
  lecture ordonnée.

## Cause racine

Le flux historique ne lisait que `data` dans le résultat Supabase :

```text
.then(({ data }) => setMyMeals(data || []))
```

Une erreur Supabase, un rejet réseau, ou `data = null` devenait donc `[]`.
L'interface affichait « Aucun repas sauvegardé », exactement comme après un
succès réellement vide. Aucun compteur ni cleanup n'empêchait une réponse
ancienne de remplacer la liste d'un owner ou d'une ouverture plus récente.

## Contrat du settlement C06

| Événement | État | Liste visible |
|---|---|---|
| première ouverture | `loading` | aucune |
| succès avec des lignes | `ready` | réponse courante |
| succès avec `[]` | `empty` | état vide historique |
| erreur Supabase ou rejet réseau initial | `error` | aucune |
| `data = null`, même sans erreur | `error` | aucune |
| erreur après une liste visible | `error` | dernière liste du même owner |
| réponse obsolète | état inchangé | liste courante |
| changement d'owner | `loading` | aucune ligne de l'ancien owner |
| réouverture après erreur | `loading`, puis résultat | ancienne liste du même owner pendant le chargement |

Le settlement vérifie aussi le `user_id` de chaque ligne. Une réponse
contenant un owner différent est invalide et ne remplace jamais la liste
visible. L'ordre reçu est conservé; aucun tri client ne peut déplacer les
repas.

## Comparaison avec le sélecteur d'import

Les deux lectures ont le même owner, le même tri `created_at DESC`, une forme
collection et aucune limite, mais leurs autres contrats diffèrent :

| Propriété | « Mes repas » C06 | Sélecteur d'import |
|---|---|---|
| déclenchement | entrée dans le sous-onglet | ouverture de l'overlay pour un repas cible |
| projection | wildcard historique `*` | `SAVED_MEAL_PROJECTION` aliasée |
| état | liste éditable persistante entre ouvertures | sélection temporaire |
| fermeture | cleanup de l'effet | fermeture explicite de l'overlay |
| consommateurs | rendu, création, édition, suppression | préparation et réutilisation vers le journal |

`settleSavedMealSelection` n'est donc pas réutilisé. Il ne transporte pas
l'owner et conserve historiquement `data ?? []`; modifier son contrat aurait
rouvert le sélecteur déjà sécurisé. C06 utilise un settlement pur minimal et
spécifique.

## Projection et schéma runtime

La projection C06 reste `*`; aucune colonne nouvelle n'est demandée. La
projection explicite réellement consommée par le sélecteur a été exécutée en
lecture seule contre le backend déployé et répond HTTP 200 :

```text
id,user_id,name,meal_type,foods,total_calories,
total_protein:total_proteins,total_carbs,total_fat:total_fats,created_at
```

Le runtime expose donc les variantes pluralisées `total_proteins` et
`total_fats`, aliasées par la frontière repository. Les types générés locaux
décrivent les noms singuliers et déclarent `user_id`, `meal_type`,
`created_at` et les quatre totaux nullables; `name` et `foods` sont requis.
La migration baseline confirme `foods jsonb NOT NULL DEFAULT '[]'`.

Le rendu « Mes repas » n'utilise pas les colonnes de total SQL. Il recalcule
depuis `foods` via le snapshot existant, qui accepte les anciens alias
`protein/proteins` et `fat/fats`. Les anciens repas restent donc visibles sans
conversion ou réécriture.

## Périmètre préservé

- une requête par ouverture, owner, wildcard, tri descendant, collection sans
  limite;
- props et callbacks de `NutritionSavedMealsSection`;
- création, édition, suppression et leurs mises à jour optimistes;
- sélecteur d'import, snapshot et réutilisation;
- C03, C04, C05, Home, Analytics et diagnostic;
- tous les `insert`, `update`, `upsert`, `delete`, RPC et payloads.
