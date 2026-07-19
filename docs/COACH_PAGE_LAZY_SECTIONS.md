# Sections différées de la page coach

## Inventaire et comportement historique

La page expose huit sections réelles : `accueil`, `dashboard` (clients),
`suivi` (analytics), `programs`, `aliments`, `messages`, `calendar` et
`profil`. Deux compositions responsive distinctes existaient déjà et restent
préservées. Le changement de section démonte la section précédente; en mobile,
la messagerie reste montée tant qu'un client est sélectionné. Les modales de
création et de détail de séance restent pilotées par le hook dashboard.

Avant l'extraction, `app/coach/page.tsx` importait statiquement douze modules de
présentation, dont les sections lourdes calendrier, messaging, analytics,
programmes et aliments, même lorsque l'utilisateur restait sur `accueil`.

## Architecture

- `page.tsx` conserve `useCoachDashboard`, la détection responsive, les états
  d'invitation/revenus/recherche, les redirections et la composition globale.
- `CoachDesktopLayout.tsx` conserve la navigation latérale et la composition
  desktop.
- `CoachMobileLayout.tsx` conserve l'en-tête, la navigation basse et la
  composition mobile.
- `CoachSessionWheelPicker.tsx` porte uniquement le sélecteur temporel de la
  modale mobile et nettoie son timer au démontage.
- `coach-page-types.ts` centralise le contrat typé transmis aux deux vues.
- `CoachSectionFallback.tsx` fournit un fallback stable et accessible.

Les sections `ClientsList`, `CoachCalendar`, `CoachMessages`, `CoachAnalytics`,
`CoachPrograms`, `CoachAliments`, `CoachProfile` et `SessionDetailModal` sont
chargées avec `next/dynamic`, sans `ssr: false`. Elles ne sont plus importées
statiquement par la page ou les layouts. `accueil` reste inline dans chaque
layout car c'est la section initiale. `CoachStyles` et `BugReport` restent
statiques : ils sont globaux ou toujours montés dans le layout historique.

Le layout desktop ou mobile lui-même est également différé depuis la page : le
layout non sélectionné n'est pas nécessaire au premier rendu utile. Aucun
préchargement applicatif ni nouvelle requête métier n'a été ajouté.

## Montage et contrats

Le contrat de `useCoachDashboard` est inchangé. Les layouts ne créent aucun
client Supabase, n'importent aucun repository et ne portent aucune décision
d'autorité. Navigation, compteurs, sélection client, callbacks calendrier et
messaging, confirmations et notifications utilisent les mêmes références du
hook. Le cleanup realtime/polling reste donc exclusivement dans les modules
dashboard, calendrier et messaging existants.

Les fallbacks occupent une hauteur minimale de 240 px afin de limiter le
déplacement visuel lors du premier chargement d'un chunk. Une erreur de chunk
reste gérée par la frontière d'erreur Next globale existante; aucun mécanisme
de retry spécifique n'existait auparavant et aucun contrat fictif n'a été
ajouté.

## Mesures

| Élément | Avant | Après |
|---|---:|---:|
| `app/coach/page.tsx` | 803 lignes | 76 lignes |
| imports statiques de présentation dans la page | 12 | 2 légers |
| erreurs / avertissements ESLint de la page | 17 / 12 | 0 / 1 |

Tailles finales : desktop 289 lignes, mobile 381, wheel picker 38, fallback 5
et contrat 27. Toutes les frontières restent sous 500 lignes. Les nouvelles
vues ont zéro erreur ESLint; les deux avertissements `no-img-element` globaux
préservent les deux logos historiques.

Le découpage en chunks est prouvé statiquement par les imports dynamiques et
l'absence d'import statique doublonné. Aucun chiffre de kilo-octets n'est
affirmé sans analyseur de bundle reproductible.
