# Journal nutrition simplifié — 23 septembre 2026

## Périmètre

Un « + » par repas ouvre une sélection commune : recherche, récents, favoris,
repas enregistrés, plan, scanner et photo. Quantités modifiables, macros visibles,
une seule confirmation. Design noir/or conservé. Les actions secondaires restent
dans le menu du repas ; toucher un aliment permet de modifier sa quantité.

Les repas planifiés ne deviennent consommés qu'après confirmation. Les journaux
passés conservent leur date sélectionnée ; le plan proposé concerne aujourd'hui.
Les estimations photo sont explicitement présentées comme telles.

## Persistance et sécurité

- Aucune migration de production ni modification des droits.
- Enregistrement groupé atomique sous les droits du compte connecté.
- Identifiants stables et conflits ignorés : les tentatives d'une même sélection
  ne dupliquent pas ses lignes.
- En cas de réponse incertaine, sélection verrouillée et nouvelle tentative avec
  les mêmes identifiants. Fermer affiche un avertissement : consulter le journal
  avant de recréer le repas. Pas de reprise hors ligne après fermeture/rechargement.
- Une erreur de rafraîchissement après succès ne relance pas l'insertion.
- Les bases de calcul des portions sont conservées pour éviter les erreurs de
  conversion entre 100 g et portion, ainsi que les arrondis successifs.
- Aucun secret ni nouvel endpoint privilégié ; API photo existante conservée.

## Validation

- 1 991 tests unitaires/composants, dont essais React du nouveau formulaire.
- 31 tests d'intégration sur PostgreSQL/PostgREST jetables ; nouveau test vérifiant
  insertion groupée, répétition sans doublon, lecture inter-comptes interdite et
  absence d'insertion partielle lorsqu'une ligne viole la politique propriétaire.
- Compilation production, TypeScript et parité FR/EN/DE.
- Essai navigateur local 390 × 844 : récent + plan, modification de 200 à 100 g,
  confirmation, date et repas conservés. 237 kcal, P 4,0 g, G 55,6 g, L 0,7 g.
- Fixture visuelle temporaire retirée avant commit. Aucun aliment fictif enregistré
  en production.

## Limites de cet essai

Le parcours photo et le retour du scanner sont testés avec réponses simulées ;
la caméra physique et la qualité de reconnaissance IA ne sont pas requalifiées.
Le remplacement d'un aliment existant utilise encore le composant historique.
La copie d'un repas vers une autre date reste une action secondaire existante.
Le catalogue, les recommandations nutritionnelles et la génération des plans
ne sont pas modifiés par cette simplification d'interface.
