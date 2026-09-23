# Analyses avancées — unités et couverture

## Cause et audit

Le graphique affichait `sets` avec l'info-bulle Recharts par défaut (fond blanc),
un axe numérique acceptant les décimales, et un texte annonçant du tonnage sans
l'afficher. Le calcul du tonnage existait déjà, mais n'était pas présenté.

Audit Supabase en lecture seule sur le compte de test dédié, le 23 septembre :
trois séries terminées dans chacun des groupes Quadriceps, Pectoraux, Dos,
Fessiers et Abdos. Deux autres séries sans rattachement, dont la série de fentes
testée, étaient exclues. La requête reprend la limite de 90 séances et la fenêtre
de 28 jours du chargeur et du composant. Aucune donnée personnelle copiée ici.

## Correctif limité

- Axe entier, unité « Nombre de séries » explicite.
- Info-bulle sombre : muscle, nombre de séries traduit et tonnage existant en kg.
- Texte d'aide aligné avec la mesure affichée ; pluriels FR/EN/DE.
- Nombre de séries non rattachées explicite, sans inventer de groupe musculaire.
- Info-bulle RIR également sombre et nom de mesure traduit.
- Aucune nouvelle requête, migration, écriture DB ni modification des droits.
- Les règles de tonnage et le classement des exercices restent inchangés.

## Validation

Test runtime React/DOM avec adaptateur de graphique simulé : trois séries
rattachées, deux sans rattachement ; exclusion des séries incomplètes, séances
annulées, dates anciennes ou invalides ; respect du mode deux haltères pour le
tonnage. Rendu de l'info-bulle réelle en trois langues et contrôle des couleurs.
Ce test ne remplace pas la vérification visuelle tactile WebKit après publication.

Suite complète : 2 067 tests réussis / 227 fichiers. TypeScript sans erreur.
Parité i18n : 3 391 clés dans les trois langues. Build production réussi avec
la configuration synthétique CI. Aucun changement en production
tant que la branche n'est pas fusionnée et le déploiement vérifié.
