# Historique des entraînements — correctif

## Cause vérifiée

Le classement partiel reconnaissait « upper » avant « upper isolations ». Le filtre utilisait uniquement le nom : les anciens titres « Séance » perdaient leurs muscles, pourtant enregistrés. Le tableau de bord lisait 90 séances et la fenêtre n’affichait que 20 résultats sans suite.

## Changements

- Les libellés spécifiques ont priorité sur les termes génériques, avec limites de mots.
- Les filtres musculaires sont inclusifs : une séance Push avec épaules peut apparaître dans Pectoraux et Épaules. Les filtres Full Body/Haut/Bas/Cardio restent des types de séance. L’interface explique cette distinction.
- Chargement de l’historique terminé à l’ouverture, par pages de 100 métadonnées, indépendamment de la fenêtre du tableau de bord. Lecture bornée à l’utilisateur connecté, avec RLS existante inchangée, ordre déterministe et borne temporelle au début du chargement.
- Si les muscles sont absents, lecture des exercices terminés par pages et correspondance exacte au catalogue historique. Aucun rapprochement flou ; aucune déduction depuis le programme actuel. Un exercice inconnu reste non classé plutôt qu’inventé.
- Affichage progressif par 20 résultats, compteur total réel, erreur et bouton de nouvelle tentative, annulation à la fermeture. Les dates de séance sont préférées aux timestamps d’insertion.
- La fenêtre historique se ferme avant l’ouverture du détail pour éviter de le masquer.

## Préservation et limites

Aucune écriture ni migration de données. Aucun nom, charge, série ou séance historique modifié. Le compteur du tableau de bord n’est pas remplacé par le jeu de données de la fenêtre historique.

La correspondance de secours utilise le groupe musculaire du catalogue pour les noms exacts ; les muscles historiques enregistrés restent prioritaires. Une fiche inconnue ou sans groupe ne permet pas de reconstruire un muscle manquant. Aucun historique n’est inventé.

## Vérifications

Tests runtime React : ouverture, 119 séances, filtre Épaules, affichage au-delà de 20, ouverture du détail, échec/reprise et annulation. Tests du lecteur : pages supplémentaires, propriété du compte sur chaque requête privée, refus des résultats partiels et secours par exercice exact. Régressions du classement et des images de séance vérifiées.
