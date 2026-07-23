# Frontières d’erreur des domaines critiques

## Inventaire et sélection

Les trois routes applicatives des
[parcours de référence](./PERFORMANCE_BASELINE.md) sont évaluées :

| Portée | Frontière | Décision |
|---|---|---|
| Arbre racine, dont `/` | `app/error.tsx` | Filet global existant conservé et durci. Son texte reste compatible avec auth, invitation et onboarding, car il ne mentionne aucune identité, autorité ou ressource. |
| `/coach` | `app/coach/error.tsx` | Incluse : les erreurs de rendu de la page, de son orchestrateur ou du chargement des sections n’avaient pas de frontière App Router propre. |
| `/client/[id]` | `app/client/[id]/error.tsx` | Incluse : les erreurs de rendu du détail et de ses overlays n’étaient pas représentées par l’état métier « indisponible ». |

Le filet global ne devient pas une frontière spécifique au dashboard client :
`app/error.tsx` couvre tous les segments sous `app/layout.tsx`. Aucun route group
n’est créé. Les frontières imbriquées coach et détail client capturent en
priorité leurs erreurs de rendu; le filet global reste générique pour les
autres segments.

## États volontairement distincts

Ces frontières ne remplacent pas :

- `DashboardProfileError`, qui représente une panne récupérable de lecture du
  profil et conserve la session ;
- l’absence confirmée de profil, l’onboarding et le paywall ;
- `ClientDetailUnavailableView`, qui représente une absence, un refus
  d’autorisation ou une lecture impossible sans révéler de ressource protégée ;
- les [états de chargement par segment](./PERFORMANCE_SEGMENT_LOADING.md) ;
- les fallbacks dynamiques internes à l’espace coach.

Un refus RLS ou un client étranger continue donc à suivre le contrat
`ClientDetailUnavailableView`. Il ne devient pas une erreur technique App
Router.

## Architecture

Chaque `error.tsx` est un Client Component de moins de quinze lignes. Il accepte
le contrat Next.js `{ error, reset }`, ignore volontairement `error` et transmet
uniquement `reset` et un identifiant de domaine à `DomainErrorBoundary`.

`DomainErrorBoundary` :

- choisit un texte public stable ;
- protège `reset()` avec un verrou propre au montage ;
- désactive le bouton après le premier essai réussi ;
- déverrouille après une exception synchrone afin d’autoriser un nouvel essai ;
- utilise `router.replace()` uniquement après l’action explicite de secours ;
- ne journalise rien et ne déclenche aucune requête au rendu.

`DomainErrorView` porte la présentation commune aux trois contrats : rôle
`alert`, `aria-live`, focus clavier visible, boutons de 44 pixels minimum,
géométrie responsive et suppression des transitions avec
`prefers-reduced-motion`.

## Expurgation

Les propriétés `error.message`, `error.stack`, `error.cause` et `digest` ne
sont jamais lues, rendues ou journalisées. Le code ne sérialise pas l’objet
`Error` et n’affiche aucun message SQL, Supabase, provider, URL, token, e-mail,
UUID ou contenu utilisateur.

Les textes publics sont bornés :

- global : « UNE ERREUR EST SURVENUE » ;
- coach : « ESPACE COACH INDISPONIBLE » ;
- détail protégé : « PAGE INDISPONIBLE ».

Le dernier libellé ne confirme pas l’existence d’un client ou d’une ressource.
Next.js conserve sa journalisation serveur native; aucun logger applicatif
recevant l’erreur brute n’est ajouté.

## Reset, remontage et retour

Le verrou pur `createErrorResetGate()` garantit un seul appel pour des clics
rapides. Un nouveau montage crée un nouveau verrou, ce qui permet de traiter
une erreur successive. Si `reset()` lève immédiatement une exception, un texte
générique apparaît et le bouton peut être réessayé. Ces comportements sont
testés directement sans route, paramètre ou déclencheur de test en production.

La navigation de secours n’est jamais automatique :

- global et coach : remplacement vers `/` ;
- détail client : remplacement vers `/coach`.

Elle n’efface ni session, cache ou donnée. Le scénario E2E existant couvre le
retour arrière et le refus normal d’un client étranger. Une réponse RSC 500
injectée par Playwright n’a pas déclenché la frontière, car cette ouverture
utilise actuellement une navigation document complète; aucun backdoor
applicatif n’est ajouté pour fabriquer une preuve visuelle. L’affichage et le
reset restent donc validés par rendu React serveur, gardes statiques et tests
purs, tandis que les parcours réels garantissent l’absence de régression.

## Liens et limites

La [coque serveur](./DASHBOARD_SERVER_SHELL.md) et les états métier internes
restent les autorités du profil et de l’identité. Ces frontières ne corrigent
ni `/api/feedback/mine`, ni l’avertissement `getSession()`, ni les volumes
PostgREST.

## Validation de production

Le build Webpack isolé compile 88 pages avec le `BUILD_ID`
`oIOZoTnjk77JzB84QZ6Jz`; ses manifests et arbres compilés contiennent les trois
frontières. Le contrôle performance complet retenu utilise le `BUILD_ID`
`0M7ff9iMf0u6GjvJ6hjs7` et passe les
[79 budgets anti-régression](./PERFORMANCE_BUDGETS.md).

| Route | Bundle brut | Bundle gzip |
|---|---:|---:|
| `/` | 3 090 149 o | 888 191 o |
| `/coach` | 3 114 003 o | 897 342 o |
| `/client/[id]` | 3 239 586 o | 923 399 o |
| union dédupliquée | 3 263 440 o | 932 550 o |

Les trois passages client donnent LCP `400/356/376 ms`, INP `48/32/32 ms`,
CLS `0,003886/0,010764/0,010764`, requêtes totales `106/105/105` et
applicatives `63/62/62`. Les trois passages coach donnent LCP
`308/236/236 ms`, INP `24/24/24 ms`, CLS `0/0/0`, avec `107` requêtes totales
et `39` applicatives à chaque passage. Les deux artefacts de référence
versionnés passent également 79/79 contrôles.

Trois contrôles antérieurs ont exposé des fluctuations isolées LCP/INP et, sur
un passage, une latence historique de `/api/feedback/mine`; ils n’ont pas été
retenus comme preuve verte. Aucun budget, baseline versionnée ou comportement
applicatif n’a été ajusté pour obtenir le quatrième contrôle conforme.
