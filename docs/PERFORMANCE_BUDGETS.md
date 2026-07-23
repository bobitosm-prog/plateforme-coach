# Budgets de performance

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

Aucune limite n'est inférieure à une observation existante. L'union bundle est
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
| Client mobile | INP | 53 ms | 36 ms |
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
