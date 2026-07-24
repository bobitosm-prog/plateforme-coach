# Inventaire et livraison des médias runtime

## Portée et commande

Cet inventaire couvre les médias locaux réellement déployables sous `public/`,
`app/` et `assets/`. Il est reproductible avec :

```bash
npm run perf:media:inventory -- perf/media/runtime-media-inventory.json
```

Le script détecte le type MIME réel avec `file`, les dimensions avec Sharp
(ImageMagick en repli), les informations vidéo avec `ffprobe`, puis calcule le
SHA-256. Il recherche les consommateurs dans `app/`, `lib/`, `public/`,
`scripts/` et `supabase/`. Il ne contacte aucun réseau et ne télécharge aucun
média distant, Storage ou utilisateur.

L’artefact détaillé
[`runtime-media-inventory.json`](../perf/media/runtime-media-inventory.json)
contient pour chaque fichier chemin, octets, type réel, dimensions, ratio,
alpha/orientation lorsque disponibles, codec, conteneur, durée, débit, piste
audio, consommateurs, route déductible et indices statiques de chargement,
preload, poster et dimensionnement. Une propriété `unknown` est conservée
quand le code ou une valeur issue de la base ne permet pas de conclure.

Quatre chemins concurrents sont exclus avant toute lecture ou métadonnée :

- `scripts/enrich-parent-exercises.mjs` ;
- `public/videos/exercises/developpe-couche-barre.jpg` ;
- `public/videos/exercises/developpe-couche-barre.mp4` ;
- `supabase/.temp/cli-latest`.

## Carte des catégories

Mesure du 24 juillet 2026, hors exclusions :

| Catégorie | Images | Vidéos | Total | Octets | Mio |
|---|---:|---:|---:|---:|---:|
| Assets versionnés de l’application | 102 | 0 | 102 | 72 901 243 | 69,52 |
| Médias d’exercice versionnés | 26 | 20 | 46 | 92 242 019 | 87,97 |
| **Total local inventorié** | **128** | **20** | **148** | **165 143 262** | **157,49** |

Les autres catégories sont volontairement séparées :

- les uploads et URLs utilisateurs restent des valeurs runtime, jamais
  téléchargées ni incorporées dans l’artefact ;
- les photos Supabase Storage restent des URLs publiques/signées produites à
  la frontière Storage ; aucune URL signée n’est journalisée ;
- les médias externes historiques sont seulement repérés par leurs
  consommateurs et domaines, sans récupération ;
- `public/guide-musculation.html`, `public/guide-nutrition.html`,
  `public/index-vitrine.html` et `public/vitrine.html` sont des consommateurs
  HTML autonomes, pas des sources dupliquées dans le total.

## Priorités mesurées

- 56 images dépassent 200 000 octets : 37 applicatives et 19 d’exercice.
- 5 vidéos dépassent 2 000 000 octets.
- 38 fichiers n’ont pas de référence statique détectable. Ce nombre est un
  signal d’audit, pas une preuve d’inutilité : les médias d’exercice peuvent
  être reliés par migrations, données ou conventions de slug.
- 22 familles partagent un même radical. Elles comprennent quatre couples
  source PNG / dérivé WebP et des couples poster/vidéo d’exercice ; elles ne
  sont pas qualifiées automatiquement de doublons visuels.

### Plus gros médias

| Fichier | Type réel | Dimensions | Octets | Statut |
|---|---|---:|---:|---|
| `public/images/hero-nutrition.png` | PNG | 2752×1536 | 9 331 853 | source ; WebP 800×447 présent |
| `public/videos/exercises/squat-barre.png` | PNG | 1600×2848 | 8 172 955 | image exercice |
| `public/images/hero-gym.png` | PNG | 2752×1536 | 7 978 510 | source ; WebP 800×447 consommé |
| `public/images/hero-coaching.png` | PNG | 2752×1536 | 7 921 232 | source ; WebP présent |
| `public/videos/exercises/souleve-de-terre.png` | PNG | 1728×2304 | 7 431 576 | image exercice |
| `public/images/hero-athlete.png` | PNG | 2752×1536 | 7 369 580 | source ; WebP présent |
| `public/videos/exercises/curl-halteres.jpg` | JPEG | 1728×2304 | 7 198 474 | image exercice |
| `public/videos/exercises/elevations-laterales-halteres.png` | PNG | 1728×2304 | 7 121 904 | image exercice |
| `public/videos/exercises/developpe-militaire-barre.png` | PNG | 1728×2304 | 6 767 790 | image exercice |
| `public/videos/exercises/tractions-pronation.png` | PNG | 1728×2304 | 6 700 843 | image exercice |

Les vidéos sont toutes H.264/MP4 dans le lot observé. Elles durent environ
8–10 secondes, vont de 496×864 à 1080×1920, et 17 sur 20 contiennent une piste
audio. La plus lourde est `squat-barre.mp4` (6 666 219 octets, 1080×1920,
8 secondes, audio présent).

## Doublons exacts

Quatre groupes SHA-256 sont conservés, sans suppression :

1. `public/favicon.png` et `public/logo-moovx-32.png` ;
2. `public/icon-192x192.png` et `public/logo-moovx-192.png` ;
3. `public/Moovx.png` et `public/logo-moovx.png` ;
4. `public/videos/exercises/dips.mp4` et
   `public/videos/exercises/tractions-pronation.mp4`.

Le dernier groupe peut indiquer une affectation de contenu erronée, mais il
n’est pas modifié sans validation métier. Les fichiers non référencés et
doublons exacts ne sont jamais supprimés dans cette tranche.

## Lot optimisé

### Logo local

Les rendus locaux de 24 à 88 px utilisaient le PNG 1000×1000 de 916 924
octets. Ils utilisent désormais le dérivé versionné 96×96 de 13 745 octets :

| Mesure | Avant | Après | Gain |
|---|---:|---:|---:|
| Réponse statique froide | 916 924 o | 13 745 o | −903 179 o (−98,50 %) |
| Nombre de requêtes par document | 1 | 1 | 0 |
| Ratio réservé | 1:1 | 1:1 | identique |

Les usages OG et HTML distants conservent la source haute définition. Les
éléments runtime possèdent `width` et `height`; aucun layout shift n’est
introduit.

Contrôle visuel effectué avec ImageMagick 7 : source réduite à 96×96 puis
comparaison côte à côte avec le dérivé existant. Le cadrage, le ratio, la
transparence, les couleurs et la silhouette sont conservés ; le dérivé est
légèrement plus net. Aucun nouveau fichier image, EXIF ou GPS n’est créé.

### Vidéos de feedback

Les vidéos utilisateur des vues secondaires coach et historique déclarent
désormais `preload="none"` et `playsInline`. Leur URL, contrôles, lecture à
l’action et cycle de montage restent inchangés. Cela interdit le préchargement
agressif avant intention sans capturer l’URL ni le contenu utilisateur.

Les vidéos d’exercice ouvertes dans une modale conservent leur comportement
historique `autoPlay`, mais leur source est désormais absente avant ouverture.
La politique, les 17 posters bornés et la preuve réseau sont documentés dans
[Diffusion vidéo différée](./PERFORMANCE_VIDEO_DELIVERY.md). Aucun fichier
vidéo n’est réencodé.

## Risques, exclusions et suites

- Les grands PNG héros sont conservés comme sources, car leurs WebP versionnés
  sont déjà les consommateurs runtime observés. Les supprimer demanderait une
  autorisation distincte.
- Les images d’exercice surdimensionnées nécessitent une validation catalogue
  et visuelle, notamment lorsque JPG, PNG et vidéo coexistent.
- Les 38 candidats non référencés nécessitent un audit des valeurs de base
  avant toute suppression.
- Les médias utilisateur, Storage et externes ne sont ni téléchargés ni
  transformés.
- Les deux médias concurrentiels `developpe-couche-barre.*` restent totalement
  hors inventaire et optimisation.

Les mesures de référence et leurs contraintes sont décrites dans
[Baseline de performance](./PERFORMANCE_BASELINE.md) et
[Budgets de performance](./PERFORMANCE_BUDGETS.md).

## Contrôle production

Le build Webpack hermétique produit 88 pages, les manifests complets et le
`BUILD_ID` `TlnL_LijclPSDyTfL5f3_`. Les 79 budgets passent.

| Mesure | Avant immédiat `epfY_tip_m72DIdGGJIoD` | Après |
|---|---|---|
| Client LCP | 452 / 360 / 324 ms | 384 / 344 / 328 ms |
| Client INP | 32 / 32 / 32 ms | 48 / 32 / 32 ms |
| Client CLS | 0,003886 / 0,003886 / 0,010764 | 0,003886 / 0,010764 / 0,010764 |
| Client requêtes totales / applicatives | 110/109/109 · 63/62/62 | identique |
| Coach LCP | 236 / 236 / 244 ms | 224 / 240 / 228 ms |
| Coach INP / CLS | 24/24/24 ms · 0/0/0 | identique |
| Coach requêtes totales / applicatives | 104/104/104 · 39/39/39 | identique |

Les fluctuations client INP/CLS restent dans les observations historiques et
les budgets ; aucune régression de requête n’est observée. Le bundle initial
après vaut 2 010 385 octets bruts / 591 421 gzip en union dédupliquée. Les
routes valent respectivement `/` 1 929 960 / 566 020, `/coach` 1 950 949 /
574 248 et `/client/[id]` 1 989 396 / 583 193 octets bruts/gzip. Les variations
de quelques octets face au contrôle précédent proviennent des littéraux de
chemin et attributs ; aucun budget ou artefact de référence n’est modifié.

La preuve réseau observe le même nombre de requêtes images/médias. Sur une
réponse statique froide, le corps PNG servi pour le logo passe exactement de
916 924 à 13 745 octets. Les vidéos de feedback ne sont pas chargées par les
parcours initiaux ; `preload="none"` est couvert statiquement sans capturer
leur URL utilisateur.

L’[étude stockage/CDN](./MEDIA_STORAGE_CDN_STUDY.md) recoupe cet inventaire :
165 143 262 octets publics sont éligibles au maximum, tandis que tous les
uploads utilisateur restent exclus. L’ADR accepté conserve les chemins locaux
comme rollback et exige un nom versionné par SHA-256 avant cache immuable.
Le jalon B a depuis chargé uniquement un canary et les 17 posters
(216 510 octets) sur R2 `eu`. Le [rapport de déploiement](./MEDIA_STORAGE_CDN_DEPLOYMENT.md)
prouve les hashes, le cache, le fallback et le rollback ; les 131 autres
médias publics et tous les médias privés restent exclus.
