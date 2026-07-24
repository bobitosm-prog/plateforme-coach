# ADR 0006 — Stockage et CDN des médias

- Statut : accepted
- Date : 2026-07-24

## Contexte

MoovX livre actuellement 165 143 262 octets de médias locaux avec le
déploiement Next.js/Vercel. Le code utilise aussi quatre buckets Supabase
Storage (`avatars`, `progress-photos`, `message-media`, `exercise-videos`),
mais leur création, région et policies ne sont pas présentes dans les
migrations versionnées. Aucune donnée distante n’a été consultée pendant
l’étude.

La preuve Webpack locale observe `Cache-Control: public, max-age=0`, un type
MIME correct et une réponse vidéo `206`. Elle ne prouve pas les headers du
domaine de production. Vercel fournit déjà un CDN et des ETags ; le cache
long des médias locaux n’est cependant pas explicitement contractualisé.

## Décision

1. conserver les médias privés dans des buckets Supabase **privés**, après
   reproduction et validation séparée des policies ;
2. placer les seuls médias publics, immuables et versionnés dans un bucket
   Cloudflare R2 de juridiction `eu`, servi par `media.moovx.ch` ;
3. migrer d’abord un canary public synthétique, puis les posters et un lot
   public borné ; conserver les chemins Vercel locaux comme rollback ;
4. ne migrer aucun feedback, photo, message ou autre upload utilisateur dans
   le premier déploiement.

Le choix R2 public est préféré pour l’egress sans frais, le domaine déjà sous
DNS Cloudflare et la maîtrise d’un cache immuable. Supabase reste préférable
pour le privé car Auth/RLS et l’ownership y sont déjà structurants. Le choix
n’est pas fondé sur le seul prix : il limite surtout le changement
d’autorité.

Le jalon B approuvé a créé le bucket R2 Standard
`moovx-public-media-prod` avec juridiction `eu`, sans location hint, et relié
`media.moovx.ch`. Il ne contient qu'un canary synthétique et les 17 posters.

## Conséquences

- Deux origines média sont assumées, avec observabilité et runbooks distincts.
- Les noms publics incluent un préfixe SHA-256 ; une mutation produit une
  nouvelle URL, jamais une purge nécessaire au fonctionnement.
- Le navigateur ne reçoit jamais de résolution publique pour un média privé.
- Les URLs privées doivent être courtes, signées côté serveur après contrôle
  owner/relation, et servies avec `private, no-store`.
- Le dual-read public est temporaire et borné ; la suppression locale vient
  après une période de sécurité explicitement approuvée.

## Limites et dette restante

- Aucun des 131 autres médias publics n'est migré.
- La juridiction `eu` est confirmée ; Cloudflare retourne une location `EEUR`,
  sans que celle-ci ait été demandée comme hint.
- Le domaine R2 géré reste désactivé ; seul le domaine personnalisé est public.
- Les originaux locaux et le fallback applicatif sont conservés.
- Le projet/région/plan Supabase effectif et les buckets réels sont inconnus
  sans inspection distante.
- `exercise-videos` produit aujourd’hui une URL publique pour du feedback :
  c’est une divergence de sécurité à corriger séparément avant toute migration
  privée.
- Un ancien rendu de `progress-photos` utilise `getPublicUrl` alors que les
  autres consommateurs utilisent une URL signée.
- Les URLs signées sont actuellement créées principalement côté client et
  durent 3 600 secondes ; la cible serveur n’est pas encore déployée.

## Références

- [Étude stockage/CDN](../MEDIA_STORAGE_CDN_STUDY.md)
- [Runbook](../MEDIA_STORAGE_CDN_RUNBOOK.md)
- [Rapport du jalon B](../MEDIA_STORAGE_CDN_DEPLOYMENT.md)
- [Inventaire média](../PERFORMANCE_MEDIA_INVENTORY.md)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Supabase Storage pricing](https://supabase.com/docs/guides/storage/pricing)
- [Vercel cache-control](https://vercel.com/docs/caching/cache-control-headers)
