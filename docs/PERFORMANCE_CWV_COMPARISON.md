# Comparaison Core Web Vitals Phase 8

> État au 24 juillet 2026 : comparaison finale reproductible publiée à partir
> des deux validations anti-cherry-picking. La calibration locale INP client
> `53/36 → 64/48 ms` est acceptée et versionnée ; tous les autres budgets
> restent inchangés.

## Sources et protocole

Avant, immuable :

- `phase-8-baseline-run-1.json`, BUILD_ID `3SsmZGs4buSrw3lXUjHJu` ;
- `phase-8-baseline-run-2.json`, BUILD_ID `trz-4UEZ9K_w9uD-xZKhc`.

Après validation :

- `phase-8-after-validation-run-1.json`, BUILD_ID
  `NylPNRZFx9HmPOvYtl5H5` ;
- `phase-8-after-validation-run-2.json`, BUILD_ID
  `eluwqnitSMMb4YQUA70Pb`.

Chaque artefact provient d'un build Next.js 16.1.6 production Webpack et de
trois contextes Chromium indépendants par parcours. Les versions sont Node
v24.14.0, npm 11.9.0, Playwright ^1.61.1 et Chromium 149.0.7827.55. Timezone
`Europe/Zurich`, viewport client 390×844, coach 1440×900, réseau local
uniquement. Aucun tracing, blocage, préchargement diagnostique, cache
artificiellement chauffé ou attente supplémentaire n'est actif.

Les passages 1 et 4 sont froids. Les autres utilisent des contextes navigateur
neufs mais bénéficient des caches processus/serveur. Avec six observations
locales, aucune significativité statistique ni attribution causale n'est
revendiquée.

## Core Web Vitals

### Client mobile

| Métrique | Avant, six observations | Après validation, six observations |
|---|---|---|
| LCP (ms) | `416/396/376/416/352/328` | `384/304/308/336/308/340` |
| INP (ms) | `48/32/32/48/32/32` | `48/32/32/32/48/48` |
| CLS | `0,003886/0,010764/0,010764/0,003886/0,010764/0,010764` | identique |

| Métrique | Avant min/médiane/max | Après min/médiane/max | Delta médian |
|---|---:|---:|---:|
| LCP | `328/386/416 ms` | `304/322/384 ms` | `−64 ms` (`−16,580 %`) |
| INP | `32/32/48 ms` | `32/40/48 ms` | `+8 ms` (`+25 %`) |
| CLS | `0,003886/0,010764/0,010764` | identique | `0` |

LCP froid : `416/416 → 384/336 ms`. INP froid :
`48/48 → 48/32 ms`. La distribution INP après reste quantifiée par paliers
32/48 ms ; les captures initiales conservées contiennent aussi le palier 64 ms.

### Coach desktop

| Métrique | Avant, six observations | Après validation, six observations |
|---|---|---|
| LCP (ms) | `284/220/292/276/308/224` | `220/224/228/244/212/216` |
| INP (ms) | `24/24/24/24/24/24` | identique |
| CLS | `0/0/0/0/0/0` | identique |

| Métrique | Avant min/médiane/max | Après min/médiane/max | Delta médian |
|---|---:|---:|---:|
| LCP | `220/280/308 ms` | `212/222/244 ms` | `−58 ms` (`−20,714 %`) |
| INP | `24/24/24 ms` | identique | `0` |
| CLS | `0/0/0` | identique | `0` |

## Bundle et requêtes

| Bundle gzip | Avant médian | Après | Delta |
|---|---:|---:|---:|
| Client | 886 827 | 566 007 | −320 820 (`−36,176 %`) |
| Coach | 895 713 | 574 235 | −321 478 (`−35,891 %`) |
| Détail client | 921 763 | 583 180 | −338 583 (`−36,732 %`) |
| Union dédupliquée | 930 649 | 591 408 | −339 241 (`−36,452 %`) |

| Requêtes médianes | Client avant → après | Coach avant → après |
|---|---:|---:|
| Total | `107 → 108` | `107 → 102` |
| Applicatives | `65 → 62` | `40 → 39` |
| Auth | `3 → 3` | `5,5 → 5` |
| PostgREST | `57 → 54` | `26 → 26` |
| Realtime | `3 → 3` | `5 → 5` |
| Next/API | `1 → 1` | `1 → 1` |
| JavaScript | `28 → 32` | `48 → 46` |
| Polices | `7 → 6` | `14 → 12` |
| Images/médias | `6 → 7` | `3,5 → 3` |

## Calibration INP locale

Le registre v2 applique uniquement à `clientMobile.vitals.inp` :

- ancien plafond par passage/médiane : `53/36 ms` ;
- nouveau plafond par passage/médiane : `64/48 ms`.

La décision est une calibration unique du harnais local après la campagne
anti-cherry-picking, pas un seuil terrain générique. Elle repose sur :

- les paliers observés 32/48/64 ms ;
- une médiane agrégée de validation à 40 ms ;
- la variance concentrée dans `presentationDelay` ;
- aucune long task ni Long Animation Frame ;
- aucune image, ressource ou chunk causalement démontré ;
- aucun changement fonctionnel, de clic ou d'observer ;
- aucune troisième campagne.

Les captures initiales restent byte-identiques :

- `phase-8-after-initial-run-1.json`, ancien statut 78/79 ;
- `phase-8-after-initial-run-2.json`, ancien statut 78/79.

La validation 1 était déjà 79/79. La validation 2 était 78/79 avec l'ancien
plafond médian de 36 ms. Après calibration, les six artefacts existants passent
79/79 sans modification de leurs mesures.

## Reproductibilité

`npm run perf:compare` utilise les deux validations et écrit
`phase-8-comparison.json`. Deux générations consécutives produisent le SHA-256
`e0d89784a31da139c56d7d35aff6c6a65c8825546b33cec433f18e7851cd88ff`.

```bash
npm run perf:compare
npm run perf:budget:check -- \
  perf/baseline/phase-8-baseline-run-1.json \
  perf/baseline/phase-8-baseline-run-2.json \
  perf/baseline/phase-8-after-initial-run-1.json \
  perf/baseline/phase-8-after-initial-run-2.json \
  perf/baseline/phase-8-after-validation-run-1.json \
  perf/baseline/phase-8-after-validation-run-2.json
```

## Interprétation et limite de clôture

Le bundle baisse structurellement d'environ 36 %, les requêtes applicatives
diminuent de 65 à 62 côté client et de 40 à 39 côté coach. Le LCP médian
diminue, sans preuve causale. L'INP client médian passe de 32 à 40 ms tout en
restant dans la dispersion avant/après documentée.

La tâche de comparaison est close. L'audit de la définition de terminé Phase 8
reste toutefois distinct : le gain LCP mobile médian mesuré est 16,580 %, sous
la cible roadmap de 20 %, et cet échantillon local `n=6` ne démontre pas un
p75 terrain. RC1 doit décider comment démontrer ou traiter ce critère sans
réinterpréter les mesures présentes.
