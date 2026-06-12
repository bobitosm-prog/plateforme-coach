# Navigation par swipe entre onglets (suivi du doigt)

## Statut : design validé, implémentation par sprints (11 juin 2026)

## Objectif
Swipe horizontal type Instagram entre les 5 onglets racine
(home / training / nutrition / progress / compte), avec suivi du doigt
en continu, snap au relâcher (distance ou vélocité), snapback si geste
insuffisant.

## Décisions d'architecture
- MONTAGE : lazy keep-alive. Un onglet se monte à sa première visite puis
  reste monté (offscreen). Pré-montage des voisins en requestIdleCallback
  après le boot. Boot inchangé (Home seul). Conséquence assumée : les
  useEffect au mount tournent 1x/session et non plus à chaque visite ;
  les refresh explicites passent déjà par fetchAll (props), inchangés.
- SCROLL : fin du <main> scrollable unique. Rail horizontal (5 slides),
  chaque slide = son propre conteneur overflow-y:auto. Chaque onglet
  conserve sa position de scroll (gain UX). Le scrollTo(top) au
  changement d'onglet (useClientDashboard L.121) devient par-slide ou
  est supprimé (à trancher en S1).
- GESTE : Framer Motion (déjà dans le bundle — AnimatePresence existant
  sur les transitions) : drag="x" sur le rail, onDragEnd avec velocity
  native, dragDirectionLock pour le verrou d'axe. PAS de moteur touch
  maison.
- L'AnimatePresence mode="wait" actuel (slide x:16 au changement) sera
  REMPLACÉ par le rail (les deux mécanismes sont incompatibles).

## Boucliers (S3)
- data-no-tab-swipe sur : calendrier Training (onTouchStart L.846 existant),
  comparateur photos (ProgressTab), charts Recharts si conflit constaté.
  Le drag global s'abstient si le geste démarre dans une telle zone.
- Zone morte ~24px aux bords (edge-swipe iOS).
- Swipe inactif : sous-écrans (profil/messages/feedback — rendus hors
  rail comme aujourd'hui), WorkoutSession active, modals ouverts.

## Sprints
- S1 : LIVRÉ (5e0909c). Restructure rail + slides scroll propre +
  lazy keep-alive + pré-montage progressif des voisins.
  Leçons S1 : (1) les % de largeur ne se résolvent pas fiablement
  dans un parent dimensionné par flex (slides rendues 227px au lieu de
  430) -> pixels mesurés via ResizeObserver, branché par CALLBACK REF
  car le <main> n'existe pas au premier mount (écran de chargement).
  (2) overflow:hidden n'empêche pas le scroll programmatique : des
  scrollIntoView internes (calendrier) ont scrollé le conteneur
  (scrollLeft=600 mesuré) -> overflow:clip + verrou scrollLeft=0.
  (3) Toujours valider aux deux largeurs (mobile simulé ET desktop).
  (4) npm start sert le dernier build .next, pas le code courant ->
  rebuild obligatoire après tout checkout. (5) Le pré-montage des 5
  onglets d'un coup coûtait 7 pts Lighthouse (72->65 mesuré) ->
  pré-montage progressif des seuls voisins, délai 3s + idle.
  mainWidth (px) est directement réutilisable en S2 pour le drag.
- S2 : drag Framer Motion (suivi, verrou d'axe, snap distance/vélocité).
- S3 : boucliers.
- S4 : perf iPhone réel + polish (sync indicateur bottom nav pendant le
  drag).

## Risques connus
- Mémoire : 5 onglets montés à terme (Recharts x2). À mesurer en S4.
- 28 useEffect dans les 4 tabs : comportements dépendant du re-mount à
  auditer en S1 (ex : refetch workoutHistory au retour sur Training —
  dépend de todaySessionDone, donc OK, mais inventaire requis).
- Doubles déclenchements interdits : gamification/gap-fill sont sur
  onFinishWorkout/fetchAll, PAS sur le mount des tabs — vérifié, sûr.
- LCP du dashboard dominé par ~2,2 MiB d'images non optimisées
  (mesuré Lighthouse, PRÉ-EXISTANT au rail). Dette prioritaire 'image
  delivery' (AVIF/WebP, resize CDN Supabase ou next/image) — le plus
  gros gain perf disponible de l'app.
