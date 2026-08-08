# MoovX

MoovX est une plateforme de coaching construite avec Next.js App Router,
React, TypeScript et Supabase. Le dépôt regroupe l'application client/coach,
les migrations PostgreSQL, les tests Vitest/SQL et une suite E2E Playwright
strictement locale.

## Démarrage rapide

Prérequis : Node.js avec npm, Docker actif, PostgreSQL `psql` et Chromium pour
Playwright.

```bash
npm ci --legacy-peer-deps
npm run supabase:local:start
npm run supabase:local:reset
npm run dev:webpack
```

Ouvrir ensuite <http://127.0.0.1:3000/login>. Aucun accès staging ou
Production n'est nécessaire pour développer localement.

## Documentation

- [Onboarding développeur](docs/DEVELOPER_ONBOARDING.md)
- [Guide de contribution](docs/CONTRIBUTING.md)
- [Stratégie de tests](docs/TESTING_STRATEGY.md)

Les procédures de release et rollback sont des opérations séparées, soumises
à autorisation explicite. Le démarrage rapide ci-dessus ne les exécute pas.
