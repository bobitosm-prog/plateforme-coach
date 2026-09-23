# Isolation des brouillons d’entraînement — 23 septembre 2026

## Cause reproduite

La lecture du stockage V2 commun rejetait puis supprimait le brouillon lorsque
son propriétaire différait du compte connecté. Un passage A → B pouvait donc
effacer la séance locale de A. Cela ne prouve pas la cause de l’incident observé
dans le simulateur et ne permet pas de récupérer les séries disparues.

## Correction

- Une clé locale par identifiant de compte, sans changement de schéma ni de RLS.
- Migration du V2 partagé uniquement pour son propriétaire : copie avant retrait.
- Les anciens formats sans propriétaire identifiable restent intacts et ne sont
  pas attribués arbitrairement au compte connecté.
- Changement de compte : retrait du brouillon affiché et restauration du bon
  propriétaire. Les callbacks de l’ancien compte sont ignorés.
- Abandon/finalisation : marqueur minimal sans exercices, bloquant les écritures
  tardives du même brouillon. Une nouvelle séance explicite peut le remplacer.
- Un ancien identifiant ne peut ni écraser ni supprimer une nouvelle séance.
- Un instantané daté antérieurement à celui enregistré est refusé.

## Validation locale

- Tests exécutés dans jsdom avec le véritable hook du tableau de bord : A → B → A,
  conservation des séries, callbacks obsolètes, retour Home/reprise/abandon.
- Tests du stockage : migration, propriétaire incorrect, quota, expiration,
  écritures tardives et marqueurs de suppression.
- Suite complète : 2 038 tests ; TypeScript ; parité des traductions ; build
  production standard. Les services externes du test runtime sont simulés.

## Limites et exploitation

Le stockage reste local, non chiffré par ce changement et accessible au JavaScript
de la même origine. Le partitionnement évite les mélanges applicatifs ; ce n’est
pas une frontière de sécurité contre XSS. Aucune sauvegarde serveur du brouillon
n’est ajoutée. Effacer les données de l’app peut toujours le faire disparaître.
La reprise automatique conserve la limite existante de 24 h ; les données
expirées ne sont plus détruites à la lecture. Leurs clés peuvent être remplacées
par une nouvelle séance explicite. Les erreurs de quota sont propagées et une
meilleure interface de récupération reste à traiter. Les écritures localStorage
ne constituent pas une transaction multi-onglets : ce lot ne résout pas toutes
les courses simultanées. Un ancien onglet non actualisé continue à utiliser
l’ancien code ; recharger les clients après déploiement.

Aucune séance réelle n’a été créée, finalisée ou supprimée pour ces tests.
