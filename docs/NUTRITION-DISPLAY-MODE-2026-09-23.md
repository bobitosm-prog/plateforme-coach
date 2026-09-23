# Nutrition — consommé/restant et détail des aliments

## Audit et périmètre

Le bloc NutritionQuickCard ne présentait que les restes calculés à partir du
modèle du journal. TodayMeals affichait quantité/calories et ouvrait directement
l’éditeur de quantité, sans afficher protein/carbs/fat déjà disponibles dans
NutritionLogRow. Aucun nouveau calcul nutritionnel, appel API, schéma ou droit
en base n’est nécessaire pour ce lot.

## Comportement livré

- Sélecteur Consommé / Restant : calories, protéines, glucides et lipides.
- Restant demeure le choix initial ; le choix est mémorisé localement par compte,
  pas synchronisé entre appareils. Le stockage indisponible n’empêche pas la bascule.
- Les valeurs consommées ne requièrent pas d’objectif. Un reste inconnu affiche
  un tiret ; le dépassement calorique conserve son libellé explicite.
- L’anneau garde sa signification existante : progression de la consommation
  par rapport à l’objectif, quel que soit le mode du chiffre central.
- Les macros apparaissent directement sous chaque aliment, sans bouton ajouté.
  La quantité de référence enregistrée est explicite pendant l’édition ; les
  nouvelles macros arrivent avec le journal actualisé. Une donnée absente n’est
  pas présentée comme zéro. Les chiffres ne constituent pas une nouvelle
  certification des valeurs du catalogue.
- Boutons natifs, état aria-pressed, focus visible, cibles de 44 px, libellés
  avec retour à la ligne et couleurs explicites. Traductions FR/EN/DE.

## Preuves et limites

2 050 tests passent sur 224 fichiers, dont 8 tests runtime jsdom sur les vrais
composants : bascule et remontage, A→B→A, stockage refusé, objectifs absents,
dépassement, changement de données, chargement/erreur et édition d’un aliment.
TypeScript, parité i18n (3 385 clés × 3 langues) et build production passent.
Pas d’écriture sur le compte de test ou personnel. Le contrôle natif du
simulateur étant indisponible, la validation visuelle iOS reste manuelle.

Retour arrière : revert du commit applicatif, aucune migration ni suppression
de données. La préférence locale restante est inoffensive pour l’ancien code.
