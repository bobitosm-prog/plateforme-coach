# Phase 6 — seed synthétique déterministe staging

## Autorité et cible

Le seed `moovx-phase6-staging-seed-v1` est réservé au projet Supabase staging
`cycbnnojcymjnaqomlyj`. Le projet production `njlzossopgknanhkzcbk` est refusé
par le garde. Les identités utilisent exclusivement le domaine réservé
`moovx.invalid` et le namespace UUID `76000000` à `76000006`.

Les sources versionnables sont :

- `scripts/preproduction/phase6-seed-manifest.json` : contrat et propriétaires ;
- `scripts/preproduction/phase6-seed.sql` : fixture générée mécaniquement ;
- `scripts/preproduction/phase6-seed-lock.json` : volumes et SHA-256 ;
- `scripts/preproduction/generate-phase6-seed.mjs` : générateur déterministe ;
- `scripts/preproduction/apply-phase6-seed.mjs` : garde, workdir privé, dry-run
  obligatoire et application unique.

Empreintes appliquées le 26 juillet 2026 :

| Source | SHA-256 |
|---|---|
| manifeste | `39a76770ef0b1b60b80632025c25afead486f138a9d15fd759ced5e5b000679b` |
| SQL | `5d5c26a51542b347ae890a0eb263901b949650d0d4c55f3f8308e0d0d883d6bf` |

## Volumes et couverture

| Table | Volume du namespace |
|---|---:|
| `auth.users` | 9 |
| `profiles` | 9 |
| `coach_clients` | 1 |
| `meal_plans` | 6 |
| `client_meal_plans` | 2 |
| `saved_meals` | 4 |
| `daily_food_logs` | 14 |
| `meal_tracking` | 7 |

Les profils comprennent un admin, un coach et sept clients. La relation
coach/client est active. Les plans personnels couvrent `canonical`,
`legacy_converted`, `conflict`, `invalid` et `legacy_unsupported`; le septième
client sans plan couvre `not_found`. `failure` reste une injection de runner :
aucune panne n'est encodée comme donnée. Deux plans coach, quatre repas
sauvegardés, deux logs par client et un suivi par client complètent la preuve.

Les identifiants Stripe restent `NULL`. Aucun mot de passe, secret, endpoint
production ou identifiant Stripe n'est présent dans le manifeste ou la
fixture. Les objets Stripe test seront créés dans une étape distincte.

## Sémantique d'application

Le SQL est transactionnel, active `statement_timeout` et `lock_timeout`, puis
valide les volumes, rôles, owners et l'absence d'identifiant Stripe avant
`COMMIT`. Toutes les lignes sont ciblées par identifiant déterministe avec
`ON CONFLICT`; aucune suppression n'existe.

Le runner :

1. vérifie cible, garde, SHA, volumes et absence de référence interdite ;
2. copie uniquement la configuration nécessaire dans un workdir système privé ;
3. active le seed dans cette copie, jamais dans `supabase/config.toml` ;
4. exécute le dry-run Supabase ;
5. en mode `--apply`, exécute une application au maximum ;
6. supprime toujours le workdir.

La preuve locale a exécuté deux fois le corps SQL dans une transaction unique,
constaté les mêmes volumes, puis exécuté `ROLLBACK`. Après l'application
distante unique, un second dry-run a répondu `Remote database is up to date`
avec `executionCount=0`; aucune seconde écriture n'a été tentée.

## Preuve staging du 26 juillet 2026

Avant application : garde vert, ref locale exacte, 138 versions de migration
uniques, namespace absent et schéma `cron` absent. Le dry-run listait seulement
`supabase/seed.sql`; les migrations étaient désactivées dans le workdir seed.

Après application :

- volumes exacts `9/9/1/6/2/4/14/7`;
- neuf e-mails `moovx.invalid`, zéro domaine étranger et zéro mot de passe ;
- zéro owner hors des sept clients autorisés ;
- contraintes de clés étrangères satisfaites par l'application atomique ;
- historique de migrations strictement inchangé à 138 versions ;
- 53 tables RLS, 127 policies et 25 fonctions toujours présentes ;
- `pg_cron` absent, donc zéro job ;
- zéro endpoint MoovX production et zéro identifiant Stripe.

Les dumps opérateur étaient temporaires et ont été supprimés après extraction
des seuls compteurs expurgés.

## Limite et prochaine étape

Ce seed rend la base staging représentative pour les contrats Supabase et la
réconciliation Nutrition secondaire. Il ne satisfait pas encore le critère
Billing Phase 6 : il manque toujours le Preview Vercel isolé, Stripe test, les
webhooks test et la réconciliation Billing archivée.
