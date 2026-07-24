# Auto-hébergement des polices

## Objectif

Le build Next.js charge les cinq familles de l'application avec
`next/font/local`. Il ne dépend plus de Google Fonts au build ou au runtime.
Les variables CSS, poids, styles, `display: swap` et préchargements déclarés
avant la migration sont conservés.

La frontière unique est [`app/fonts.ts`](../app/fonts.ts). Une seule copie des
fichiers source réside sous `public/fonts/moovx/` : Next la transforme pour
l'App Router et les pages HTML autonomes la servent directement. Les licences
SIL Open Font License 1.1 restent sous `app/fonts/`.

Quatre pages HTML autonomes sous `public/` ne passent pas par le pipeline
Next. Elles chargent donc [`moovx-fonts.css`](../public/fonts/moovx-fonts.css),
qui expose sous leurs noms historiques des copies byte-identiques des six
assets qu'elles utilisent. Ces pages ne chargent pas Anton. Aucun écran ne
charge simultanément les sorties Next et cette feuille autonome.

## Contrat conservé

| Famille | Asset local | Poids/style | Variable CSS |
|---|---|---|---|
| Bebas Neue | `public/fonts/moovx/BebasNeue-Regular.ttf` | 400 normal | `--font-display` |
| Barlow Condensed | `BarlowCondensed-Bold.ttf`, `BarlowCondensed-ExtraBold.ttf` | 700, 800 normal | `--font-alt` |
| Outfit | `public/fonts/moovx/Outfit-Variable.ttf` | axe 300–600 normal | `--font-body` |
| DM Sans | `public/fonts/moovx/DMSans-Variable.ttf` | axes `opsz`, `wght`; plage CSS 400–700 | `--font-dm-sans` |
| Anton | `public/fonts/moovx/Anton-Regular.ttf` | 400 normal | `--font-impact` |

Les fichiers variables Outfit et DM Sans couvrent les plages de poids
demandées par l'application. Les cinq déclarations utilisent `swap`, le
préchargement Next et l'ajustement de fallback Arial, sans désactiver
`next/font`. Barlow Condensed 900 n'est référencé nulle part dans `app/` :
il reste uniquement dans la feuille des pages autonomes, où deux vitrines
l'utilisent réellement.

## Provenance et intégrité

Les sources ont été récupérées le 22 juillet 2026 depuis le dépôt officiel
[`google/fonts`](https://github.com/google/fonts), au commit
`966486d0728ceec5dc3b79cbad3073371bac51c0`. Chaque URL ci-dessous est épinglée
sur ce commit.

| Fichier | Source officielle | SHA-256 |
|---|---|---|
| `Anton-Regular.ttf` (170 812 octets) | [`ofl/anton`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/anton/Anton-Regular.ttf) | `a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab` |
| `BarlowCondensed-Bold.ttf` (109 912) | [`ofl/barlowcondensed`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/BarlowCondensed-Bold.ttf) | `e476562ec9c1e16cf16475895b511f08c804f438cc9a9f80a44ea50a0eeb5b65` |
| `BarlowCondensed-ExtraBold.ttf` (110 296) | [`ofl/barlowcondensed`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/BarlowCondensed-ExtraBold.ttf) | `724c9c25952d5f4a2d87185d9767aa006144c5f0d944dc05bf7d5d603551c260` |
| `BarlowCondensed-Black.ttf` (110 828) | [`ofl/barlowcondensed`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/BarlowCondensed-Black.ttf) | `e74b750df582c608f35db467b711b2b60d2217618e85e60b72b42dfd00446cab` |
| `BebasNeue-Regular.ttf` (61 400) | [`ofl/bebasneue`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/bebasneue/BebasNeue-Regular.ttf) | `08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73` |
| `DMSans-Variable.ttf` (240 164) | [`ofl/dmsans`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/dmsans/DMSans%5Bopsz,wght%5D.ttf) | `8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d` |
| `Outfit-Variable.ttf` (110 884) | [`ofl/outfit`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/outfit/Outfit%5Bwght%5D.ttf) | `fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade` |

Chaque répertoire de famille contient le fichier `OFL.txt` provenant du même
répertoire et du même commit officiel. Le test
[`local-font-hosting.test.ts`](../tests/unit/local-font-hosting.test.ts) vérifie
la présence des cinq licences et les empreintes de tous les assets.

| Licence | Source officielle | SHA-256 |
|---|---|---|
| Anton `OFL.txt` | [`ofl/anton/OFL.txt`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/anton/OFL.txt) | `ee67e6ee22790b7929f1a3769ca2801d565c64b5a9096942c1adf5596de9c9e4` |
| Barlow Condensed `OFL.txt` | [`ofl/barlowcondensed/OFL.txt`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/OFL.txt) | `186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f` |
| Bebas Neue `OFL.txt` | [`ofl/bebasneue/OFL.txt`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/bebasneue/OFL.txt) | `72082f6cb4d04be2ecf7cc7d9e1e7d73787f0af8a5a278a47cade70c16b78341` |
| DM Sans `OFL.txt` | [`ofl/dmsans/OFL.txt`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/dmsans/OFL.txt) | `9af36190332437f5ecd09974de43c1f7c77a310a996cdd8ceb25628b458840e1` |
| Outfit `OFL.txt` | [`ofl/outfit/OFL.txt`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/outfit/OFL.txt) | `c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416` |

## Validation hermétique

La validation recherche aussi toute importation Google Fonts ou origine CSS et
font distante dans le runtime, puis doit contrôler les manifests et le
`BUILD_ID` de chaque build complet.

`MOOVX_BUILD_DIR` permet d'isoler cette validation du répertoire `.next`
utilisé par le développement. Cette variable ne change ni le contenu ni la
configuration fonctionnelle du build; elle ne fait que sélectionner `distDir`.

### Résultat du 22 juillet 2026

- le contrat App Router de `/coach` est corrigé : le default export de
  `app/coach/page.tsx` n'accepte plus de prop applicative et le seam
  `initialSession` typé `Session` réside dans `CoachPageContent` ;
- deux builds Webpack de production isolés réussissent intégralement. La
  compilation dure 17,2 s puis 16,9 s; contrôle de types, collecte des données,
  génération des 88 pages, optimisation et traces sont finalisés ;
- les `BUILD_ID` sont `TKrTRWcoNZF5SHAnHD1Bq` et
  `yezBZgbPeew6lpeP7jjbi`. Les manifests build, routes, prerender, App Router et
  polices sont présents et non vides ;
- aucun import, domaine ou artefact Google Fonts n'est trouvé dans les sorties.
  Les builds s'exécutent dans le sandbox sans réseau externe et avec la
  télémétrie Next désactivée ;
- le contrôle visuel via le navigateur intégré n'était pas disponible dans la
  session. Aucune comparaison visuelle n'est revendiquée.

Les anciens liens des pages HTML autonomes demandaient Outfit italique 300,
mais la famille officielle épinglée ne fournit aucun fichier italique. Ces
pages conservent leurs règles CSS et le navigateur peut synthétiser l'italique
depuis Outfit normal 300. Cette variation potentielle reste à vérifier
visuellement; aucun faux fichier italique n'a été créé.

Webpack est sélectionné avec l'option officielle `next build --webpack` de
Next.js 16.1.6, car le build Turbopack observé précédemment ne progressait pas.
Aucun contrôle de type n'est désactivé et aucun comportement de production
n'est modifié pour effectuer cette sélection de mesure.

Cette tranche ne capture aucune taille de bundle ni Web Vital. La méthode de
mesure reste décrite dans [Baseline de performance](./PERFORMANCE_BASELINE.md).

## Optimisation du 24 juillet 2026

### Inventaire et décision

Le dépôt ne contient aucune source WOFF2 applicative : les sept sources
officielles sont des TTF. Next les émet sous des noms de contenu `.p.ttf`.
Les seules WOFF2 découvertes appartiennent aux outils de développement dans
`node_modules` et ne sont pas des assets MoovX.

Avant optimisation, six sources étaient copiées byte pour byte sous
`app/fonts/` et `public/fonts/moovx/`. Anton n'existait que côté App Router.
Le total versionné atteignait 1 657 780 octets. Après déplacement d'Anton et
résolution Next vers le répertoire public partagé, une seule copie des sept
sources subsiste : 914 296 octets, soit −743 484 octets (−44,848 %).

Le scan des styles trouve des usages applicatifs de Barlow 700 et 800, mais
aucun 900. Le 900 reste nécessaire aux deux vitrines HTML. Il est donc retiré
uniquement de `next/font/local`, pas de la feuille autonome. Le payload
préchargé par document Next passe de 914 296 à 803 468 octets, soit
−110 828 octets (−12,122 %) et une requête de moins.

Aucun subset n'est généré : aucun outil local de sous-ensemble n'était
disponible et la tranche interdit d'en télécharger un. Les glyphes et tables
des six faces encore servies par Next sont byte-identiques à l'état initial.
Les axes variables ne sont pas réécrits : Outfit conserve `wght`, DM Sans
conserve `opsz` et `wght`.

### Contrat de caractères

[`font-contract.ts`](../lib/performance/font-contract.ts) définit le corpus
exécutable :

- français, accents majuscules/minuscules, ligatures `Œ/œ` et `Æ/æ` ;
- allemand/suisse courant, dont `ß/ẞ` ;
- portugais courant ;
- chiffres, ponctuation, apostrophes droite/typographique et tirets ;
- euro, dollar, livre, yen, franc et libellé CHF ;
- `kg`, `kcal`, `cm` et `ml`.

Chaque caractère possède un glyphe dans au moins une famille locale. Toutes
les piles se terminent par `Arial, sans-serif`. Arabe, cyrillique, CJK et
devanagari ne sont pas revendiqués par les polices MoovX et passent
explicitement au fallback système pour les contenus utilisateurs.

Les limites constatées par famille sont conservées, pas masquées :
Barlow Condensed ne contient pas `ẞ`, Bebas Neue et DM Sans ne contiennent pas
`₣`, Outfit ne contient ni `‰` ni `₣`. Le fallback couvre ces cas.

### Reproductibilité

Les sources ne sont pas régénérées : leur optimisation consiste en une
déduplication et une sélection de poids. Deux passages déterministes vérifient
les mêmes tailles et SHA-256 via :

```bash
npm test -- tests/unit/local-font-hosting.test.ts \
  tests/unit/font-payload-optimization.test.ts
```

La preuve visuelle/réseau optionnelle s'exécute avec le build de production :

```bash
MOOVX_FONT_EVIDENCE_PATH=/tmp/moovx-font-evidence.json \
MOOVX_FONT_SCREENSHOT_DIR=/tmp/moovx-font-screens \
npm run perf:baseline -- --output /tmp/moovx-font-control.json
```

Elle couvre client, coach, login, onboarding, landing localisée, les quatre
HTML autonomes et un spécimen des cinq familles. Le navigateur bloque les
service workers et toute origine externe ; les origines historiques bloquées
sont consignées sans être contactées. Aucun caractère de remplacement `U+FFFD`
n'est observé.

### Résultats

| Mesure | Avant | Après |
|---|---:|---:|
| Sources versionnées | 1 657 780 octets | 914 296 octets |
| Payload préchargé Next/document | 914 296 octets | 803 468 octets |
| Requêtes fonts client | 7/7/7 | 6/6/6 |
| Requêtes fonts coach | 14/14/14 | 12/12/12 |
| Preloads Next/document | 7 | 6 |

Le premier contrôle après optimisation observe un LCP client isolé à 464 ms
pour une limite de 458 ms ; les deux autres passages valent 360 et 356 ms.
Il est conservé comme observation et ne justifie aucun changement de budget.
Le contrôle indépendant suivant passe 79/79. Les BUILD_ID, Web Vitals et
octets réseau sont consignés dans la session et la baseline de performance.

L'inspection des captures confirme la présence des accents, graisses,
crénages, chiffres, montants et unités sans tofu. Puisque chaque face utilisée
reste byte-identique, aucune modification de métrique, largeur, baseline ou
retour à la ligne n'est introduite par la déduplication. Aucun faux gras ou
faux italique supplémentaire n'est créé ; la dette historique de l'italique
Outfit synthétique des HTML autonomes reste documentée.
