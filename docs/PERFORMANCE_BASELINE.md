# Baseline de performance

## Statut

La capture est **bloquée avant mesure** au 22 juillet 2026. Aucune valeur de
bundle, LCP, INP, CLS ou requête de référence n'est publiée dans ce document.
La tâche Phase 8 reste ouverte.

Les valeurs issues d'un serveur de développement ne sont pas substituables à
une mesure du build de production et n'ont pas été collectées.

## Protocole prévu

La baseline devra être exécutée sur un build Next.js de production, servi
localement, avec Chromium et des personas exclusivement synthétiques. Chaque
parcours devra être lancé trois fois dans un contexte navigateur neuf :

- client mobile : Accueil, Training et Nutrition ;
- coach desktop : Accueil, Clients, Messages et détail client.

Les mesures attendues sont :

- poids des bundles initiaux et chunks chargés par parcours ;
- LCP, INP et CLS observés dans Chromium via les API de performance ;
- nombre de requêtes locales, regroupées par type et domaine ;
- médiane des trois runs, avec les trois valeurs brutes conservées.

Le runner devra refuser toute origine non locale et ne devra contacter aucun
fournisseur externe. Les parcours, tailles de viewport, état des caches,
conditions d'attente et fixtures devront être enregistrés avec l'artefact JSON
pour rendre la mesure reproductible.

## Tentative du 22 juillet 2026

Environnement observé :

- Node.js `v24.14.0` ;
- npm `11.9.0` ;
- Next.js `16.1.6` avec Turbopack ;
- Playwright `1.61.1`.

La commande inchangée `npm run build` échoue avant la production des artefacts
mesurables. `next/font/google`, importé par `app/layout.tsx`, tente de récupérer
les feuilles de style de cinq familles sur `fonts.googleapis.com` :

- Anton ;
- Barlow Condensed ;
- Bebas Neue ;
- DM Sans ;
- Outfit.

Les cinq téléchargements échouent et Next termine par
`Turbopack build failed with 5 errors`, chacun signalant l'impossibilité de
récupérer la police correspondante depuis Google Fonts.

Le paquet Next installé contient une variable interne de réponses Google Fonts
simulées dans son code compilé. Elle n'est ni configurée par le dépôt ni
utilisée ici comme mécanisme officiellement supporté de production. Aucun
mock, patch de police, accès réseau exceptionnel ou changement applicatif n'a
été introduit pour contourner l'échec.

## Résultats

| Mesure | Résultat |
|---|---|
| Bundle de production | Indisponible : build non produit |
| LCP | Indisponible : serveur de production non démarrable |
| INP | Indisponible : serveur de production non démarrable |
| CLS | Indisponible : serveur de production non démarrable |
| Requêtes de référence | Indisponible : parcours non exécutés |

Aucun runner, scénario Playwright, extracteur de bundle ou artefact JSON n'est
ajouté tant que le prérequis de build n'est pas satisfait : ils ne pourraient
pas valider la baseline demandée.

## Condition de reprise

La même tâche doit reprendre dans un environnement local autorisé à résoudre
les cinq polices pendant le build, ou après adoption dans une tranche séparée
d'une méthode Next officiellement supportée rendant le build hermétique sans
changer le rendu de production. Le protocole ci-dessus devra alors être
implémenté et exécuté trois fois avant de cocher la tâche.

La baseline de requêtes coach déjà documentée dans
[Requêtes initiales du dashboard coach](./COACH_DASHBOARD_INITIAL_REQUESTS.md)
reste une caractérisation antérieure ciblée ; elle ne remplace pas la baseline
Phase 8 multi-parcours.
