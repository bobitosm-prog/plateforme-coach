# Politique de diffusion vidéo différée

## Portée

Cette politique couvre les neuf lecteurs vidéo visibles de l’application. Elle
ne réencode ni ne supprime aucun média et ne modifie ni Storage, ni RLS, ni les
URLs persistées. La vidéo interne `data:` utilisée comme repli de wake lock
dans `lib/training/workout-runtime-browser.ts` n’est pas un lecteur visible et
reste hors de cette frontière.

Les quatre chemins concurrents suivants sont exclus avant toute lecture ou
transformation :

- `scripts/enrich-parent-exercises.mjs` ;
- `public/videos/exercises/developpe-couche-barre.jpg` ;
- `public/videos/exercises/developpe-couche-barre.mp4` ;
- `supabase/.temp/cli-latest`.

## Inventaire des lecteurs

| Consommateur | Source | Contexte | Politique |
|---|---|---|---|
| `ExerciseLibrarySection` | exercice local/catalogue | détail en overlay | source au montage de l’overlay, poster local |
| `ExerciseDetailModal` | exercice local/catalogue | modale | source au montage, poster local |
| `ExerciseSearchModal` | exercice local/catalogue | modale | source au montage, poster local |
| `ExerciseInfoPopup` | exercice local/catalogue | popup coach/client | source au montage, poster local |
| `WorkoutSessionOverlays` | exercice local/catalogue | overlay de séance | source au montage, poster local |
| `WorkoutSession` | exercice local/catalogue | modale conditionnelle | source au montage, poster local si connu |
| `VideoFeedbackHistory` | URL Storage utilisateur | ligne dépliée après action | source seulement lorsque la ligne est ouverte |
| `CoachVideoReviews` | URL Storage utilisateur | vue secondaire | activation explicite « Lire la vidéo » |
| `VideoFeedbackModal` | URL blob locale | aperçu après sélection | source seulement après sélection utilisateur |

Les quatre HTML autonomes versionnés ne contiennent aucune balise `video`.
Les URLs Storage et blob ne sont jamais résolues en poster, journalisées ou
persistées par la frontière.

## Frontière commune

`DeferredVideo` expose les états `idle`, `loading`, `ready` et `error`.
L’attribut `src` est absent du rendu serveur et n’est affecté par effet qu’à
l’activation. Tous les lecteurs déclarent `preload="none"` et `playsInline`.
L’autoplay historique est conservé uniquement pour les vidéos muettes, et
désactivé lorsque `prefers-reduced-motion: reduce` est actif.

Au démontage, la frontière met en pause, retire `src`, puis appelle `load()`.
Ce nettoyage est idempotent et compatible avec le double setup/cleanup de
React Strict Mode. L’erreur publique est fixe et expurgée ; elle ne contient
ni source, ni URL signée, ni détail fournisseur.

IntersectionObserver n’est pas ajouté : les lecteurs d’exercice sont déjà
conditionnés par l’ouverture d’un overlay, les feedbacks par une action
utilisateur. Ajouter une deuxième couche d’activation n’apporterait pas de
frontière temporelle supplémentaire.

## Posters locaux

Dix-sept JPEG locaux déjà associés sémantiquement aux exercices ont été
convertis mécaniquement en WebP, qualité 78, largeur 360 px, hauteur
proportionnelle, métadonnées supprimées. Commande :

```bash
cwebp -q 78 -resize 360 0 -metadata none source.jpg -o poster.webp
```

Les posters sont dans `public/images/video-posters/`, pèsent chacun moins de
20 000 octets et sont reliés aux vidéos par
`lib/media/exercise-video-posters.ts`. Les sources sans correspondance sûre,
les URLs distantes, les URLs utilisateur et la paire protégée échouent
fermées : aucun poster n’est inventé.

L’inspection visuelle réelle d’une planche des 17 sources et de la paire
poster/première frame Squat confirme une représentation cohérente du mouvement,
des ratios verticaux stables et l’absence de cadre noir. Le poster et la frame
ne sont pas revendiqués comme pixel-identiques.

## Preuve réseau production

Le harnais optionnel est activé avec :

```bash
MOOVX_VIDEO_EVIDENCE_PATH=/tmp/moovx-video.json \
  npm run perf:baseline -- --output /tmp/moovx-video-baseline.json
```

Il utilise le build Next.js Webpack de production, localhost uniquement, une
fixture synthétique nettoyée, puis le même lecteur Arnold Press aux viewports
390×844 et 1024×768.

| Étape | Mobile | Large viewport |
|---|---:|---:|
| Avant ouverture | 0 requête, 0 octet | 0 requête, 0 octet |
| Poster à l’ouverture | 14 316 o de corps | 14 316 o de corps |
| Vidéo à l’ouverture | réponse 206, 1 127 373 o annoncés | réponse 206, 1 127 373 o transférés |
| Après fermeture | 0 requête | 0 requête |
| Réouverture même contexte | 0 nouvelle requête | 0 nouvelle requête |

Le serveur local répond `Cache-Control: public, max-age=0` pour le poster et la
vidéo. La réouverture observée réutilise néanmoins la ressource dans le même
contexte. Une politique CDN cacheable reste une dette distincte ; elle n’est
pas simulée ni ajoutée ici.

Les deux builds de preuve initiaux produisent 88 pages et les manifests
complets, avec les `BUILD_ID` `SrLPOoGmnP25bgwl4YVAc` et
`VLEOjiNamO8KiuxqReFvB`. Les preuves vidéo passent 1/1 deux fois. Leurs
contrôles globaux passaient 78/79 à cause d’un INP client médian de 48 ms pour
une limite historique de 36 ms. Ce signal a été conservé puis diagnostiqué,
sans relever le budget ni modifier les artefacts de référence.

## Diagnostic INP

Le diagnostic `PerformanceEventTiming` est opt-in. Il conserve le vrai clic
Playwright et ajoute uniquement l’identifiant d’interaction, le type
d’événement, les délais d’entrée/traitement/présentation, l’étape sémantique,
les longues tâches, des catégories de ressources sans URL et les compteurs
DOM `video`/poster. Le navigateur n’expose pas de durée de décodage d’image :
elle reste explicitement indisponible, sans estimation.

Sous un seul build `qbqpoF9UAbUO0cuXMncsp`, trois expériences utilisent le
même parcours, les mêmes observers, Chromium, viewports et timezone :

```bash
MOOVX_INP_DIAGNOSTIC_MATRIX_PATH=/tmp/moovx-video-inp-matrix.json \
  npm run perf:baseline -- --output /tmp/moovx-video-inp-control.json
```

| Expérience | INP client brut | Médiane | Posters pendant le parcours | DOM vidéo/poster | Longues tâches |
|---|---:|---:|---:|---:|---:|
| A — normal, cache froid | 48 / 32 / 32 ms | 32 ms | 0 requête, 0 octet | 0 / 0 | 0 |
| B — posters seuls bloqués | 48 / 32 / 32 ms | 32 ms | 0 requête, 0 octet | 0 / 0 | 0 |
| C — posters préchauffés hors mesure | 32 / 32 / 32 ms | 32 ms | 0 requête, 0 octet | 0 / 0 | 0 |

L’interaction de 48 ms est le clic de navigation mobile vers Training. Son
traitement JavaScript vaut environ 4,5 ms et son délai de présentation environ
42 ms ; aucune longue tâche ne l’accompagne. Deux chunks Training et une image
non-poster sont voisins de l’interaction. Dans un passage B, Nutrition partage
le maximum de 48 ms. Aucun lecteur, poster ou transfert vidéo n’est présent
dans la fenêtre canonique : la variation est indépendante de `DeferredVideo`.
Le blocage et le préchauffage ne changent donc aucune requête du parcours et
aucun correctif applicatif vidéo n’est justifié.

Deux contrôles neufs, complets et consécutifs passent ensuite 79/79 sans
diagnostic : `_PpsGszLdiCClVl7EEBto` avec INP client `32/32/48 ms`, puis
`yJ62kxdndNlRX2xppcZi3` avec `32/32/32 ms`. Les deux médianes valent 32 ms ;
aucun budget, baseline, interaction ou fenêtre d’observation n’est modifié.

La preuve média séparée est enfin rejouée avec de vrais clics Playwright sous
`Ky_94DxnOzVtoy8WaJzNX` et `0RCJgkLlOyBcMr3tpQSzI`. Les deux exécutions
passent 1/1 et leurs contrôles passent 79/79. Les quatre parcours mobile/large
conservent zéro requête avant activation et après fermeture, le poster attendu
de 14 316 octets, puis une réponse vidéo 206. Trois réouvertures ne demandent
rien ; une réouverture large émet une plage 206 de 13 261 octets, jamais un
nouveau transfert complet de 1 127 373 octets.

## Limites et suite

- Les posters ne couvrent que les couples locaux vérifiés.
- Aucune miniature n’est dérivée d’une vidéo utilisateur ou Storage.
- Le cache statique local est à `max-age=0`.
- Le warning `getSession()` et le feedback 500 observés par le harnais sont
  historiques et hors périmètre.

Le [jalon stockage/CDN](./MEDIA_STORAGE_CDN_DEPLOYMENT.md) confirme désormais
sur un canary versionné `206`, `Accept-Ranges: bytes`, `Content-Range`, le type
réel, `MISS` puis `HIT` et le cache immuable. Les 17 posters utilisent le
domaine CDN avec leur chemin local conservé comme fallback ; aucun original
n'est supprimé.
