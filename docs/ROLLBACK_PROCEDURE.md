# Procédure canonique de rollback MoovX

## Statut et portée

Cette procédure définit le contrat d'une répétition de rollback. Elle ne
déclenche ni déploiement, ni mutation distante, ni restauration. La tâche
Phase 9 reste ouverte jusqu'à une répétition chronométrée et validée.

La Production est exclue. Une répétition Production exige une autorisation
distincte, une cible confirmée et des capacités de sauvegarde attestées.

## Déclencheurs

Une décision `ROLLBACK_REQUIRED` peut être proposée après un mauvais
environnement ou SHA, une régression critique, des erreurs `5xx` persistantes,
une indisponibilité Auth, une incohérence de données, des webhooks mal scopés
ou l'exposition d'un média privé. Elle doit être approuvée avant le début du
chronomètre.

## Rôles

- **Opérateur** : exécute le préflight et la procédure autorisée.
- **Approbateur** : confirme la décision et le périmètre.
- **Chronométreur** : mesure chaque segment sans neutraliser les attentes de
  plateforme.
- **Responsable d'incident** : tient le canal, le journal et la décision
  finale.
- **Autorité Production** : seule autorité pouvant permettre ultérieurement
  une action Production.

Le journal enregistre des rôles, jamais des identités ou credentials.

## États et décisions

| État | Signification |
|---|---|
| `DRAFT` | Contrat incomplet ou non évalué |
| `READY_FOR_REHEARSAL` | Préflight local favorable; aucune action exécutée |
| `REHEARSAL_RUNNING` | Répétition explicitement autorisée en cours |
| `ROLLBACK_SUCCEEDED` | Cible saine restaurée et validations vertes |
| `ROLLBACK_FAILED` | Action terminée sans satisfaire le contrat |
| `NO_GO` | Invariant technique ou preuve obligatoire non conforme |
| `BLOCKED` | Autorité, sécurité ou rapport empêche l'opération |
| `MANUAL_RECOVERY_REQUIRED` | Retour automatisable impossible; reprise humaine requise |

Les décisions du préflight sont `READY`, `NO_GO` et `BLOCKED`. `READY` ne
constitue jamais une autorisation de répétition ou de déploiement.

## Chronomètre officiel

Le seuil Phase 9 porte sur un rollback applicatif strictement inférieur à
30 minutes.

**Début :** instant où `ROLLBACK_REQUIRED` est approuvé, après identification
de l'environnement, de l'incident et de l'artefact sain.

**Fin :** artefact sain restauré, environnement `READY`, SHA réellement servi
confirmé, smoke tests obligatoires verts et journal minimal enregistré.

Les mesures suivantes sont conservées séparément :

- `decisionMs`;
- `preflightMs`;
- `actionMs`;
- `platformWaitMs`;
- `validationMs`;
- `totalMs`.

`platformWaitMs` et les smoke tests font partie de `totalMs`. Le préflight est
mesuré séparément et précède l'approbation qui déclenche le chronomètre.

## Preuve locale isolée du 6 août 2026

Deux répétitions indépendantes ont validé le contrat applicatif local avec des
artefacts synthétiques immuables et distincts. Elles ont utilisé des
répertoires temporaires et des ports dédiés différents, sans arrêter ni
réinitialiser la stack Supabase principale.

| Run | Port | Décision | Confirmation incident | Action rollback | Attente plateforme | Smoke tests | Durée officielle | Résultat | Cleanup |
|---|---:|---|---:|---:|---:|---:|---:|---|---|
| `local-run-1` | `62310` | `READY` | `92,940 ms` | `20,334 ms` | `61,048 ms` | `4,854 ms` | `87,429 ms` | `PASS` | complet |
| `local-run-2` | `63310` | `READY` | `78,343 ms` | `3,109 ms` | `59,795 ms` | `4,880 ms` | `69,295 ms` | `PASS` | complet |

Pour les deux runs, le chronomètre a commencé à l'approbation synthétique de
`ROLLBACK_REQUIRED` et s'est arrêté après démarrage de l'artefact sain,
confirmation du SHA servi, sept catégories de smoke tests vertes et écriture
du journal minimal. Les processus incident et sain, ports et répertoires
temporaires ont été supprimés après chaque exécution. Aucune donnée synthétique
n'a été créée.

Cette preuve démontre une répétition **locale synthétique** strictement
inférieure à 30 minutes. Elle ne démontre ni rollback Preview/Production, ni
attente réelle de plateforme, ni restauration de données/PITR. Le drift staging
`HISTORY_AND_STRUCTURE_DRIFT` reste `NO_GO` pour Preview.

## 1. Rollback applicatif

Le rollback applicatif redéploie un artefact connu comme sain sans modifier le
schéma ni les données.

- Un SHA seul ne prouve pas l'identité de l'artefact.
- Preview/Vercel exige un deployment ID immuable ou un identifiant équivalent,
  associé au SHA sain.
- L'artefact incident et l'artefact sain doivent être distincts.
- Après retour, le SHA réellement servi doit être contrôlé.
- L'artefact sain doit être compatible avec le schéma réellement présent.
- Aucun `git reset --hard`, force-push ou réécriture de branche partagée.

## 2. Rollback de configuration

- Capturer avant changement un inventaire expurgé des noms, présences,
  environnements et scopes; ne jamais capturer les valeurs.
- Preview utilise Stripe test uniquement.
- Restaurer atomiquement la configuration précédente ou appliquer une
  compensation bornée et journalisée.
- Vérifier ensuite l'environnement, les scopes, Auth et les intégrations.
- Un secret compromis est révoqué; il n'est pas simplement restauré.

## 3. Rollback de schéma

- Les migrations sont forward-only.
- Une migration appliquée n'est jamais supprimée ni réécrite.
- Aucun downgrade SQL improvisé.
- Une correction exige une migration compensatoire séparée, idempotente et
  revue.
- La compatibilité entre l'application saine et le schéma cible est
  obligatoire.
- Un verdict distant différent de `ALIGNED` impose `NO_GO` pour Preview,
  staging et Production.

Le drift staging actuel `HISTORY_AND_STRUCTURE_DRIFT` interdit donc une
répétition Preview. Le préflight ne le remédie pas.

La préparation de sa remédiation est décrite dans
[`PHASE_9_STAGING_MIGRATION_REMEDIATION.md`](PHASE_9_STAGING_MIGRATION_REMEDIATION.md).
Une nouvelle photographie read-only et un verdict exact `ALIGNED` sont requis
avant toute répétition Preview. Un rollback applicatif restaure un artefact;
il ne remplace jamais une migration compensatoire forward-only.

## 4. Rollback de données

- Une sauvegarde vérifiée est obligatoire avant toute restauration.
- PITR ou restauration logique n'est disponible que si la capacité est
  explicitement attestée; le dépôt ne la suppose jamais.
- Toute restauration destructive nécessite une autorisation distincte.
- Billing, Auth et Storage sont évalués et restaurés séparément.
- Les claims Stripe, paiements, événements, identités Auth et objets Storage
  ne sont jamais supprimés pour simplifier un incident.
- Une divergence de migration seule ne justifie pas une restauration globale.

Le harnais
`scripts/preproduction/restore-staging-backup-locally.mjs` permet de vérifier
une première restauration opérateur avec `--runs 1`, ou sa reproductibilité
avec `--runs 2` dans deux stacks Supabase locales jetables indépendantes. Sans
option, le comportement par défaut reste deux runs. Toute autre valeur est
refusée. Il
respecte l'ordre `roles → schema → data → history`, conserve les propriétaires
et permissions, et accepte soit un dump où la CLI a déjà omis le grant
`cli_login_postgres`, soit exactement l'instruction officielle, retirée dans
une copie en mémoire. Une occurrence multiple ou une variante apparentée
inconnue bloque la restauration. La preuve synthétique du 7 août 2026 est reproductible
et n'atteste pas qu'une sauvegarde staging réelle est disponible ou
restaurable. Toute nouvelle acquisition ou répétition staging exige toujours
une autorisation séparée.

Avant toute création de stack, le harnais applique aussi une analyse SQL
contextuelle et fail-closed. Il masque commentaires, chaînes, identifiants
quoted, corps dollar-quoted et données `COPY ... FROM STDIN`, puis refuse les
vraies méta-commandes `psql` `\!` en début de ligne et les statements top-level
`COPY ... FROM/TO PROGRAM`.
Tout contexte lexical non terminé produit `SQL_LEXING_INCOMPLETE`. Les motifs
strictement documentaires ne sont pas exécutés et ne constituent plus des faux
positifs. Aucun dump staging réel n'a encore été restauré après ce correctif;
la capacité réelle reste non attestée et Preview demeure `NO_GO`.

Le dump staging réel acquis le 7 août 2026 contient également une occurrence
officielle de `GRANT SET ON PARAMETER` pour `log_min_messages` vers
`supabase_realtime_admin`. Elle échoue sous le rôle local non-superuser
`postgres` avec SQLSTATE `42501`. Le harnais applique cette unique forme exacte
avec le rôle Supabase géré préexistant `supabase_admin`, puis l'omet de la copie
mémoire du SQL canonique. Zéro occurrence est accepté; toute multiplicité ou
variante est bloquée. Il n'existe aucun filtrage générique des privilèges et le
dump source n'est jamais réécrit. Le backup réel n'a pas été relancé après
cette correction; la capacité staging reste non attestée et Preview demeure
`NO_GO`.
L'erreur distincte en phase `inventory` provenait d'une fixture temporaire qui
ne créait pas `supabase_migrations.schema_migrations`. Le restore était sain,
mais le comptage d'historique échouait avec SQLSTATE `42P01` : classification
`INVENTORY_FAILURE`, et non `RESTORE_FAILURE`. L'inventaire vérifie désormais
ses prérequis et distingue `PRESENT`, `ABSENT`, `ERROR` et `NOT_APPLICABLE`;
une erreur SQL ne peut jamais devenir silencieusement `ABSENT`.

La fixture canonique complète est `RESTORABLE` avec `--runs 1` et reproductible
avec `--runs 2`, avec l'empreinte commune
`ba98812d295b81320b298a35cc650ec3`. La fixture sans historique est bloquée.
Cette preuve est exclusivement synthétique : le backup staging réel n'a pas
été relancé, la capacité réelle staging reste non attestée, Preview demeure
`NO_GO` et la tâche rollback reste ouverte.

Le 7 août 2026, deux restaurations locales indépendantes du même backup staging
réel ont ensuite produit `RESTORABLE`, le même fingerprint, les mêmes compteurs
et les mêmes owners. La capacité de récupération est désormais qualifiée
`RECOVERY_CAPABILITY_VERIFIED`; cela ne rend pas Preview déployable et
n'autorise aucune mutation staging.

Le garde de la tentative de dry-run suivante a révélé que Supabase CLI tronque
les identités Docker à 40 caractères. L'isolation ne dépend plus du seul nom :
elle exige les labels Compose et Supabase CLI exacts, le conteneur et le volume
DB attendus, le port publié et un répertoire temporaire distinct. Deux stacks
synthétiques ont confirmé `ISOLATION_RESOURCES_CONFIRMED`. Aucun backup réel
n'a été rejoué avec ce correctif, aucun dry-run `141 → 145` n'a été relancé et
Preview reste `NO_GO`.

## 5. Rollback opérationnel

1. Déclarer l'incident et ouvrir un canal dédié.
2. Classer l'incident : application, configuration, schéma ou données.
3. Identifier les artefacts incident et sain, ainsi que leur compatibilité.
4. Recueillir approbation, opérateur et chronométreur.
5. Exécuter le préflight local pur.
6. Arrêter si la décision n'est pas `READY`.
7. Obtenir une autorisation séparée pour toute répétition réelle.
8. Démarrer le chronomètre à l'approbation `ROLLBACK_REQUIRED`.
9. Exécuter une seule stratégie, puis les smoke tests.
10. Confirmer le SHA servi, arrêter le chronomètre et clore le journal.

## Contrat de preuves

Les preuves minimales sont :

- `candidateIdentity`;
- `healthyArtifactIdentity`;
- `environmentGuard`;
- `schemaCompatibility`;
- `migrationAlignment`;
- `authorization`;
- `smokeTestPlan`;
- `cleanupPlan`;
- `timingPlan`;
- `evidenceSanitization`.

Chaque preuve contient exactement :

```json
{
  "status": "PASS",
  "source": "source-bornee",
  "capturedAt": "2026-08-06T18:00:00.000Z"
}
```

Les statuts autorisés sont `PASS`, `FAIL`, `MISSING` et `NOT_APPLICABLE`.
`FAIL` ou `MISSING` sur une preuve obligatoire impose `NO_GO` ou `BLOCKED`.
`NOT_APPLICABLE` est admis seulement pour `migrationAlignment` lors d'une
répétition locale isolée utilisant un schéma reconstruit et compatible. Les
sources appartiennent à un ensemble fermé défini par le préflight.

L'entrée JSON contient exactement les champs suivants. Les identifiants
d'artefacts sont des références non sensibles; aucune URL ni valeur de variable
n'est admise.

```json
{
  "environment": "local",
  "branch": "phase-6-staging",
  "incidentSha": "1111111",
  "healthySha": "2222222",
  "incidentArtifactId": "artefact-incident",
  "healthyArtifactId": "artefact-sain",
  "artifactImmutabilityVerified": true,
  "servedShaBefore": "1111111",
  "migrationAlignmentVerdict": "LOCAL_NOT_REQUIRED",
  "schemaCompatibility": "LOCAL_REBUILT_COMPATIBLE",
  "releaseCandidate": {
    "incidentArtifactSha": "1111111",
    "healthyArtifactSha": "2222222"
  },
  "approvals": {
    "operator": true,
    "approver": true,
    "timer": true
  },
  "backupCapability": {
    "required": false,
    "attested": false
  },
  "requiredSmokeTests": [
    "environment",
    "servedSha",
    "auth",
    "criticalJourneys",
    "dataConsistency",
    "privateMedia",
    "billing"
  ],
  "evidence": {},
  "stripeMode": "test",
  "requestedCommands": [],
  "productionAuthorized": false,
  "startedAt": "2026-08-06T18:00:00.000Z"
}
```

## Préflight local pur

```bash
npm run rollback:preflight -- --input /chemin/local/rollback-preflight.json
```

Le préflight :

- lit un fichier JSON local explicite;
- ne charge aucun `.env`;
- ne lit aucun secret;
- n'utilise aucun client réseau;
- n'exécute aucune commande;
- retourne zéro uniquement pour `READY`;
- affiche uniquement un rapport expurgé.

Il refuse notamment Production sans autorisation distincte, Stripe live,
secrets, `--prod`, `--linked`, force-push, `git reset --hard`, mutations
Supabase distantes, réécriture de migrations, SQL destructif et restauration
sans sauvegarde attestée.

## Frontières d'environnement

| Environnement | Règle |
|---|---|
| Local isolé | Schéma reconstruit et `LOCAL_REBUILT_COMPATIBLE`; alignement distant explicitement `NOT_APPLICABLE` |
| Preview | Alignement distant exactement `ALIGNED`, compatibilité et artefact immuable obligatoires |
| Staging | Même contrat strict que Preview; aucune mutation implicite |
| Production | `BLOCKED` sans autorisation distincte; ce préflight ne déclenche jamais l'action |

## Smoke tests obligatoires

Le plan doit couvrir, dans l'ordre contractuel : environnement, SHA servi,
Auth, parcours critiques, cohérence des données, médias privés et Billing.

## Raisons bornées

Le rapport peut notamment contenir :

- `TARGET_ENVIRONMENT_NOT_ALLOWED`;
- `PRODUCTION_AUTHORIZATION_REQUIRED`;
- `INCIDENT_ARTIFACT_MISSING`;
- `HEALTHY_ARTIFACT_MISSING`;
- `HEALTHY_ARTIFACT_NOT_IMMUTABLE`;
- `INCIDENT_AND_HEALTHY_ARTIFACT_EQUAL`;
- `GIT_SHA_MISMATCH`;
- `MIGRATION_ALIGNMENT_NOT_ALIGNED`;
- `SCHEMA_COMPATIBILITY_UNPROVEN`;
- `APPROVAL_MISSING`;
- `BACKUP_CAPABILITY_UNPROVEN`;
- `REQUIRED_SMOKE_TESTS_MISSING`;
- `REQUIRED_EVIDENCE_MISSING`;
- `SECRET_DETECTED`;
- `LIVE_STRIPE_DETECTED`;
- `UNSAFE_COMMAND_DETECTED`;
- `REPORT_INVALID`.

## Journal minimal expurgé

```text
Incident :
Environnement :
Artefact incident (identifiant non sensible) :
Artefact sain (identifiant non sensible) :
SHA incident / sain :
Rôles et approbation :
Décision du préflight :
Segments et durée totale :
SHA réellement servi après action :
Résultat des smoke tests :
Décision finale :
```

Aucune clé, valeur de variable, URL signée, header, cookie, JWT ou donnée
personnelle n'est autorisée.

## État de la tâche

Cette procédure, son préflight et les deux répétitions locales du 6 août 2026
définissent et éprouvent le contrat local. La preuve locale est inférieure à
30 minutes, mais ne vaut pas répétition Preview/Production. La tâche Phase 9
« Définir et répéter la procédure de rollback » reste ouverte jusqu'à revue et
décision explicites sur cette preuve bornée.
