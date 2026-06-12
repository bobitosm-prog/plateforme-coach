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
- S2 : LIVRÉ EN v2 (50310e4), validé device prod au pouce. Moteur
  touch MANUEL (pattern carrousel) : détection d'intention par
  dominance d'axe (H si ax>12 && ax>ay*1.5 ; V rendu au natif si
  ay>16 && ay>ax*1.5), preventDefault chirurgical sur gestes qualifiés
  H seulement (touchmove addEventListener passive:false + cleanup),
  railX useMotionValue piloté direct, snap 25%/500px/s, élastique 15%
  aux bornes. Desktop souris : drag inactif (touch only, assumé).
  Historique : v1 dragControls+pointer events abandonnée — pointermove
  coupé par le scroll natif (mesuré) ; drag Framer natif abandonné —
  capturait le scroll vertical (incident, post-mortem ci-dessous).
- S3 : boucliers.
- S4 : perf iPhone réel + polish (sync indicateur bottom nav pendant le
  drag).

## Post-mortem incident 12 juin (~40 min de prod dégradée)

Chronologie : S2 + gel scroll déployés -> scroll vertical mort en
prod -> revert du gel : insuffisant -> revert de S2 : insuffisant ->
mesure DOM : slides à clientHeight=scrollHeight=2311px. CAUSE RACINE :
la chaîne height:100% (slides->rail->main) avait perdu sa base de
résolution ; les slides grandissaient à la taille du contenu, rien à
scroller en interne, le main overflow:clip coupait le reste. Les
reverts ne pouvaient pas suffire : le bug de hauteur était présent
dès S2 mais masqué/confondu avec le gel. FIX (22517fc) : hauteurs en
pixels mesurés (mainSize {w,h}), plus aucun % dans la géométrie.
LEÇONS : (1) valider par MESURE DOM, pas par symptôme — 3 fausses
pistes évitées si on avait mesuré clientH/scrollH dès le début ;
(2) ZÉRO pourcentage dans une géométrie pilotée par flex, les deux
axes ont produit le même bug (227px en largeur, 2311px en hauteur) ;
(3) ne JAMAIS pusher un fix dont le mode de panne anticipé n'a pas
été testé localement (le gel v1 a été pushé sans test, son mode de
panne prévu s'est produit en prod) ; (4) npm start sert le build
.next figé — 4 diagnostics fantômes en 2 jours, itérer sur npm run
dev, mesurer sur build frais.

Leçon S2-v2 : sur mobile web, la cohabitation drag horizontal /
scroll vertical ne se règle PAS en empilant les mécanismes (touch-
action + directionLock Framer + gel manuel = 3 arbitres en course).
UN SEUL propriétaire du geste : détecteur d'intention maison sur
touch events, qui ne donne le geste au drag QUE qualifié horizontal
et ne touche JAMAIS au vertical. Diagnostic par espion d'événements
console = la méthode qui a tranché (down sans move qualifié).

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
- Webhook GitHub->Vercel a raté 1 push (567a585) pendant l'incident :
  si un push ne déclenche pas de déploiement, git commit --allow-empty
  + push re-sonne le webhook.
