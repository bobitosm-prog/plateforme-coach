# Phase 6 — Vercel Preview isolé

## Cible

Le Preview Phase 6 est réservé à :

- projet Vercel `plateforme-coach`
  (`prj_WI7LdZkzqU2SlXUCPCfBaASO52NJ`);
- team `bobitosm-3757s-projects`
  (`team_jsmwUqZtuecSoWUzmdJF8N1W`);
- branche `phase-6-staging`;
- alias attendu `moovx-phase-6-staging.vercel.app`;
- Supabase staging `cycbnnojcymjnaqomlyj`.

Production Vercel, `app.moovx.ch`, `moovx.ch`, Supabase
`njlzossopgknanhkzcbk`, Stripe et les webhooks restent interdits.

## Inventaire du 26 juillet 2026

La CLI Vercel `50.37.3` est authentifiée sous `bobitosm-3757`. Le dépôt est
déjà lié au bon projet et au bon team. Le projet utilise Next.js, Node.js 24 et
la racine `.`.

Vingt variables possèdent actuellement une portée Preview globale :

- Supabase : URL, clé publique et service role ;
- URLs applicatives : `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`;
- Stripe : clé secrète, secret webhook, clé publique et quatre Price IDs ;
- Anthropic et cron ;
- SMTP : host, port, user et password ;
- e-mails admin et coach.

Leurs valeurs n'ont pas été lues. Plusieurs entrées partagent explicitement
les environnements Production et Preview; elles ne peuvent donc pas constituer
une autorité staging. La branche `phase-6-staging` possède zéro variable
branch-scoped et n'existe ni localement ni à distance.

Les derniers Preview existants concernent d'autres branches. Le plus récent
échoue pendant `npm install` avec `Invalid Version`; aucune erreur n'est
attribuée à `phase-6-staging`, qui n'a jamais été déployée.

## Contrat branch-scoped

Le manifeste
`scripts/preproduction/vercel-preview-manifest.json` exige 23 surcharges
Preview limitées à `phase-6-staging` :

- Supabase staging : URL, anon key et service role ;
- URLs applicatives : alias `*.vercel.app` attendu ;
- autorité `MOOVX_ENVIRONMENT=staging`;
- identités admin/coach uniquement sous `moovx.invalid`;
- Stripe, webhook, Anthropic, cron et SMTP explicitement désactivés.

Le garde refuse Production, `--prod`, un host MoovX public, Supabase
production, Stripe live, HTTP/local, un alias non-Vercel, une variable absente
ou une portée différente de la branche. Il ne charge aucun fichier `.env`.

Les clés Supabase staging ont été obtenues silencieusement dans un fichier
temporaire privé, validées sans affichage, puis supprimées. Aucune valeur n'a
été écrite dans Git ou dans un rapport.

## Blocage fail-closed

Vercel refuse l'ajout d'une variable branch-scoped tant que la branche
connectée n'existe pas :

```text
reason: branch_not_found
```

La première variable `MOOVX_ENVIRONMENT` a été refusée; aucune des 23
variables n'a été créée.

Pousser directement la branche déclencherait potentiellement un Preview avant
la configuration des surcharges. Ce build pourrait hériter des vingt variables
Preview globales, dont plusieurs sont partagées avec Production. Cette course
viole le contrat anti-production; aucune branche, aucun déploiement et aucun
alias n'ont donc été créés.

## Reprise sûre proposée

La documentation Vercel confirme qu'un push de branche déclenche normalement
un Preview. Elle ne documente pas `[skip ci]` comme garde autonome. La solution
minimale démontrable est donc un commit bootstrap, créé dans un worktree
temporaire propre et limité à `phase-6-staging`, qui ajoute dans `vercel.json`
la configuration `git.deploymentEnabled` désactivant les déploiements Git
automatiques pour cette seule branche.

Après le push sans build, l'opérateur peut :

1. créer les 23 variables branch-scoped ;
2. vérifier leur inventaire sans valeur ;
3. déclencher explicitement le Preview depuis le worktree propre ;
4. créer l'alias `moovx-phase-6-staging.vercel.app`;
5. vérifier HTTPS, absence de redirection production et connexion Auth staging.

Le déploiement final est déclenché explicitement par CLI; la désactivation
concerne uniquement l'intégration Git automatique de la branche staging.

Ce bootstrap exige une autorisation supplémentaire, car la consigne actuelle
interdit tout commit automatique et toute modification non explicitement
autorisée de `vercel.json`. Sans cette autorisation, la Phase 6 reste `blocked`.

## Mise à jour — séparation locale Stripe

Le Preview Phase 6 a depuis été créé et validé en lecture seule. Sa route
webhook technique reste protégée par le SSO Vercel et n'est donc pas joignable
par Stripe sans un Protection Bypass for Automation explicitement autorisé.

Le runtime local prépare deux routes distinctes :

- `/api/stripe/webhook/platform`;
- `/api/stripe/webhook/connect`.

La prochaine configuration branch-scoped ajoutera, sans supprimer la variable
historique :

- `STRIPE_PLATFORM_WEBHOOK_SECRET`;
- `STRIPE_CONNECT_WEBHOOK_SECRET`;
- `STRIPE_WEBHOOK_EXPECTED_LIVEMODE=false`.

Les URLs opérateur pourront utiliser uniquement le modèle expurgé
`?x-vercel-protection-bypass=<secret Vercel non persisté>`. Aucun bypass,
endpoint ou secret réel n'est créé par cette préparation locale.
