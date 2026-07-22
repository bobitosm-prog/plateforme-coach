# Baseline de performance

## Statut

La dépendance réseau des polices est supprimée au 22 juillet 2026 grâce à
l'[auto-hébergement des polices](./LOCAL_FONT_HOSTING.md) et deux builds de
production hermétiques complets sont validés. Aucune valeur de bundle, LCP,
INP, CLS ou requête de référence n'est encore publiée. La tâche Phase 8 reste
ouverte jusqu'à la capture reproductible.

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
les feuilles de style de cinq familles auprès du service CSS Google Fonts :

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
| Bundle de production | Build disponible, tailles non encore extraites |
| LCP | Non encore capturé |
| INP | Non encore capturé |
| CLS | Non encore capturé |
| Requêtes de référence | Indisponible : parcours non exécutés |

## Prérequis polices au 22 juillet 2026

Les cinq familles utilisent désormais `next/font/local`, leurs fichiers
officiels auto-hébergés et leurs licences OFL. Deux compilations Webpack de
production isolées ont réussi respectivement en 16,5 s et 16,0 s dans le
sandbox sans réseau externe. Elles n'ont produit aucune tentative Google Fonts.

Le contrat `PageProps` de `/coach` est ensuite corrigé sans changer son flux
d'authentification : `app/coach/page.tsx` est un default export sans props et le
seam applicatif `initialSession` typé `Session` est déplacé dans
`CoachPageContent`. Deux builds `next build --webpack` isolés réussissent avec
des compilations de 17,2 s et 16,9 s. Ils génèrent 88 pages, les `BUILD_ID`
`TKrTRWcoNZF5SHAnHD1Bq` et `yezBZgbPeew6lpeP7jjbi`, et tous les manifests
finaux attendus. Les sorties ne contiennent aucun marqueur Google Fonts.

Aucun runner, scénario Playwright, extracteur de bundle ou artefact JSON n'est
ajouté dans cette tranche de prérequis.

## Condition de reprise

Le protocole ci-dessus doit maintenant être implémenté et exécuté trois fois
avant de cocher la tâche.

La baseline de requêtes coach déjà documentée dans
[Requêtes initiales du dashboard coach](./COACH_DASHBOARD_INITIAL_REQUESTS.md)
reste une caractérisation antérieure ciblée ; elle ne remplace pas la baseline
Phase 8 multi-parcours.
