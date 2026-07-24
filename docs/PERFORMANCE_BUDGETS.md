# Budgets de performance

La tranche de réduction des Client Components conserve ces seuils inchangés ;
voir [Frontières Client Components des routes critiques](./PERFORMANCE_CLIENT_BOUNDARIES.md).
Le dépassement INP froid client fait l'objet d'un
[diagnostic causal séparé](./PERFORMANCE_INP_DIAGNOSTIC.md). Le registre v2
contient une calibration unique, datée et bornée à cette métrique ; les
artefacts de mesure et tous les autres budgets restent inchangés.

## Rôle

Ces budgets sont des garde-fous locaux anti-régression dérivés des deux
[captures Phase 8](./PERFORMANCE_BASELINE.md). Ils ne constituent ni des p75
terrain ni les seuils Web Vitals généraux de Google. Le protocole est local,
sans throttling CPU ou réseau.

Ils protègent notamment les évolutions de la
[coque serveur du dashboard](./DASHBOARD_SERVER_SHELL.md) et des
[états de chargement par segment](./PERFORMANCE_SEGMENT_LOADING.md). Ils
protègent aussi les
[frontières d’erreur des domaines critiques](./PERFORMANCE_ERROR_BOUNDARIES.md).
Ils encadrent également le
[chargement différé des onglets et modales](./PERFORMANCE_LAZY_UI.md).
Le chargement à l’intention des bibliothèques fonctionnelles lourdes est
documenté dans
[Chargement différé des bibliothèques lourdes](./PERFORMANCE_HEAVY_LIBRARIES.md).
La taille disque et la stratégie de livraison des images et vidéos sont suivies
séparément dans [Inventaire des médias runtime](./PERFORMANCE_MEDIA_INVENTORY.md) ;
les seuils de ce document restent inchangés.

Le registre typé est dans `lib/performance/budgets/registry.ts`. La commande :

```bash
npm run perf:budget:check
```

vérifie par défaut les deux artefacts versionnés. Un futur artefact peut être
fourni directement :

```bash
npm run perf:budget:check -- chemin/mesure.json
```

La commande ne démarre ni build, navigateur, Supabase, serveur ou réseau.

## Formule

- valeur de référence : maximum observé sur les deux artefacts ;
- limite normale : plafond exact de `maximum × 1,10` ;
- compteurs inférieurs à 10 : au moins `maximum + 1` ;
- CLS : marge de 10 %, arrondie vers le haut au millième ;
- CLS coach nul : plancher explicite `0,001`, afin que zéro ne rende pas toute
  évolution impossible à exprimer ;
- chaque passage est vérifié, puis la médiane recalculée depuis les passages ;
- le total réseau est informatif car les assets statiques sont déjà couverts
  par les budgets bundle ; les requêtes applicatives et backend sont bloquantes.

La formule reste inchangée pour chaque garde-fou sauf l'INP client. Le registre
v2 porte explicitement la calibration locale `53/36 → 64/48 ms`, ses valeurs
antérieures, sa date et ses cinq preuves. Aucune limite n'est inférieure à une
observation existante. L'union bundle est
dédupliquée par fichier; elle n'est jamais comparée à la somme naïve des routes.

## Bundle gzip

Octets entiers :

| Route | Total | Propre à la route |
|---|---:|---:|
| Client `/` | 975 513 | 0 |
| Coach `/coach` | 985 288 | 9 775 |
| Détail `/client/[id]` | 1 013 943 | 38 430 |
| Union globale dédupliquée | 1 023 718 | — |

Le budget propre client reste zéro : les manifests observés ne déclarent aucun
chunk propre à `/` parmi les trois routes mesurées. Toute apparition devient
donc une évolution explicite à examiner.

## Web Vitals locaux

| Parcours | Mesure | Chaque passage | Médiane |
|---|---|---:|---:|
| Client mobile | LCP | 458 ms | 436 ms |
| Client mobile | INP | 64 ms | 48 ms |
| Client mobile | CLS | 0,012 | 0,012 |
| Coach desktop | LCP | 339 ms | 313 ms |
| Coach desktop | INP | 27 ms | 27 ms |
| Coach desktop | CLS | 0,001 | 0,001 |

Une métrique absente ou `null` produit `unavailable` et un code CLI non nul.
Elle n'est jamais convertie en zéro.

## Requêtes

| Parcours | Compteur | Chaque passage | Médiane | Autorité |
|---|---|---:|---:|---|
| Client mobile | Applicatives | 88 | 75 | Bloquant |
| Client mobile | Auth | 4 | 4 | Bloquant |
| Client mobile | PostgREST | 80 | 66 | Bloquant |
| Client mobile | Realtime | 4 | 4 | Bloquant |
| Client mobile | Next/API | 2 | 2 | Bloquant |
| Client mobile | Total réseau | 135 | 121 | Informatif |
| Coach desktop | Applicatives | 44 | 44 | Bloquant |
| Coach desktop | Auth | 7 | 7 | Bloquant |
| Coach desktop | PostgREST | 30 | 29 | Bloquant |
| Coach desktop | Realtime | 6 | 6 | Bloquant |
| Coach desktop | Next/API | 2 | 2 | Bloquant |
| Coach desktop | Total réseau | 119 | 118 | Informatif |

Le passage froid est le premier contexte neuf de chaque parcours. Les deuxième
et troisième passages sont également des contextes neufs, mais bénéficient des
caches processus/serveur : les plafonds par passage utilisent donc le maximum
des six observations, tandis que la médiane évite qu'un seul passage froid
devienne la seule référence.

## API

Le module `lib/performance/budgets` expose :

- `PERFORMANCE_BUDGETS` ;
- `validateBudgetRegistry(registry)` ;
- `validatePerformanceArtifact(input)` ;
- `checkPerformanceBudgets(input, registry?)` ;
- les types du registre, des artefacts, contrôles et résultats.

Le comparateur retourne une union discriminée `passed`, `failed`,
`unavailable` ou `invalid`. Chaque contrôle contient l'observation, la limite,
l'écart absolu et l'écart relatif lorsqu'il est calculable. Les contrôles et
violations sont triés par identifiant; aucune entrée n'est mutée. La CLI limite
l'affichage à vingt violations et n'imprime jamais l'artefact brut.

## Dettes conservées

Cette tranche ne corrige pas :

- les 42 à 72 appels PostgREST du parcours client ;
- la réponse 500 de `/api/feedback/mine` ;
- l'avertissement Supabase historique lié à `getSession()`.

La preuve de [diffusion vidéo différée](./PERFORMANCE_VIDEO_DELIVERY.md) passe
1/1 deux fois. Les deux contrôles initiaux à 78/79 sont conservés : leur INP
client médian valait 48 ms pour une limite de 36 ms. La matrice causale montre
zéro lecteur, poster, requête ou octet poster dans le parcours canonique, avec
la même médiane de 32 ms en normal, posters bloqués et cache préchauffé. Deux
contrôles finaux consécutifs passent 79/79. Aucun seuil média spécifique,
budget ou artefact de référence n’est modifié.

L’[étude stockage/CDN](./MEDIA_STORAGE_CDN_STUDY.md) ne modifie aucun seuil.
Après un déploiement explicitement approuvé, le canary puis chaque lot devront
passer les 79 contrôles existants avant activation et après rollback simulé.

L'optimisation des [polices locales](./LOCAL_FONT_HOSTING.md) ne modifie aucun
seuil. Un contrôle intermédiaire échoue 78/79 sur un LCP client froid à 464 ms
pour une limite de 458 ms. Deux contrôles indépendants suivants, BUILD_ID
`jQFvyWrYnL-uZkYVLpvFY` et `SGy66Cn-3N8fWsyXWIQQ4`, passent chacun 79/79 avec
six requêtes font client et douze coach.

La [comparaison Core Web Vitals avant/après](./PERFORMANCE_CWV_COMPARISON.md)
conserve les statuts historiques 78/79 sous les anciens plafonds `53/36`, puis
versionne la calibration `64/48`. Les deux références, les deux captures
initiales et les deux validations passent désormais 79/79 sans modification de
leurs octets. Cette décision ne s'étend à aucun autre parcours ou budget.
