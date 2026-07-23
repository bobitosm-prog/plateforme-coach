# Chargement différé des onglets et modales secondaires

## Périmètre

Cette tranche réduit le JavaScript initial des trois routes de référence sans
modifier leurs données, leurs autorités ou leurs contrats publics. Les
composants initiaux restent synchrones :

- `/` : coque, navigation, `HomeTab`, profil, paywall, feedback global et chat ;
- `/coach` : coque, navigation et accueil coach ;
- `/client/[id]` : contrôle d'accès, états de route et onglet aperçu.

Les états `loading.tsx`, `error.tsx`, l'authentification et les contrôles de
permission ne sont jamais différés.

## Frontières retenues

### Dashboard client

`TrainingTab`, `NutritionTab`, `ProgressTab`, `ProfileTab`, `MessagesTab`,
`FeedbackTab`, `PreferencesTab`, `AccountSection`, `GoalsSection` et
`AccountTab` utilisent des imports `next/dynamic` au niveau module.
`WorkoutSession`, les modales poids/mensurations/BMR/objectif, le scanner
code-barres et la célébration de badge ne sont rendus que lorsque leur état
d'ouverture l'exige.

Le préchargement automatique des onglets voisins après trois secondes a été
retiré : il téléchargeait les chunks secondaires même sans intention
utilisateur. Les onglets déjà visités restent montés comme auparavant, donc
leur état local est conservé et leur réouverture ne recharge ni chunk ni
donnée.

### Dashboard coach

Les huit sections coach étaient déjà découpées selon
[Sections différées de la page coach](./COACH_PAGE_LAZY_SECTIONS.md). La tranche
ne réimplémente pas ce mécanisme. Elle ajoute une preuve navigateur de
`Clients`, `Messages`, du retour à l'accueil puis de la réouverture.

### Détail client

`ClientOverview` reste initial. Programme, progression, nutrition, messages et
notes sont différés. Le groupe d'overlays profil/catalogue/IA/template est
différé et n'est monté que lorsqu'au moins un de ses cinq états est ouvert.
La décision pure `hasOpenClientDetailOverlay` ne porte aucune autorité métier.

Tous les imports dynamiques conservent le SSR par défaut. L'unique
`ssr: false` observé reste l'exception historique du dashboard coach, qui
dépend du navigateur ; aucune nouvelle exception n'a été ajoutée.

## Fallback

`DeferredContentFallback` est neutre, stable et accessible :

- `role="status"` et `aria-live="polite"` ;
- géométrie réservée pour une section ou un overlay ;
- aucun accès Supabase, repository, navigateur ou donnée utilisateur ;
- aucune requête, mutation ou souscription.

Les textes français, la navigation, les gestes mobiles, les callbacks et les
états métier existants restent portés par leurs composants d'origine.

## Preuve runtime

Le scénario production Webpack
`e2e/performance-lazy-secondary-ui.spec.ts` bloque toute origine externe et
enregistre les requêtes JavaScript et données par phase.

| Parcours | Initial | Premier affichage | Réouverture |
|---|---:|---|---|
| Client mobile → Training | 28 scripts | 3 chunks (`2170a4aa`, `2408`, `7744`) | 0 chunk, 0 requête de données |
| Client mobile → Nutrition | après changement rapide | 2 chunks (`9224`, `9527`) | — |
| Coach desktop → Clients | 24 scripts | 1 chunk (`6317`) | 0 chunk, 0 requête de données |
| Coach desktop → Messages | après Clients | 2 chunks (`3120`, `4514`) | — |
| Détail client → Programme | 19 scripts | 1 chunk (`2348`) | 0 chunk, 0 requête de données |
| Détail client → Nutrition | après Programme | 1 chunk (`5139`) | — |
| Détail client → overlay | 19 scripts | 2 chunks (`6539`, `8559`) | 0 chunk, 0 requête de données |

Les noms complets sont hashés par build ; les préfixes ne constituent pas une
API. Le harnais historique ne capturait pas `transferSize` par interaction :
aucun octet navigateur antérieur n'est donc inventé. Les tailles reproductibles
ci-dessous proviennent des manifests et du gzip niveau 9.

## Bundle avant/après

Référence avant extraction : contrôle des frontières d'erreur, `BUILD_ID`
`0M7ff9iMf0u6GjvJ6hjs7`. Contrôle final : `BUILD_ID`
`miv4lys-1k6ofBZT3gFNq`.

| Route | Avant brut / gzip | Après brut / gzip | Réduction brut / gzip |
|---|---:|---:|---:|
| `/` | 3 090 149 / 888 191 o | 1 930 419 / 566 219 o | 37,530 % / 36,250 % |
| `/coach` | 3 114 003 / 897 342 o | 1 951 405 / 574 444 o | 37,335 % / 35,984 % |
| `/client/[id]` | 3 239 586 / 923 399 o | 1 996 459 / 584 999 o | 38,373 % / 36,647 % |
| union dédupliquée | 3 263 440 / 932 550 o | 2 017 445 / 593 224 o | 38,180 % / 36,387 % |

Le contrôle final passe les 79 budgets. Client mobile : LCP
`368/324/308 ms`, INP `48/32/32 ms`, CLS
`0,003886/0,010764/0,010764`, requêtes `111/110/110` dont `63/62/62`
applicatives. Coach desktop : LCP `220/236/224 ms`, INP `24/24/24 ms`, CLS
nul, requêtes `107/104/104` dont `42/39/39` applicatives.

Un contrôle précédent du même code applicatif a subi deux fluctuations
ponctuelles LCP/INP ; aucun seuil ni artefact de référence n'a été modifié. Le
second contrôle complet stabilisé est retenu.

## Limites

- Les routes conservent encore un îlot client important et de nombreux chunks
  partagés.
- Les requêtes PostgREST, l'erreur historique `/api/feedback/mine` et les
  avertissements Supabase `getSession()` ne relèvent pas de cette tranche.
- Recharts, MediaPipe, QR et XLSX sont traités dans
  [Chargement différé des bibliothèques lourdes](./PERFORMANCE_HEAVY_LIBRARIES.md).
- Les trois avertissements ESLint `no-img-element` du dashboard client sont
  historiques et inchangés.
