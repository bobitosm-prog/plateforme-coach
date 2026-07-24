# Rapport du jalon B — stockage/CDN média

## Statut

**Déployé et validé le 24 juillet 2026 dans le périmètre autorisé.**

Le jalon contient uniquement un canary synthétique et les 17 posters déjà
versionnés. Aucun média privé, upload utilisateur, feedback, photo, message ou
autre média du dépôt n'a été copié.

## Ressources non secrètes

- compte Cloudflare : `8cd709e2be7932ec9faac100aec9a8ca` ;
- zone active `moovx.ch` : `dce4c75078b142ac475e3729e32255f6` ;
- bucket : `moovx-public-media-prod` ;
- classe : R2 Standard ;
- juridiction retournée : `eu` ;
- location retournée par Cloudflare : `EEUR` ; aucun hint n'a été envoyé ;
- domaine public : `https://media.moovx.ch` ;
- identifiant public du domaine R2 géré :
  `pub-0139ec81d7fb4b9d92c72df7ee2ccf4a.r2.dev`, désactivé.

Le domaine personnalisé appartient à la zone déjà confirmée du même compte.
Son ownership et son certificat TLS sont actifs. Aucun changement de
nameservers, partial CNAME, plan ou abonnement n'a été nécessaire.

## Configuration

Le CORS du bucket autorise uniquement :

- origines `https://moovx.ch` et `https://app.moovx.ch` ;
- méthodes `GET` et `HEAD` ;
- header entrant `Range` ;
- headers exposés `Accept-Ranges`, `Content-Length`, `Content-Range`, `ETag`
  et `cf-cache-status` ;
- préflight mis en cache 86 400 secondes.

Les objets utilisent un nom contenant les 16 premiers caractères de leur
SHA-256 et portent :

- leur `Content-Type` exact ;
- `Cache-Control: public, max-age=31536000, immutable`.

R2 ne fournit pas nativement `X-Content-Type-Options: nosniff` sur un domaine
personnalisé. Aucun Worker ou changement de zone supplémentaire n'a été ajouté
pour simuler cette capacité. Le type MIME est néanmoins explicite et vérifié.

## Canary et preuves réseau

Le canary est une vidéo noire synthétique de 32 × 32 px et une seconde :

- clé : `canary/moovx-r2-canary.9edc5430a3640aaa.mp4` ;
- taille : 2 218 octets ;
- SHA-256 :
  `9edc5430a3640aaa33f1cbbe0301aefaae7da7edc35d94d46731231e1de8b1dc` ;
- MIME : `video/mp4`.

Les contrôles publics confirment :

- `GET 200`, `HEAD 200` et `Range: bytes=0-255` → `206` ;
- `Content-Range: bytes 0-255/2218`, `Accept-Ranges: bytes` ;
- SHA-256 distant identique ;
- CORS présent pour une origine MoovX et absent pour une origine étrangère ;
- premier accès `MISS`, accès suivants `HIT` ;
- HTTPS/TLS actif ;
- racine et clé absente en `404`, sans listing de contenu.

## Rollback démontré

Le canary a été supprimé, le domaine personnalisé détaché, puis la liste des
domaines a été vérifiée vide. Le résolveur local a continué à passer ses
12 tests. Le domaine a ensuite été rattaché, TLS est redevenu actif et le
canary a été recréé avec le même SHA-256.

Le rollback applicatif reste indépendant : une clé absente du manifest est
refusée et chaque poster CDN conserve son chemin local en secours. Aucun
original local n'a été supprimé.

## Posters

Les 17 posters WebP représentent exactement 216 510 octets. Chaque objet a été
relu depuis le domaine public et validé sur son statut 200, sa taille, son
SHA-256, son MIME `image/webp`, son CORS et son cache immuable.

| Fichier | Octets | SHA-256 |
|---|---:|---|
| `arnold-press.webp` | 14 316 | `300ca0d1781536a346c926519c113a6e7e54c500667eac6e8905b64dbf1d28ff` |
| `developpe-militaire-barre-debout.webp` | 8 448 | `dc2b52aeb16e16b9455a2de5f162880c7cd0cd87b26dc0e3aee00bff79aa1e25` |
| `developpe-militaire-barre.webp` | 8 800 | `0a13b452acdf36309131fe36c83e67430aef4ccd63cc475af2dab7a493bd7d60` |
| `developpe-militaire.webp` | 16 704 | `bbecbffd04e01b40e0941ba7948c8af6790b2db628df61d34e299882c95f1d44` |
| `elevations-frontales-halteres.webp` | 16 808 | `3b43b9e5fe7b3c59e4ec1051c4e0e11b06a198e9dbfc621e503cb4d51a2398b3` |
| `elevations-laterales-halteres.webp` | 15 390 | `4e16c8b18c4035ec5c3bc7dc622d0cce29daea63812bf17258676f3661f5f2f7` |
| `hack-squat-machine.webp` | 15 724 | `8cea91df307aa119d7db5c7d3079082f97d7d6288251a569e3ec2bc476267e76` |
| `hip-thrust.webp` | 9 376 | `82e1b671afe51aef7d7a83867d03026c8fd9b70ddc3bf3cae91a861a00cae2b0` |
| `kettlebell-swing.webp` | 12 070 | `f57044f901d7327370a89ccfb97ba0965a1ad8af33919bc4a04a24ca2ff3df09` |
| `leg-extension.webp` | 15 980 | `6cc64fd90c95fd42042c56d249593875f27b2905a7bddec3ae6d0c04beef9dc6` |
| `leg-press.webp` | 14 874 | `4e6d4a8a63c71f1796d3617e58123364ad1f25d3e2045a1cc8e6f7352bdbb4d5` |
| `pull-over-poulie-haute.webp` | 15 184 | `8e5a48654febf0f1f8bbc0a00e049cf1debfe3477771da8ba44dcac45923d08d` |
| `rowing-barre.webp` | 14 588 | `4c003a166fb6db6c3b8a7c4a12bda3cc978449c8c0e321ca39e0b127b6225f33` |
| `souleve-de-terre-roumain.webp` | 9 540 | `f66519ce9b8769c8710ba1f22cec6b8daf5ff3c464db9b30bf4b9f0233ad2592` |
| `souleve-de-terre.webp` | 10 930 | `7e9fccdddc542199d58b22173e8efb5dbfcd6ebb19b96d4854769cdc4e2c155c` |
| `squat-barre.webp` | 10 556 | `177ef2e43a6d31f32b30ad03ed4b48dfbd082b8b9f677417627c75c56b8eae32` |
| `tractions-pronation.webp` | 7 222 | `bf639f268aa5fbd75a5baee4803e3cd15b2c1fd27a9ec9c627c7b6495e6ff1ec` |

La liste privée R2 contient exactement 18 objets : le canary et ces
17 posters, soit 218 728 octets.

Un contrôle ultérieur du premier poster confirme `HIT`, âge 661 secondes,
ETag stable, corps de 14 316 octets au SHA attendu et plage 206 de 256 octets.

## Application et validation

Le manifest public borne les seules clés acceptées. Les cinq consommateurs de
posters utilisent l'URL versionnée CDN et transmettent le chemin local à
`DeferredVideo`, qui bascule sur ce secours si le poster distant échoue.

Validations :

- tests ciblés : 22/22 ;
- suite complète : 222 fichiers, 1 844 tests, 3 `todo` ;
- TypeScript et ESLint ciblé : verts ;
- build Next.js Webpack hermétique : 88 pages ;
- E2E coach/client : 4/4 ; default-coach : 1/1 ;
- contrôle performance sous BUILD_ID `0bvylxtGKvQJvAuDb22Sr` : 79/79 ;
- aucun budget ni artefact de baseline versionné modifié.

## Coût et exploitation

R2 Standard ne comporte aucun frais fixe dans l'offre observée. Le compte
inclut 10 Go, 1 million d'opérations Class A et 10 millions Class B ; les
dépassements restent facturés. L'egress R2 est gratuit, mais les opérations et
le stockage peuvent être facturés. Ce jalon stocke 218 728 octets et a généré
un trafic de contrôle borné.

Aucune alerte de coût spécifique au bucket n'était configurable sans étendre
le périmètre. La surveillance retenue est la page R2 Metrics du bucket
complétée par Billing/Usage du compte, avec contrôle des octets, Class A et
Class B. Aucun token persistant n'est requis pour la diffusion publique ;
l'OAuth temporaire de déploiement est révoqué en fin de tranche et son cache
local supprimé. Aucun secret n'est conservé dans le dépôt ou les artefacts.

## Limites

- Aucun des 131 autres médias publics n'est migré.
- Aucun média privé n'est déplacé.
- Les originaux locaux restent la source de rollback.
- La location `EEUR` est une information retournée par Cloudflare ; seule la
  juridiction `eu`, explicitement vérifiée, constitue la garantie demandée.
- L'absence de token bucket-scoped persistant évite une credential durable ;
  une automatisation future devra créer puis stocker hors dépôt un token au
  moindre privilège.
