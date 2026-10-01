# Mensurations — largeur du champ date iOS

Les captures du simulateur montrent le bord droit du contrôle date au-delà
de l'alignement des champs numériques. Le calendrier natif s'ouvre correctement.
Le contrôle avait `width: 100%` sans borne explicite sur sa largeur intrinsèque.

Correctif local au seul `MeasureModal` : `minWidth: 0`, `maxWidth: 100%`,
`boxSizing: border-box`, `display: block`. Aucun masquage du débordement, aucune
suppression de l'apparence ou du calendrier natif. Le label est associé au champ
par un identifiant React unique. Aucun changement DB, API ou de sauvegarde.

Tests React/DOM : styles calculés et label en FR/EN/DE, absence de sauvegarde
sur changement de date ou annulation, transmission des six mensurations et de
la date lors de la sauvegarde explicite (callback simulé, aucune donnée réelle).
Ce contrôle DOM n'est pas une mesure géométrique WebKit : le bord droit et
l'ouverture du calendrier doivent être revérifiés dans le simulateur après
publication, notamment sur écran étroit.

Validation locale : 2 072 tests / 228 fichiers réussis, TypeScript sans erreur,
parité i18n (3 391 clés × 3 langues) et build production avec configuration
synthétique CI réussis.

Hors périmètre : `progress.tab.graphLabels.thighs` manque dans les trois langues
alors que le formulaire référence cette clé pour l'historique. Ce défaut
préexistant ne concerne pas la largeur du champ date et reste à traiter séparément.
