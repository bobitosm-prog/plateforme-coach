# Records Analytics — libellé et classement

## Audit et périmètre

La ligne `small` du mode de charge était inline sans espacement dédié : le
type de record suivait immédiatement le dernier mot. Correction CSS limitée :
bloc distinct, marges verticales, couleur explicite et retour à la ligne.
Aucune modification des valeurs, calculs, traductions ou requêtes.

Lecture seule du catalogue CoachPlatform le 23 septembre : `Fentes arrière`
existe avec le groupe `Quadriceps`, mais la variante exacte `Fentes arrière au
poids du corps` est absente. Le chargeur Analytics effectue une recherche par
nom exact. Le schéma réel de `personal_records` ne contient pas `exercise_id`.
Le repli « Autres » est donc expliqué par une absence de correspondance, pas
par une mauvaise traduction de Quadriceps.

Le classement n'a pas été modifié : rapprocher automatiquement les variantes
d'équipement contredirait la politique d'identité du catalogue. Une éventuelle
entrée de catalogue ou correspondance revue constitue un lot distinct ; aucune
écriture de production, migration ou modification RLS n'a été effectuée.

## Validations

Test runtime React/DOM : ouverture du groupe et lecture du mode de charge,
type, date et valeur en FR/EN/DE ; application de la règle CSS réelle et
vérification du bloc, des marges et de la couleur. 16 tests ciblés réussis.
Suite complète : 2 062 tests / 226 fichiers réussis ; TypeScript sans erreur.
Build production réussi avec les valeurs synthétiques de la CI ; parité i18n
validée pour 3 389 clés dans les trois langues.
Ce test DOM ne constitue pas une validation visuelle WebKit sur iPhone.

Le correctif reste local tant qu'il n'est pas publié. Les modifications du
banc de diagnostic nutrition présentes dans le checkout sont hors périmètre.
