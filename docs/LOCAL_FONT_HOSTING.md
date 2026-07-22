# Auto-hébergement des polices

## Objectif

Le build Next.js charge les cinq familles de l'application avec
`next/font/local`. Il ne dépend plus de Google Fonts au build ou au runtime.
Les variables CSS, poids, styles, `display: swap` et préchargements déclarés
avant la migration sont conservés.

La frontière unique est [`app/fonts.ts`](../app/fonts.ts). Les fichiers source
et leur licence SIL Open Font License 1.1 résident sous `app/fonts/` afin que
Next les transforme et les intègre directement au build.

Quatre pages HTML autonomes sous `public/` ne passent pas par le pipeline
Next. Elles chargent donc [`moovx-fonts.css`](../public/fonts/moovx-fonts.css),
qui expose sous leurs noms historiques des copies byte-identiques des six
assets qu'elles utilisent. Ces pages ne chargent pas Anton. Aucun écran ne
charge simultanément les sorties Next et cette feuille autonome.

## Contrat conservé

| Famille | Asset local | Poids/style | Variable CSS |
|---|---|---|---|
| Bebas Neue | `bebas-neue/BebasNeue-Regular.ttf` | 400 normal | `--font-display` |
| Barlow Condensed | `BarlowCondensed-Bold.ttf`, `BarlowCondensed-ExtraBold.ttf`, `BarlowCondensed-Black.ttf` | 700, 800, 900 normal | `--font-alt` |
| Outfit | `outfit/Outfit-Variable.ttf` | axe 300–600 normal | `--font-body` |
| DM Sans | `dm-sans/DMSans-Variable.ttf` | axe 400–700 normal | `--font-dm-sans` |
| Anton | `anton/Anton-Regular.ttf` | 400 normal | `--font-impact` |

Les fichiers variables Outfit et DM Sans couvrent exactement les plages de
poids demandées par l'application. Les cinq déclarations utilisent `swap`, le
préchargement Next et l'ajustement de fallback Arial, sans désactiver
`next/font`.

## Provenance et intégrité

Les sources ont été récupérées le 22 juillet 2026 depuis le dépôt officiel
[`google/fonts`](https://github.com/google/fonts), au commit
`966486d0728ceec5dc3b79cbad3073371bac51c0`. Chaque URL ci-dessous est épinglée
sur ce commit.

| Fichier | Source officielle | SHA-256 |
|---|---|---|
| `Anton-Regular.ttf` | [`ofl/anton`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/anton/Anton-Regular.ttf) | `a4ba3a92350ebb031da0cb47630ac49eb265082ca1bc0450442f4a83ab947cab` |
| `BarlowCondensed-Bold.ttf` | [`ofl/barlowcondensed`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/BarlowCondensed-Bold.ttf) | `e476562ec9c1e16cf16475895b511f08c804f438cc9a9f80a44ea50a0eeb5b65` |
| `BarlowCondensed-ExtraBold.ttf` | [`ofl/barlowcondensed`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/BarlowCondensed-ExtraBold.ttf) | `724c9c25952d5f4a2d87185d9767aa006144c5f0d944dc05bf7d5d603551c260` |
| `BarlowCondensed-Black.ttf` | [`ofl/barlowcondensed`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/barlowcondensed/BarlowCondensed-Black.ttf) | `e74b750df582c608f35db467b711b2b60d2217618e85e60b72b42dfd00446cab` |
| `BebasNeue-Regular.ttf` | [`ofl/bebasneue`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/bebasneue/BebasNeue-Regular.ttf) | `08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73` |
| `DMSans-Variable.ttf` | [`ofl/dmsans`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/dmsans/DMSans%5Bopsz,wght%5D.ttf) | `8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d` |
| `Outfit-Variable.ttf` | [`ofl/outfit`](https://github.com/google/fonts/blob/966486d0728ceec5dc3b79cbad3073371bac51c0/ofl/outfit/Outfit%5Bwght%5D.ttf) | `fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade` |

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

- le build Turbopack isolé ne tente aucun accès Google Fonts, mais reste sans
  progression observable dans `compile` et a été interrompu ;
- deux builds Webpack isolés compilent l'application avec succès en 16,5 s et
  16,0 s, sans tentative externe ;
- les deux échouent ensuite pendant le contrôle Next des types sur le même
  contrat `PageProps` préexistant dans `app/coach/page.tsx` ;
- aucun `BUILD_ID` ou manifest final n'est donc disponible et la validation de
  deux builds complets reste ouverte ;
- le contrôle visuel via le navigateur intégré n'était pas disponible dans la
  session. Aucune comparaison visuelle n'est revendiquée.

Les anciens liens des pages HTML autonomes demandaient Outfit italique 300,
mais la famille officielle épinglée ne fournit aucun fichier italique. Ces
pages conservent leurs règles CSS et le navigateur peut synthétiser l'italique
depuis Outfit normal 300. Cette variation potentielle reste à vérifier
visuellement; aucun faux fichier italique n'a été créé.

La correction du contrat de page est volontairement laissée à une tranche
séparée : aucun contrôle de type n'est désactivé pour faire passer le build.

Cette tranche ne capture aucune taille de bundle ni Web Vital. La méthode de
mesure reste décrite dans [Baseline de performance](./PERFORMANCE_BASELINE.md).
