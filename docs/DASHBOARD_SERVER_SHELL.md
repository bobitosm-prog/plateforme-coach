# Coque serveur du dashboard

La réduction suivante des frontières hydratées est documentée dans
[Frontières Client Components des routes critiques](./PERFORMANCE_CLIENT_BOUNDARIES.md).

## Frontière

La route racine [`app/page.tsx`](../app/page.tsx) est une Server Component App
Router sans props. Elle rend côté serveur :

- la racine sémantique `main` et son fond initial ;
- le titre accessible statique ;
- une frontière `Suspense` ;
- le fallback visuel MoovX utilisable avant l'initialisation cliente.

L'interactivité historique réside dans `DashboardClientIsland`. Les effets de
viewport, gestes du rail, retour Stripe, rappels et resynchronisation push sont
coordonnés par `useDashboardClientRuntime`. Les états d'erreur profil et la
session d'entraînement avec célébrations ont des frontières étroites dédiées.

## Autorité et données sérialisables

La coque ne lit aucune identité et ne sérialise aucune donnée utilisateur. Son
arbre serveur ne reçoit ni `Session`, ni identifiant, rôle, e-mail, cookie,
`access_token` ou `refresh_token`. Il ne crée aucun client Supabase.

`useClientDashboard` reste l'unique autorité initiale pour :

- la session navigateur et les changements d'authentification ;
- le profil et la distinction `not_found` / `error` ;
- les redirections d'onboarding ;
- le cache owner-scoped ;
- l'invalidation des requêtes obsolètes et le nettoyage Strict Mode.

Une prélecture serveur Auth/profil n'est volontairement pas ajoutée : sans
contrat bootstrap minimal capable de supprimer le chargement client, elle
dupliquerait les requêtes initiales. Le passage coach conserve le contrat typé
`CoachPageContentProps` et transmet la `Session` déjà détenue uniquement entre
composants clients, jamais depuis la Server Component.

## États préservés

- chargement initial et contrôle du rôle ;
- identité absente vers `/login` ;
- erreur profil récupérable avec `RÉESSAYER` ;
- absence profil confirmée pendant la redirection onboarding ;
- dashboard coach sans redirection intermédiaire ;
- paywall client ;
- dashboards client mobile et desktop, navigation, overlays et callbacks.

## Limites et suite

Cette tranche ne réduit ni les 42–72 lectures PostgREST observées, ni l'erreur
historique `/api/feedback/mine`, ni l'avertissement `getSession()`. Le grand
îlot client demeure proche de la limite de 500 lignes et conserve trois
avertissements historiques `no-img-element`.

Les mesures avant changement sont dans la
[baseline Phase 8](./PERFORMANCE_BASELINE.md). Tout contrôle postérieur doit
rester sous les [budgets anti-régression](./PERFORMANCE_BUDGETS.md). Les
[états de chargement par segment](./PERFORMANCE_SEGMENT_LOADING.md) complètent
la coque sans ajouter de `app/loading.tsx` à la racine. Les
[frontières d’erreur critiques](./PERFORMANCE_ERROR_BOUNDARIES.md) capturent les
erreurs de rendu sans remplacer les états métier du profil.
Les îlots secondaires et leur preuve de téléchargement sont documentés dans
[Chargement différé des onglets et modales](./PERFORMANCE_LAZY_UI.md).

## Contrôle de performance

Le contrôle temporaire `UhNub4Z8iBOmkjXkELcKM`, produit avec le même harnais
Webpack que la baseline principale `trz-4UEZ9K_w9uD-xZKhc`, passe les 79
budgets sans dépassement.

| Mesure `/` | Baseline principale | Contrôle | Écart |
|---|---:|---:|---:|
| Bundle brut | 3 086 045 o | 3 088 093 o | +2 048 o |
| Bundle gzip | 886 824 o | 887 263 o | +439 o (+0,05 %) |
| Chunk propre à la route | 0 o | 0 o | 0 |
| Chunks partagés gzip | 886 824 o | 887 263 o | +439 o |

Passages client mobile :

- LCP : `400 / 372 / 428 ms` (médiane `400`) ;
- INP : `32 / 32 / 32 ms` (médiane `32`) ;
- CLS : `0,003886 / 0,010764 / 0,003886` (médiane `0,003886`) ;
- requêtes totales : `106 / 104 / 104` ; applicatives : `63 / 62 / 62` ;
- Auth : `3 / 3 / 3`, identique à la baseline ;
- PostgREST : `55 / 54 / 54`, contre `72 / 54 / 42` dans la baseline.

Passages coach desktop : LCP `304 / 248 / 236 ms`, INP `24 / 24 / 24 ms`,
CLS nul, requêtes totales `107 / 107 / 108`, applicatives `40 / 43 / 40`,
Auth `5 / 5 / 6` et PostgREST `27 / 30 / 26`. Les variations restent sous les
budgets et ne sont pas attribuées causalement à la coque.
