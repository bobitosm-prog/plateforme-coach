# Harnais E2E — invitation coach vérifiée

## Architecture locale

Le parcours utilise exclusivement des services Docker locaux gérés par la CLI Supabase installée dans les dépendances de développement :

| Service | URL ou port local |
|---|---|
| Application Next.js | `http://127.0.0.1:3210` |
| API, Auth et PostgREST Supabase | `http://127.0.0.1:55321` |
| PostgreSQL | `127.0.0.1:55322` |
| Mailpit HTTP | `http://127.0.0.1:55324` |
| Mailpit SMTP | `127.0.0.1:55325` |

Les scripts refusent une URL configurée hors de `127.0.0.1` ou `localhost`. Aucun `supabase link`, `db push` ou projet hébergé n'est utilisé. Les clés locales générées sont écrites avec le mode `0600` dans `.env.e2e.local`, ignoré par Git.

La CLI Docker publie techniquement ses ports sur `0.0.0.0` et `[::]` et ne fournit pas d'option de bind dans la version `2.109.1`. Les URLs, gardes et consommateurs du harnais restent locaux, mais cette limite doit être prise en compte sur un réseau non fiable.

## Migrations historiques

Le dépôt contient 23 groupes de migrations partageant un préfixe date, ce que la clé primaire de `supabase_migrations.schema_migrations` de la CLI refuse. Les fichiers ne sont pas renommés afin de préserver leur identité historique.

`scripts/supabase-local.mjs` laisse la CLI reconstruire les schémas internes puis applique les 134 fichiers SQL originaux dans l'ordre lexical avec `psql -v ON_ERROR_STOP=1`. Chaque fichier appliqué est enregistré dans `supabase_migrations.local_applied_files`. Aucun SQL ou test d'assertion n'est modifié ou ignoré.

Le mode local `api.auto_expose_new_tables = true` reproduit le comportement Supabase historique attendu par les migrations MoovX, qui resserrent ensuite explicitement RLS et privilèges. La CLI annonce la suppression future de cette option ; les grants initiaux devront alors être rendus explicites dans une future migration compatible.

## Commandes

```bash
npm run supabase:local:start
npm run supabase:local:status
npm run supabase:local:reset
npm run test:e2e:invitation
npm run supabase:local:stop
```

Après un reset, les assertions SQL peuvent être lancées contre :

```text
postgresql://postgres:postgres@127.0.0.1:55322/postgres
```

Le mot de passe est la valeur locale par défaut de la stack jetable, pas un secret distant.

## Parcours couvert

Le test principal :

1. crée trois comptes synthétiques via Supabase Auth local et leurs profils locaux ;
2. connecte le coach par l'interface `/login` ;
3. ouvre `/coach` et utilise le formulaire réel d'invitation ;
4. observe le vrai `POST /api/coach/invitations` ;
5. vérifie la persistance du seul `token_hash` ;
6. capture le message livré par Nodemailer au SMTP Mailpit local ;
7. extrait le jeton uniquement en mémoire ;
8. ouvre `/join`, observe la validation réelle puis authentifie le client ;
9. vérifie la consommation RPC, la relation `coach_clients` active et le statut `consumed` ;
10. vérifie le refus du second usage et du réemploi par un autre compte ;
11. prouve l'absence de `/api/assign-coach` et de `/join?coach=` ;
12. supprime invitations, relations, profils et comptes Auth dans un bloc `finally`.

Le runner force un worker unique, désactive traces et captures, et remplace toute chaîne compatible avec un jeton d'invitation par `[REDACTED_TOKEN]` avant stdout/stderr. Le serveur Next.js est arrêté dans un `finally` de groupe de processus.

## Validations observées

- reset complet : 134 migrations appliquées ;
- assertions de baseline PostgreSQL : vertes ;
- matrice SQL invitation/RLS/RPC : verte ;
- E2E : deux exécutions consécutives, `2 passed` à chaque exécution ;
- durée observée du parcours complet : environ 21 secondes par exécution.

Les erreurs `GET /api/feedback/mine 500`, les avertissements `getSession()` et les avertissements de qualité d'image apparaissent pendant le dashboard coach mais n'empêchent pas le parcours invitation. Ils restent des dettes distinctes.
