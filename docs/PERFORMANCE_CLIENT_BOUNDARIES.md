# Frontières Client Components des routes critiques

## Méthode et objectif borné

L’inventaire recherche la directive exacte `use client` dans `app/`, puis
recoupe les trois entrées App Router avec leurs imports statiques, dynamiques et
les manifests du build Webpack de production. Une directive supprimée n’est
comptée comme gain que si le module n’est plus importé par un Client Component.

Avant modification, le lot a été limité aux présentations CSS statiques de
`/`, `/coach` et `/client/[id]`. L’objectif fixé était de composer trois
présentations depuis le serveur, supprimer au moins une directive et réduire le
JavaScript initial gzip sans modifier données, callbacks, requêtes ou chunks.

## Inventaire global des directives

| Domaine | Avant | Après |
|---|---:|---:|
| `app/components/tabs` | 39 | 39 |
| `app/admin` | 25 | 25 |
| `app/coach` | 24 | 23 |
| `app/[locale]` | 22 | 22 |
| `app/onboarding-v2` | 21 | 21 |
| `app/hooks` | 20 | 20 |
| `app/components/training` | 15 | 15 |
| `app/components/ui` | 14 | 14 |
| `app/client` | 14 | 14 |
| `app/components/home` | 8 | 8 |
| `app/components/dashboard` | 7 | 7 |
| `app/components/modals` | 6 | 6 |
| autres groupes | 38 | 38 |
| **Total** | **253** | **252** |

`app/client/[id]/page.tsx` perd sa directive et
`ClientDetailPageClient.tsx` devient l’îlot explicite correspondant :
ce déplacement seul ne constitue pas un gain de module. La réduction nette
vient de `CoachStyles.tsx`, réellement retiré des graphes clients `/` et
`/coach`, et du CSS inline retiré des bundles des routes `/` et
`/client/[id]`.

## Classification

1. **Directive nécessaire** : `DashboardClientIsland`,
   `CoachPageContent` et `ClientDetailPageClient` conservent hooks, navigation,
   événements, Auth et coordination de données.
2. **Directive locale inutile mais module toujours client** : les vues
   présentatives importées par ces îlots restent du code client même sans
   directive locale. Elles ne sont pas revendiquées comme réduction.
3. **Composant réellement serveur** : `DashboardStyles`, `CoachStyles`,
   `ClientDetailPageStyles` et la façade `app/client/[id]/page.tsx`.
4. **Fonction pure / îlot interactif** : aucune fonction pure supplémentaire
   n’a dû être déplacée ; les trois îlots précités restent les autorités
   interactives.

Les barrels différés du dashboard restent nécessaires pour les onglets et
overlays. Aucun barrel nouveau ne réexporte une présentation serveur vers un
îlot client.

## Composition par route

| Route | Composition serveur | Îlot client | Données traversant la frontière |
|---|---|---|---|
| `/` | `DashboardPage`, `DashboardStyles`, `CoachStyles` | `DashboardClientIsland` | aucune prop |
| `/coach` | `CoachPage`, `CoachStyles` | `CoachPageContent` | aucune prop sur la route directe |
| `/client/[id]` | `ClientProfilePage`, `ClientDetailPageStyles` | `ClientDetailPageClient` | aucune prop |

La session synthétique optionnelle du coach reste confinée à la frontière
client historique utilisée par le dashboard racine. Aucun objet Supabase,
session, token, cookie, secret, profil ou callback n’est sérialisé par les
nouvelles compositions.

## Graphe et mesures de production

Contrôle avant : `5KTbl6telmUXgq-J9ssYQ`. Contrôles après :
`qL0g4gN9zJn1wcfQLwkcu` et `epfY_tip_m72DIdGGJIoD`.

| Route | JS initial avant brut / gzip | JS initial après brut / gzip | Delta brut / gzip | Chunks avant → après |
|---|---:|---:|---:|---:|
| `/` | 1 930 422 / 566 245 o | 1 929 949 / 566 016–566 022 o | −473 / −223 à −229 o | 29 → 29 |
| `/coach` | 1 951 408 / 574 470 o | 1 950 935 / 574 241–574 247 o | −473 / −223 à −229 o | 32 → 32 |
| `/client/[id]` | 1 996 462 / 585 025 o | 1 989 385 / 583 189–583 195 o | −7 077 / −1 830 à −1 836 o | 31 → 31 |

Les modules réellement sortis du client sont `CoachStyles` pour `/` et
`/coach`, l’ancienne façade client `app/client/[id]/page.tsx`, ainsi que les
deux blocs CSS inline désormais rendus par `DashboardStyles` et
`ClientDetailPageStyles`. Le nombre de requêtes JavaScript reste identique ;
la baisse d’octets confirme que le code n’a pas simplement changé de fichier.

La taille RSC n’est pas publiée : le harnais mesure de façon stable les chunks
et requêtes, mais pas les octets des réponses RSC authentifiées. Ajouter une
mesure ad hoc aurait changé le protocole ; la métrique est donc explicitement
indisponible plutôt qu’estimée.

## Web Vitals et réseau

| Contrôle après | Client LCP / INP / CLS | Coach LCP / INP / CLS |
|---|---|---|
| `qL0g4gN9zJn1wcfQLwkcu` | `380/336/324 ms`, `48/32/32 ms`, `0,003886/0,010764/0,010764` | `236/248/236 ms`, `24/24/24 ms`, `0/0/0` |
| `epfY_tip_m72DIdGGJIoD` | `452/360/324 ms`, `32/32/32 ms`, `0,003886/0,003886/0,010764` | `236/236/244 ms`, `24/24/24 ms`, `0/0/0` |

Les deux contrôles passent chacun 79/79. Les requêtes restent client
`110/109/109` totales et `63/62/62` applicatives, coach `104/104/104` et
`39/39/39`. Aucun fetch, abonnement, origine externe ou mismatch
d’hydratation supplémentaire n’est observé.

## Frontières conservées et prochaine dette

Auth/session, orchestration profil/cache, Training actif, caméra/MediaPipe,
messaging realtime, formulaires, mutations, paywall et checkout restent
clients. Les présentations importées sous une grande frontière sont le prochain
gisement, mais nécessitent une composition serveur réelle ; retirer leurs
directives seules ne réduirait pas l’hydratation.

Voir aussi [Coque serveur](./DASHBOARD_SERVER_SHELL.md),
[UI différée](./PERFORMANCE_LAZY_UI.md),
[Baseline](./PERFORMANCE_BASELINE.md) et
[Budgets](./PERFORMANCE_BUDGETS.md).
