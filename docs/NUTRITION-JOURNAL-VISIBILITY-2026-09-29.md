# Journal du repas sélectionné

## Cause et correction

Le sélecteur Petit déjeuner / Déjeuner / Collation / Dîner pilotait seulement
le formulaire d'ajout. Le journal enregistré restait masqué dans un accordéon
placé après le formulaire et le calendrier. Un utilisateur pouvait donc croire
que ses aliments avaient disparu en sélectionnant un repas.

Le journal existant est déplacé sous le sélecteur, avant la saisie. Il affiche
le repas sélectionné, ouvert initialement, avec ses quantités et macros. Les
actions existantes sont conservées. La sélection et la date réinitialisent
l'état d'édition du journal via sa clé React. Un repas vide possède un message
explicite ; une erreur de lecture reste une erreur, jamais un faux repas vide.

## Périmètre d'exécution

- Tâche : rendre accessibles les aliments enregistrés du repas sélectionné.
- Scope : NutritionTab, TodayMeals et tests de rendu ; réutiliser le modèle
  existant et ses lectures. Aucun nouvel accès base ni changement d'écriture.
- Contexte : build iOS 6 charge le site web ; aucun nouveau binaire requis.
- Logique : sélecteur commun au journal et au formulaire ; distinguer les
  aliments enregistrés du brouillon, sans réinjecter le journal dans la saisie.
- Validations : TypeScript et suite Vitest ; quatre tests runtime ciblés pour
  sélection, rafraîchissement, édition et erreur ; traductions existantes ;
  GitHub Actions et compilation avant livraison.
- Contraintes : aucun déplacement de repas en base, aucune suppression,
  aucune nouvelle permission ni migration, commit UI séparé des tests réseau.

Le repas photo précédemment vérifié était classé Déjeuner. Le correctif ne
change pas cette classification. La capture en mode avion établit que le
brouillon et le message d'échec restent visibles ; elle ne prouve pas à elle
seule la réussite de la nouvelle tentative après retour du réseau.
