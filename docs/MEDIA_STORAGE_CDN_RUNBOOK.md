# Runbook — migration média

Le jalon B public et borné a été exécuté selon ce runbook. Voir le
[rapport du jalon B](./MEDIA_STORAGE_CDN_DEPLOYMENT.md). Toute extension à
d'autres médias ou au privé exige une nouvelle autorisation.

## Préconditions d’approbation

- fournisseur, juridiction/région, coût maximal et propriétaire du compte ;
- noms exacts du bucket et du domaine ;
- périmètre public/privé ;
- volume et liste des fichiers ;
- éventuel DNS ;
- durée du dual-read et procédure de rollback.

## Nommage et manifest

Une entrée publique contient chemin logique, SHA-256 complet, octets, type MIME
réel, nature et visibilité. La clé cible est
`<répertoire>/<nom>.<sha256[0:16]>.<extension>`. Le nom change avec le
contenu ; `public, max-age=31536000, immutable` devient alors sûr.

Les objets privés gardent une clé opaque structurée par domaine et owner. Ils
ne passent jamais par le résolveur public et n’utilisent pas de nom révélant
e-mail, nom ou contenu.

## Dry-run et reprise

1. Charger localement le manifest versionné.
2. Obtenir seulement les métadonnées distantes autorisées.
3. Classer chaque objet `upload`, `skip-identical` ou `conflict`.
4. Arrêter sur `conflict`; ne jamais écraser silencieusement.
5. Pour un upload, fixer `Content-Type`, `Cache-Control` et le SHA-256 en
   métadonnée.
6. Relire les métadonnées et, pour le canary, le corps ; vérifier SHA-256.
7. Réexécuter le dry-run : tout objet validé doit devenir `skip-identical`.

Le rapport contient uniquement clé versionnée, octets, type, hash et résultat.
Il exclut secret, URL signée, identité et contenu utilisateur.

## Déploiement public progressif

1. Canary synthétique non sensible.
2. Vérifier HTTPS, domaine, CORS, `ETag`, type, cache et `GET`/`HEAD`.
3. Pour une vidéo canary, demander une plage et exiger `206`,
   `Accept-Ranges: bytes`, `Content-Range` et longueur cohérente.
4. Migrer les 17 posters (216 510 octets). Un éventuel lot d'exercices reste
   une tranche distincte non autorisée.
5. Activer le résolveur CDN par configuration et manifest, sans supprimer les
   originaux locaux.
6. Mesurer erreurs, hit ratio, octets, requêtes et budgets.

Le dual-read est limité à une version applicative et 14 jours : clé CDN
connue, sinon chemin local. Il n’est jamais appliqué au privé.

## Privé

Aucun média privé réel n’est prévu dans le premier lot. Une tranche ultérieure
doit démontrer bucket privé, policies versionnées, refus anonyme, contrôle
owner/relation actif avant signature serveur, expiration courte, suppression
et révocation. `Cache-Control` est `private, no-store`; aucune URL n’est
journalisée ou persistée.

## Rollback et suppression

Le rollback désactive la base CDN et résout immédiatement les chemins locaux.
Les objets distants restent intacts pendant l’analyse. DNS et bucket ne sont
supprimés qu’après validation explicite. Les originaux locaux ne sont retirés
qu’après au moins 14 jours sans rollback, budgets verts et nouvel accord.
