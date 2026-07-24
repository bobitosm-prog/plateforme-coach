# Étude Phase 8 — stockage et CDN média

## Statut et méthode

Étude locale du 24 juillet 2026. Aucun dashboard distant, bucket, donnée
utilisateur, ressource privée ou fournisseur n’a été consulté. Aucun compte,
abonnement, DNS, upload ou mutation distante n’a été créé. Les prix sont des
hypothèses fondées sur les pages officielles consultées à cette date, pas des
factures.

## État actuel vérifiable

### Hébergement public

Les documents d’exploitation attestent Vercel Pro pour l’application et
Cloudflare pour le DNS. Les fichiers de `public/` sont intégrés au déploiement
Next.js. Vercel fournit un CDN et ajoute des ETags ; sa valeur par défaut est
`public, max-age=0, must-revalidate`. La preuve de production locale Webpack
observe pour poster/MP4 `Cache-Control: public, max-age=0`, type correct et
vidéo `206`. Elle ne démontre pas les headers de `app.moovx.ch` : une mesure
de production n’a volontairement pas été lancée.

Inventaire reproductible, exclusions appliquées avant lecture :

| Périmètre public local | Fichiers | Octets | Mio |
|---|---:|---:|---:|
| Application sous `public/` | 84 | 72 658 802 | 69,29 |
| Posters publics | 17 | 216 510 | 0,21 |
| Exercices publics (26 images, 20 MP4) | 46 | 92 242 019 | 87,97 |
| `app/favicon.ico` | 1 | 25 931 | 0,02 |
| **Total** | **148** | **165 143 262** | **157,49** |

### Storage runtime

| Bucket attesté par le code | Producteurs/consommateurs | Contrat observé | Risque |
|---|---|---|---|
| `avatars` | onboarding, dashboard, suppression compte | upload, URL publique | public attendu |
| `progress-photos` | onboarding, progression, coach | upload, signed URL 3 600 s, suppression | un ancien consommateur appelle `getPublicUrl` |
| `message-media` | messagerie | upload JPEG, signed URL | signature client, log du chemin en erreur |
| `exercise-videos` | feedback vidéo | upload puis URL publique | feedback privé exposé selon un contrat public |

`storage.enabled=false` dans la configuration locale et aucune migration
versionnée ne crée buckets ou policies. Existence, caractère public effectif,
CORS, quotas, région et ownership distants sont donc **inconnus**. Le code
suppose ces ressources ; il ne les prouve pas. Les signatures sont surtout
créées dans le navigateur. La cible obligatoire est une signature serveur
après contrôle owner/relation.

## Comparaison

| Critère | Vercel statique actuel | Supabase Storage/CDN | Cloudflare R2 + domaine |
|---|---|---|---|
| Changement | nul | faible dans la stack | nouvelle origine |
| Cache | CDN existant, actuel revalidé | Smart CDN Pro, cache par objet | cache Cloudflare via custom domain |
| Stockage | dans le déploiement | 100 Go Pro inclus, puis 0,0213 $/Go-mois | 10 Go gratuits, puis 0,015 $/Go-mois |
| Egress | pool Fast Data Transfer | cached 0,03 $, uncached 0,09 $/Go au-delà des quotas | gratuit |
| Requêtes | Edge Requests comptées | incluses dans le service/egress | Class A/B, quota gratuit |
| Range vidéo | preuve locale 206 | compatible CDN/objet, à prouver par canary | R2 renvoie 206 sur Range |
| Privé | nécessite route/signature maison | buckets privés + RLS + signed URLs | presigned S3, autorité serveur à construire |
| Domaine | domaine Vercel existant | domaine Supabase ou custom domain selon offre | custom domain requis pour cache production |
| Invalidation | redeploy/versionnement | Smart CDN, invalidation jusqu’à 60 s | purge Cloudflare ou versionnement |
| Région | edge global ; build/région à vérifier | région primaire du projet, Europe/Zurich disponibles | juridiction `eu`, hint `weur`; emplacement précis non garanti |
| Taille fichier | limites Vercel du déploiement | limite bucket configurable ; Pro jusqu’à 500 Go | 5 Gio upload simple, objet jusqu’à 5 Tio |
| Transformations | `next/image` | image transformations payantes après quota | aucune transformation média native équivalente |
| Lock-in | chemins Next simples | API/RLS Supabase | S3 compatible mais DNS/cache Cloudflare |
| Observabilité | Vercel usage/analytics | dashboard Storage/egress | métriques bucket/GraphQL |

Sources officielles : [cache Vercel](https://vercel.com/docs/caching/cache-control-headers),
[tarification Vercel](https://vercel.com/docs/pricing/regional-pricing),
[tarification Supabase Storage](https://supabase.com/docs/guides/storage/pricing),
[egress Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/egress),
[Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn),
[URLs privées Supabase](https://supabase.com/docs/guides/storage/serving/downloads),
[régions Supabase](https://supabase.com/docs/guides/platform/regions),
[tarification R2](https://developers.cloudflare.com/r2/pricing/),
[limites R2](https://developers.cloudflare.com/r2/platform/limits/),
[cache R2](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/),
[presigned URLs R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/),
[CORS R2](https://developers.cloudflare.com/r2/buckets/cors/) et
[juridictions R2](https://developers.cloudflare.com/api/resources/r2/).

### Estimations mensuelles hypothétiques

Hypothèses : 0,165 Go stockés, assets publics majoritairement cacheables,
réponse moyenne de 1 Mio pour estimer les requêtes R2, plans Vercel Pro et
Supabase Pro déjà payés et quotas autrement disponibles. Les taxes, plans,
transformations, logs, requêtes d’écriture et autres usages du compte sont
exclus.

| Trafic public | Vercel incrémental | Supabase, 100 % cached | R2 Standard |
|---:|---:|---:|---:|
| 10 Go/mois | 0 $ dans 1 To inclus | 0 $ dans 250 Go cached | 0 $ dans quotas gratuits |
| 100 Go/mois | 0 $ dans 1 To inclus | 0 $ | 0 $ |
| 1 000 Go/mois | 0 $ si le pool reste disponible | ≈22,50 $ (750 × 0,03) | 0 $ egress ; ≈1 M GET, sous 10 M gratuits |

À 1 To 100 % non cacheable, Supabase serait ≈67,50 $ au-delà de 250 Go.
Un mix 50/50 serait ≈30 $. R2 n’est pas « sans coût » : au-delà des quotas,
Class B coûte 0,36 $/million et le stockage 0,015 $/Go-mois. Les requêtes
Range peuvent multiplier les opérations ; le trafic seul ne suffit pas à
prédire leur nombre.

## Architecture obligatoire

- **Public** : application, posters et exercices seulement ; clé versionnée
  par SHA-256 ; `public, max-age=31536000, immutable`; CORS limité aux origines
  MoovX, méthodes `GET/HEAD`, headers Range exposés ; `206` exigé pour vidéo.
- **Privé** : feedback, photos, analyses et messages ; bucket privé séparé ;
  signature courte côté serveur après owner/relation ; `private, no-store` ;
  révocation/suppression documentée ; aucune URL dans log ou stockage durable.
- Les deux contrats ne partagent ni résolveur public ni fallback.

Le module additif `lib/media/delivery/` formalise manifest strict, nommage,
résolution locale/CDN, refus de résolution privée, politique HTTP et dry-run
idempotent. Aucun consommateur runtime ne l’utilise encore.

## Recommandation soumise à approbation

Créer uniquement après accord :

1. un bucket Cloudflare R2 `moovx-public-media-prod`, juridiction `eu`, sans
   location hint, public seulement via domaine ;
2. le hostname/DNS `media.moovx.ch` ;
3. des credentials d’upload CI à droits limités au bucket, jamais versionnés ;
4. aucun nouveau bucket privé lors du premier lot.

Le volume initial déployé est un canary synthétique puis 17 posters
(216 510 octets). Les 131 autres médias inventoriés, les quatre chemins
protégés et tous les uploads utilisateur restent exclus.

Rollback : configuration du résolveur à `local`, originaux conservés, aucun
DNS supprimé automatiquement. Risques principaux : double origine, coûts
réels dépendants du trafic/requêtes, juridiction à confirmer au moment de la
création, cache CORS/Range à vérifier, et dette privée Supabase non résolue.

La roadmap est cochée après validation du canary, des posters, du fallback,
du rollback et d'un contrôle performance 79/79.

## Tentative du jalon B

Après autorisation, la vérification authentifiée en lecture seule s’est arrêtée
sur le code Cloudflare `10042` : R2 n’est pas activé pour le compte et le
dashboard demande son activation. Aucune création n’a été tentée, car cette
étape peut impliquer une carte ou un engagement de facturation. Le
[rapport de déploiement](./MEDIA_STORAGE_CDN_DEPLOYMENT.md) distingue les
preuves acquises des vérifications encore impossibles.

Après activation manuelle, R2, le nom du bucket et la zone ont été vérifiés.
Wrangler a ensuite refusé de combiner `jurisdiction=eu` et `location=weur`.
Après une nouvelle autorisation explicite, le bucket a été créé avec `eu`
seul. Le [rapport de déploiement](./MEDIA_STORAGE_CDN_DEPLOYMENT.md) consigne
les ressources, objets et preuves finales.
