# MoovX — Release Candidate RC1

## Statut

- RC1 active.
- Branche : `phase-6-staging`.
- Phase 9 reste inactive jusqu’à validation explicite.
- Phases 1 à 8 réconciliées : 124/124 tâches et 36/36 critères de sortie
  `met`.

## Portée validée

- Suite complète : 306 fichiers de test, 2571 tests réussis et 3 `todo`
  non bloquants.
- TypeScript vert.
- ESLint : exception globale historique documentée; les périmètres nouveaux
  et ciblés ne présentent aucune régression de lint.
- Deux builds de production hermétiques.
- Authentification, inscription, onboarding, récupération de session et
  invitations coach.
- Checkout plateforme et coach avec Stripe local.
- Webhooks Stripe Platform et Connect, dont signature, finalisation et replay
  idempotent.
- Supabase : 144 migrations et fingerprint canonique
  `6d14ca918056d5fe5a2283813c0f9147`.
- Matrices RLS/PostgREST.
- Messagerie, Realtime, Push et Chat IA.
- Training.
- Nutrition.
- Progression.
- Quinze flux IA avec mocks et goldens, sans fournisseur réel.
- Quotas et journalisation de l’usage IA.
- SMTP et Mailpit dans les parcours couverts.
- CDN public `media.moovx.ch`, cache et support Range.
- Médias privés servis par URL signée.
- Polices hébergées localement.
- Budgets et baselines performance.
- Scan des secrets, tokens, URL signées et données personnelles.
- Audit des dépendances et inventaire des vulnérabilités.

## Corrections sécurité importantes

- Suppression de `getPublicUrl()` pour le bucket privé `progress-photos`.
- Remplacement par `createSignedUrl(..., 3600)` afin de produire des URL
  temporaires.
- Séparation stricte entre les médias publics servis par le CDN
  `media.moovx.ch` et les médias privés des utilisateurs.
- Restauration du trigger Auth `auth.users → public.handle_new_user()` pour
  garantir la création canonique des profils.
- Validation des garde-fous Stripe et de l’isolation entre staging et
  production.

## Performance

- Deux baselines validées avec 79 contrôles chacune et zéro dépassement
  informatif.
- Client mobile LCP : `386 ms` → `322 ms`, amélioration de `16,580 %`.
- Coach desktop LCP : `280 ms` → `222 ms`, amélioration de `20,714 %`.
- INP dans la plage de référence.
- CLS stable.
- Artefact : `perf/baseline/phase-8-comparison.json`.

## Limitations connues

- Aucun E2E navigateur complet coach/client Realtime.
- Aucun E2E navigateur Training complet.
- Aucun E2E navigateur Nutrition complet.
- Aucun E2E navigateur Progression complet.
- Aucun E2E SMTP/Mailpit générique.
- Trois `todo` non bloquants dans
  `tests/unit/coach-invitation-contract.test.ts`.
- Dette ESLint globale historique acceptée pour RC1.
- Warnings Supabase liés à `getSession()` encore observés.
- Warnings Next Image `qualities` encore observés.
- Phase 9 inactive.

## Vulnérabilités et dépendances

`npm audit --omit=dev` signale six vulnérabilités encore ouvertes :
une `moderate` et cinq `high`.

- Aucune mise à jour automatique n’a été appliquée.
- `npm audit fix --force` n’a pas été exécuté.
- Des upgrades potentiellement breaking sont nécessaires pour
  `@anthropic-ai/sdk`, `next`/`postcss`/`sharp` et `nodemailer`.
- `xlsx` ne dispose d’aucun correctif disponible.

Ces éléments ne sont pas corrigés et devront être traités dans une tranche
dédiée.

## Dettes techniques restantes

- Composants historiques volumineux.
- Hooks multi-domaines historiques.
- Dette ESLint globale.
- Couverture E2E navigateur incomplète sur certains domaines.
- Dépendances vulnérables encore ouvertes.
- Anciens adaptateurs et formats legacy encore conservés.
- Validation humaine visuelle encore ouverte.
- Runbook de déploiement et rollback encore ouvert.

## Critères restant ouverts avant validation finale RC1

[Runbook RC1 de déploiement et rollback](RC1_DEPLOYMENT_ROLLBACK_RUNBOOK.md)

- Préparer le runbook de déploiement et rollback.
- Exécuter une validation humaine visuelle desktop/mobile.
- Obtenir la validation explicite RC1 avant Phase 9.

## Décision

Ce document décrit une Release Candidate. Il ne constitue pas une déclaration
de mise en production. Aucune production n’a été touchée et aucune
vulnérabilité n’est présentée comme corrigée lorsqu’elle reste ouverte.
