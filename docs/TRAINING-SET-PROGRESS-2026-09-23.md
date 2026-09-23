# Progression des séries — correction ciblée

## Cause et scope

L'écran Focus utilisait le libellé de progression pour le numéro de la série
actuelle. L'éditeur calculait sa barre avec ce même numéro : la troisième série
sur trois remplissait la barre avant validation. Il s'agissait d'un défaut
d'affichage, pas d'une preuve de séries supplémentaires enregistrées en base.

Le correctif distingue « Série 3 sur 3 » de « 2 / 3 séries validées ». Le nombre
validé provient exclusivement de `exo.sets.filter(set => set.done).length`.
La barre et sa valeur accessible utilisent ce nombre ; début à zéro, fin à 100 %
uniquement après validation de toutes les séries de l'exercice. Les libellés
spécifiques drop set/rest-pause restent conservés.

Pas de modification du schéma DB, des contrats API, du volume d'entraînement,
de la sauvegarde, du brouillon ou du prototype iOS. Traductions FR/EN/DE.

## Validation

- 2 027 tests passent, dont quatre tests de rendu React du compteur : début,
  dernière série en attente, complétion, libellé de technique et en-tête Focus.
- Test interactif existant de l'éditeur chronométré conservé et adapté au
  nouveau paramètre obligatoire ; TypeScript et parité des traductions OK.
- Le rendu React est exécuté localement avec le fournisseur de traductions.
  Aucun compte réel ni fausse séance finalisée pour valider ce correctif.
- Relecture : seule l'UI consomme le compteur ; aucune écriture ou suppression
  ajoutée. Retour arrière par revert de ce commit, sans migration inverse.

Les preuves de compilation/CI et le statut de déploiement sont attachés à la PR
de livraison. Les captures du prototype prouvaient une reprise de brouillon,
pas l'enregistrement final en base ; cette limite reste inchangée.

Contrôle supplémentaire : un essai local `next build --webpack` échoue sur le
type des props de la page coach (`initialSession`, fichier inchangé par ce lot).
Ce chemin alternatif n'est donc pas certifié. La livraison utilise le build
standard `npm run build` (Turbopack), identique à la CI et au déploiement.
