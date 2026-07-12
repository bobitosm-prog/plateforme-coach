# Harnais E2E — invitation coach vérifiée

## État du socle

Le dépôt dispose maintenant d'un harnais Playwright isolé des tests Vitest. Il démarre Next.js sur `http://127.0.0.1:3210`, refuse toute valeur `MOOVX_E2E_APP_URL` non locale et neutralise SMTP dans le processus de test.

Le test exécutable actuel traverse réellement Chromium et la page `/join`. Il vérifie que le lien historique `/join?coach=<UUID>` est nettoyé et qu'aucun appel à `/api/assign-coach` n'est produit. Ce test est un prérequis navigateur, pas le parcours E2E d'invitation complet.

## Blocage du parcours complet

Le harnais d'intégration existant initialise uniquement PostgreSQL avec `psql`. Le dépôt ne contient ni `supabase/config.toml`, ni configuration locale Auth/PostgREST, ni transport SMTP de test. La machine auditée ne fournit pas les commandes `supabase` ou `docker`.

Or les frontières réelles du parcours utilisent :

- Supabase Auth pour les sessions coach et client ;
- PostgREST/RPC pour `profiles`, `coach_invitations` et `consume_coach_invitation` ;
- un transport SMTP capturable pour récupérer le lien contenant le jeton.

Les intercepter globalement dans Playwright donnerait un test d'interface simulé, pas la preuve demandée. Le parcours invitation reste donc non couvert et la Phase 1 reste ouverte.

## Exécution locale

Installer le navigateur Chromium une fois :

```bash
npx playwright install chromium
```

Lancer le socle invitation :

```bash
npm run test:e2e:invitation
```

Le serveur de développement normal n'est pas modifié. Les traces et captures ne sont conservées qu'en cas d'échec et ne doivent jamais contenir de jeton d'invitation.

## Architecture requise pour le parcours complet

La prochaine tranche doit ajouter une stack Supabase locale reproductible comprenant Auth, API et PostgreSQL, puis un transport SMTP local capturable. Elle devra créer des comptes synthétiques, extraire le lien sans l'imprimer, nettoyer comptes/invitations/relations dans un `finally`, et refuser au démarrage toute URL non locale.

Le parcours ne pourra être compté comme E2E qu'après deux exécutions réussies couvrant création via `POST /api/coach/invitations`, validation navigateur, authentification client, consommation unique, relation créée, refus du second usage et absence des routes legacy.
