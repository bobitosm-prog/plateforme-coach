# Nutrition iOS — reprise après perte de réponse

## Tâche et périmètre

Renforcer la preuve de non-duplication lorsque le repas est enregistré mais
que le client perd la réponse. Test d'intégration uniquement, sur main
`88d3538f`. Aucun changement produit, API, migration ou donnée de production.

Le test de photo réalisé par Marco sur build 6 est concluant : les logs du
29 septembre montrent une analyse réussie puis un seul POST du journal (201).
Les quatre aliments enregistrés ne présentent aucun doublon. Les identifiants
de compte et le contenu du repas ne sont pas copiés dans ce rapport.

## Logique vérifiée

Le formulaire sauvegarde le brouillon soumis avant la requête et conserve ses
identifiants. Le nouveau test utilise les fonctions applicatives de stockage
et de persistance, le client Supabase réel et PostgreSQL/PostgREST local.

1. Sérialisation de deux aliments fictifs avec identifiants stables.
2. Écriture effective en base, puis exception réseau injectée après réponse
   HTTP réussie : le client reçoit MEAL_SAVE_FAILED.
3. Lecture indépendante : les deux lignes existent déjà.
4. Reconstruction du brouillon depuis son JSON et nouvelle soumission :
   deux requêtes d'écriture au total, toujours deux lignes, mêmes identifiants.
5. Un autre propriétaire ne peut pas lire ces lignes (RLS de la fixture).

Le stockage du test d'intégration est un adaptateur mémoire conservant le JSON.
Ce test ne simule pas une coupure radio iPhone ni un arrêt du processus iOS.
Les tests du composant couvrent séparément la fermeture/réouverture et l'erreur
réseau. Le scénario complet sur iPhone reste à qualifier.

## Validations 4 axes

- Contrat : aucun contrat applicatif modifié. Les 9 diagnostics TypeScript
  préexistants ont été isolés par comparaison avec la base, puis corrigés dans
  un commit distinct limité à 4 tests Home/Training : enfants du provider
  fournis dans les props, assertions de type retirées et garde DOM explicite.
  `tsc --noEmit --incremental false` passe désormais.
- Automatisation : 20 tests ciblés formulaire/brouillon, 14 tests de rendu
  Home/Training, puis la suite complète de 2 126 tests passent. Parité i18n OK.
- Runtime : 32 tests d'intégration passent, dont le nouveau cas sur PostgreSQL
  et PostgREST. La restauration de sauvegarde synthétique passe également.
- Isolation : serveur local uniquement, fournisseur IA simulé, aucune donnée
  réelle ni secret de production. Conteneurs, volumes et réseau jetables
  supprimés par le runner après les tests. Retour arrière : retirer le test.

## Commandes

```sh
npx vitest run tests/unit/nutrition-meal-composer.test.ts tests/unit/meal-draft-storage.test.ts tests/unit/nutrition-meal-draft.test.ts
node scripts/check-nutrition-persistence.mjs
npx tsc --noEmit
```

## Livrable et contraintes

Test durable dans la suite existante, sans nouveau framework ni refactorisation.
Aucun nouveau build TestFlight nécessaire. Pas de promesse de mode hors ligne :
seul le brouillon et la nouvelle tentative sont qualifiés par ces tests locaux.
