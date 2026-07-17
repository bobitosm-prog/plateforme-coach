# ADR 0003 — Frontières d'accès Supabase

- Statut : accepted
- Date : 2026-07-17

## Contexte

Le dépôt comportait de nombreuses créations directes de clients Supabase et des types proches du schéma recopiés à la main. L'autorité pouvait devenir ambiguë entre navigateur, route serveur, clé privilégiée et politiques PostgreSQL.

## Décision

Les nouveaux accès utilisent les frontières suivantes :

- les types de `public` sont générés depuis le schéma canonique local et exposés par le module Supabase commun ;
- la factory navigateur fournit le client public typé et laisse la RLS décider des lignes accessibles ;
- la factory serveur propage la session via les cookies de la requête et conserve l'identité de l'utilisateur ;
- la factory admin est réservée aux traitements serveur contrôlés ; elle n'est créée qu'après authentification et vérification métier lorsque le flux agit pour un utilisateur ;
- les repositories `identity`, `profile` et `subscription` centralisent progressivement les lectures et mutations correspondantes ;
- la RLS reste la frontière d'autorité des accès utilisateur, même lorsque la route effectue déjà un contrôle ;
- la visibilité d'un profil lié exige une relation coach/client active ; une relation inactive ne confère aucun accès.

La clé `service_role` ne doit jamais atteindre le navigateur, servir de raccourci à un contrôle d'autorisation ou être créée avant les contrôles nécessaires. Les webhooks et travaux serveur explicitement privilégiés sont des exceptions bornées, pas une autorité utilisateur simulée.

## Conséquences

- Une nouvelle fonctionnalité utilise les factories typées et un repository lorsque son domaine en possède un.
- Une mutation sensible doit conserver les contrôles serveur et les tests RLS/PostgREST correspondants.
- Les types sont régénérés après une migration et contrôlés avec `npm run supabase:types:check`.
- Les accès legacy sont migrés par tranches afin de préserver les contrats publics.

## Limites et dette restante

- La migration est progressive : des créations directes de clients et des types manuels subsistent hors du périmètre déjà migré.
- Les repositories actuels couvrent identité, profil et abonnement, pas encore tous les domaines métier.
- Les types générés décrivent le schéma ; ils ne remplacent ni les modèles métier ni les règles d'autorisation.
- La RLS doit être réauditée lorsque les relations, rôles ou surfaces de lecture évoluent.

## Références

- [Factories de clients Supabase](../SUPABASE_CLIENT_FACTORIES.md)
- [Repositories Supabase](../SUPABASE_REPOSITORIES.md)
- [Types Supabase](../SUPABASE_TYPES.md)
- [Migration des accès Supabase](../SUPABASE_ACCESS_MIGRATION.md)
- [Matrice de tests RLS](../RLS_TEST_MATRIX.md)
