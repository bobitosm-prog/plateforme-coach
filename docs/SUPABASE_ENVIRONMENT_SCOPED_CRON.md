# Cron Supabase environment-scoped

## Décision

Cinq migrations cron historiques restent immuables. Quatre pilotent des appels
HTTP MoovX et une cinquième (`20260506_chat_ai_messages.sql`) programme une
purge SQL interne. Les quatre migrations HTTP sont documentées comme appliquées
en production et leurs références production sont protégées par
`scripts/preproduction/environment-guard.mjs`; les cinq sources sont épinglées
par le manifeste de migrations staging.

La stratégie staging est :

1. valider le manifeste privé et le ref lié exact avec le garde `pre-link`;
2. vérifier que `pg_cron` est absent avant le replay;
3. appliquer les cinq migrations historiques dans leur ordre lexical : leurs blocs
   cron deviennent des no-op;
4. appliquer la migration corrective
   `20260725190000_configure_environment_scoped_cron.sql`, sans effet
   automatique sur les jobs;
5. une fois l'alias Preview et le secret disponibles, exécuter
   `scripts/preproduction/configure-cron-jobs.sql`;
6. relire les quatre jobs et confirmer la configuration avant toute preuve.

Le projet staging confirmé est `cycbnnojcymjnaqomlyj`. Le lien local et
l'absence distante de `pg_cron` ont été vérifiés. Le materializer
`scripts/preproduction/materialize-staging-migrations.mjs` refuse toute autre
cible, vérifie les 142 SHA-256 et reste limité à `--dry-run`. Il s'arrête
actuellement avant le workdir sur 53 migrations de données non autorisées.

Cette stratégie préserve les checksums et le comportement production. Elle
évite aussi toute fenêtre où un cron staging pourrait appeler
`app.moovx.ch`.

## État historique final

| Job | Fréquence UTC | Route |
|---|---|---|
| `weekly-diagnostic-auto` | `0 18 * * *` | `/api/weekly-diagnostic/cron` |
| `training-regen-auto` | `0 17 * * *` | `/api/training-regen/cron` |
| `streak-reminder-summer` | `0 16 * * *` | `/api/streak-reminder/cron` |
| `streak-reminder-winter` | `0 17 * * *` | `/api/streak-reminder/cron` |

La première migration weekly utilisait le dimanche `0 18 * * 0`; la seconde
la remplace par le job quotidien ci-dessus. Les jobs utilisent un bearer
`CRON_SECRET` et `Content-Type: application/json`. Weekly et Training
conservent le timeout historique de 120 secondes.

## Frontière fail-closed

`private.configure_moovx_cron(environment, base_url, secret)` valide tous ses
arguments avant la première mutation :

- `production` accepte uniquement `https://app.moovx.ch`;
- `staging` exige un origin HTTPS `*.vercel.app`;
- localhost, HTTP, chemin, query, credentials et domaines MoovX sont refusés
  en staging;
- environnement, URL ou secret absents sont refusés;
- `pg_cron`, `pg_net` et `supabase_vault` sont obligatoires.

Le secret est créé ou mis à jour dans Vault. `cron.job.command` ne contient
que des appels à `private.moovx_cron_url` et
`private.moovx_cron_headers`; aucun secret ou domaine n'y est incorporé.

L'appel est idempotent : configuration et Vault sont upsertés, les quatre
noms historiques sont désinscrits s'ils existent, puis exactement quatre
jobs sont recréés. La simple application de la migration corrective ne
modifie ni ne supprime aucun job production.

## Commande opérateur future

Cette commande est interdite tant que le projet staging et l'alias Preview ne
sont pas explicitement autorisés :

```bash
MOOVX_ENVIRONMENT=staging \
MOOVX_CRON_BASE_URL="$MOOVX_PREVIEW_URL" \
CRON_SECRET=<loaded-from-secret-store> \
psql "$SUPABASE_STAGING_DB_URL" \
  -X -v ON_ERROR_STOP=1 \
  -f scripts/preproduction/configure-cron-jobs.sql
```

Le script SQL charge les valeurs depuis l'environnement, ouvre une
transaction, active les trois extensions si nécessaire, configure les jobs,
puis commit. Toute erreur annule l'ensemble.

## Preuve locale

Le dry-run local transactionnel :

- crée temporairement `pg_cron`;
- applique la migration corrective;
- configure deux fois le même alias staging;
- vérifie les refus unknown, production-en-staging et HTTP;
- trouve quatre jobs et quatre noms distincts;
- trouve zéro `app.moovx.ch` et zéro domaine `moovx.ch` dans les commandes;
- vérifie l'alias Preview en configuration;
- annule tout par `ROLLBACK`.

Après rollback, ni `pg_cron` ni le schéma `private` ne subsistent localement.
