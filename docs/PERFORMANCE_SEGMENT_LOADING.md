# États de chargement par segment

## Portée

Les frontières App Router de cette tranche couvrent uniquement les segments
importants dont le chargement est traversé par les parcours de la
[baseline de performance](./PERFORMANCE_BASELINE.md) :

| Segment | Frontière | Justification |
|---|---|---|
| `/coach` | `app/coach/loading.tsx` | Entrée coach mesurée, puis navigation entre sections chargées à la demande. |
| `/client/[id]` | `app/client/[id]/loading.tsx` | Navigation coach vers un détail autorisé mesuré séparément. |

Les deux fichiers composent `DashboardSegmentLoading`, une vue serveur neutre.
Elle réserve un rail desktop, un en-tête, quatre blocs synthétiques et un bloc
large. Sur mobile, le rail disparaît et la grille passe à deux colonnes. La
géométrie ne dépend d'aucune donnée ou mesure navigateur.

Le statut accessible est annoncé par `role="status"`, `aria-busy="true"` et un
libellé propre au segment. Les formes sont masquées aux technologies
d'assistance. Elles ne contiennent ni identité, profil, nombre, valeur métier
ou contenu supposé. Aucune animation n'est utilisée.

## Frontières volontairement exclues

| Segment | Motif |
|---|---|
| `/` | La [coque serveur du dashboard](./DASHBOARD_SERVER_SHELL.md) possède déjà un `Suspense` et `DashboardServerFallback`. Un `app/loading.tsx` dupliquerait ce contrat et s'appliquerait aussi aux routes enfants. |
| `/login` | Le contrôle d'authentification et son état visuel appartiennent au contenu client existant; ce parcours n'est pas une route de la baseline Phase 8. |
| `/join`, `/register-client` | Les flux d'invitation/inscription ont déjà leurs propres attentes ou `Suspense`; une coque générique risquerait un flash avant leur autorité. |
| `/onboarding*` | Les états d'onboarding et de photo sont pilotés localement et ne doivent pas apparaître avant validation du profil. |
| `/[locale]/*` | Les pages marketing et légales ne font pas partie des trois routes applicatives budgétées. |
| `/admin/*`, `/weekly-diagnostic/[id]` | Ces routes ne sont pas présentes dans les parcours de référence et n'ont pas de preuve de chargement important dans cette tranche. |

L'exclusion ne signifie pas qu'aucune frontière ne sera jamais utile. Elle
évite d'ajouter un état de chargement sans mesure ni contrat de navigation.

## Interaction avec les états existants

Le fallback de segment couvre la résolution App Router et le chargement du
module de route. Il ne remplace pas :

- le chargement Auth/rôle et `CoachSectionFallback` dans l'espace coach ;
- `ClientDetailLoadingView`, qui couvre la lecture owner-scoped du détail ;
- `DashboardServerFallback`, qui couvre l'initialisation de la racine.

Ces frontières ont des phases et des autorités distinctes. Le composant partagé
n'importe donc aucun orchestrateur, hook, repository, Supabase, API navigateur
ou client de données. Il n'effectue aucune requête.

## Contrôle

Les gardes statiques imposent une unique exportation de chargement par segment,
l'absence de `app/loading.tsx`, les exclusions documentées, les imports
interdits et une limite de 200 lignes. Les tests de rendu serveur vérifient les
libellés accessibles et la géométrie mobile/desktop.

Le build Webpack de production et les parcours coach/client sont les autorités
de validation. Toute mesure postérieure doit rester sous les
[budgets anti-régression](./PERFORMANCE_BUDGETS.md). La prochaine tranche est
l'ajout d'`error.tsx` aux domaines critiques, documenté dans
[Frontières d’erreur des domaines critiques](./PERFORMANCE_ERROR_BOUNDARIES.md)
et indépendant de ces fallbacks.

## Contrôle du 23 juillet 2026

Le build isolé `eeAhYDKa0wvv4MoQCw3x1` contient un `BUILD_ID`, les manifests
attendus et les deux conventions `loading.tsx` dans les arbres de route. Deux
contrôles temporaires complets ont ensuite produit les `BUILD_ID`
`KvRuqM1lWSwpI8u7reYl-` et `QGt3rAkmwF6V1zxtxQBJa`.

Les octets des deux contrôles sont identiques :

| Route | Brut | Gzip | Écart gzip face à la baseline principale |
|---|---:|---:|---:|
| `/` | 3 087 953 | 887 233 | +409 (+0,05 %) |
| `/coach` | 3 111 466 | 896 119 | +409 (+0,05 %) |
| `/client/[id]` | 3 237 041 | 922 169 | +409 (+0,04 %) |
| Union dédupliquée | 3 260 554 | 931 055 | +409 (+0,04 %) |

Les résultats Web Vitals restent dans l'enveloppe observée :

| Contrôle | Client LCP / CLS | Coach LCP / CLS | Budget |
|---|---|---|---|
| 1 | `432/384/388 ms` / `0,003886/0,010764/0,010764` | `292/252/232 ms` / `0/0/0` | deux fluctuations INP au-dessus des seuils stricts |
| 2 | `420/356/380 ms` / `0,003886/0,010764/0,010764` | `300/252/228 ms` / `0/0/0` | 79/79 contrôles verts |

Le premier contrôle a observé une médiane INP client de 48 ms et un passage
coach à 32 ms, sans modification des interactions. Le second contrôle
indépendant retrouve `48/32/32 ms` côté client et `16/24/24 ms` côté coach et
passe les 79 budgets. Cette variabilité est conservée; elle n'est pas masquée
ni attribuée causalement aux vues serveur.

Le parcours production visite trois fois `/coach`, puis `/client/[id]`, et
atteint la fiche sans fallback bloqué. Un scénario E2E technique dédié vérifie
en plus navigation, retour arrière et détail indisponible; dans chacun de ces
états terminaux, aucun `[data-dashboard-segment-loading]` ne subsiste.
