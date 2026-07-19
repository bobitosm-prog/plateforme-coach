# Harnais E2E coach/client local

## But

Ces parcours caractérisent les autorisations et écrans coach/client actuels sans mock Playwright des routes Next.js, de Supabase Auth, de PostgREST ou de `coach_clients`. Ils utilisent Chromium, Next.js et la pile Supabase locale sur `127.0.0.1`.

## Commandes

```bash
npm run test:e2e:coach-journey
npm run test:e2e:client-journey
npm run test:e2e:coach-client
```

Le lanceur refuse un projet Supabase lié, toute URL distante et vérifie la fermeture des ports temporaires. Le reset canonique doit être exécuté séparément avant une campagne complète :

```bash
npm run supabase:local:reset
npm run supabase:local:verify
```

## Frontières traversées

- authentification réelle des personas synthétiques par Supabase Auth local ;
- dashboard coach, liste filtrée par relation active et détail `/client/[id]` ;
- vue `active_related_profiles`, PostgREST et RLS réels ;
- dashboard client mobile, navigation Training/Nutrition/Compte/Profil et rechargement ;
- tables locales `coach_clients`, `client_programs`, `weight_logs`, `completed_sessions`, `daily_food_logs`, `scheduled_sessions` et `messages` ;
- nettoyage dans chaque `finally`, puis comptage des profils, relations, messages et séances planifiées résiduels.

Aucun fournisseur externe, SMTP réel, Stripe, Anthropic ou Web Push n'est contacté.

## Scénarios coach

- coach authentifié avec client actif visible ;
- ouverture réelle du détail et navigation Aperçu, Programme, Progression, Nutrition, Messages et Notes ;
- client d'un autre coach et relation inactive absents de la liste ;
- accès direct étranger ou inactif rendu fail-closed ;
- URL protégée anonyme redirigée ;
- coach sans relation refusé ;
- champs d'autorité Stripe/abonnement absents du DOM projeté.

Le message technique legacy `Cannot coerce the result to a single JSON object` est actuellement affiché pour un profil non visible. Le test le caractérise comme refus sans modifier ce contrat dans cette tranche.

## Scénarios client

- client actif, données représentatives, navigation et rechargement de session ;
- relation coach active affichée avec son état actif ;
- client inactif, client d'un autre coach et persona invité sans héritage du coach fixture ;
- séparation des personas par nettoyage du storage/cookies entre authentifications.

Le nom du coach lié reste actuellement le fallback générique `Coach` dans `ProfileTab`, même lorsque la relation active est correcte. Cette limite n'est pas corrigée ici.

## Fixtures et nettoyage

Chaque test produit des UUID et adresses synthétiques uniques à partir des personas partagés. Les dates et valeurs métier sont déterministes. Le nettoyage supprime les écritures métier, relations, projections de gamification, profils puis comptes Auth. Le schéma local interdit plusieurs relations actives pour un même client via `coach_clients_one_active_per_client_idx` ; ce cas est donc caractérisé par l'invariant de base plutôt que par une fixture impossible.

Le lanceur expurge JWT, clés, cookies et payloads sensibles. Les sorties applicatives peuvent encore contenir les avertissements historiques Next Image, `getSession()` et les erreurs locales de feedback/default-coach ; ils ne modifient pas les assertions coach/client.

## Limites

- Playwright caractérise Chromium desktop pour le coach et mobile pour le client, pas tous les navigateurs.
- Le scénario vérifie la présence des écrans et frontières d'autorisation, sans modifier de programme, plan ou message.
- Les historiques Training restent distincts ; aucune fusion n'est introduite.
- Le harnais ne remplace pas les matrices PostgreSQL/RLS ni les tests unitaires des loaders.
