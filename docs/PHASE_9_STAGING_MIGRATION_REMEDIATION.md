# Phase 9 — plan de remédiation des migrations staging

## Statut et portée

Ce document prépare une remédiation **staging uniquement**. Il ne constitue
ni une autorisation de mutation, ni une preuve d'alignement distant après
remédiation. Production est exclue.

Photographie read-only d'autorité du 6 août 2026 :

- projet staging : `cycbnnojcymjnaqomlyj`;
- sources canoniques : 149;
- plan staging final : 145 versions, après cinq exclusions et un overlay;
- historique staging observé deux fois : 141 versions;
- version supplémentaire : 0;
- doublon : 0;
- inversion relative : 0;
- verdict : `HISTORY_AND_STRUCTURE_DRIFT`.

Versions manquantes, dans leur ordre strict d'application :

1. `20260718150000` — `20260718150000_seedance_jobs.sql`;
2. `20260729100000` — `20260729100000_create_handle_new_user_trigger.sql`;
3. `20260805100000` — `20260805100000_publish_messages_realtime.sql`;
4. `20260806100000` — `20260806100000_enforce_payments_stripe_event_unique_constraint.sql`.

Aucune promotion Preview et aucune répétition Preview du rollback ne sont
permises tant qu'une nouvelle photographie read-only ne retourne pas
exactement `ALIGNED`.

## Garde local de préparation

Le préparateur local pur s'exécute uniquement sur un inventaire JSON local
acquis séparément :

```bash
node scripts/preproduction/prepare-staging-migration-remediation.mjs \
  --inventory /chemin/local/inventaire-staging.json
```

Il ne charge aucun `.env`, n'utilise aucun client réseau et n'exécute aucune
commande. Il retourne `READY` uniquement si :

- le ref est exactement celui de staging;
- seules les quatre versions attendues manquent;
- aucune version supplémentaire ou dupliquée n'existe;
- l'ordre relatif est conforme;
- les sept observations structurelles correspondent à la photographie;
- chaque source appartient au plan final et son SHA-256 correspond au
  manifeste versionné.

Toute autre situation retourne `BLOCKED`. `READY` signifie « plan local
cohérent », jamais « mutation distante autorisée ».

## Préchecks opérateur obligatoires

Avant toute autorisation future :

1. confirmer branche, SHA et worktree propres;
2. identifier explicitement le projet staging et exclure Production;
3. acquérir une nouvelle photographie read-only de l'historique et des sept
   invariants structurels;
4. exécuter le préparateur et exiger `READY`;
5. confirmer une sauvegarde exploitable ou une capacité PITR couvrant la
   fenêtre, sans la supposer;
6. vérifier l'absence de session DDL longue et de verrou bloquant;
7. fixer `lock_timeout` et `statement_timeout` bornés;
8. désigner opérateur, approbateur et condition d'arrêt;
9. approuver séparément le mécanisme qui appliquera **une seule migration** et
   enregistrera atomiquement sa version dans l'historique Supabase;
10. arrêter si l'outil propose plusieurs migrations dans une même opération
    opaque.

Le materializer global existant ne doit pas être utilisé aveuglément pour ce
sous-batch : sa commande finale peut regrouper tous les éléments en attente.
Une exécution distante exige un mode par version, revu et autorisé séparément.
Aucune insertion manuelle improvisée dans le ledger Supabase n'est permise.

## Analyse des migrations

### 1. Seedance — `20260718150000`

| Propriété | Contrat |
|---|---|
| Dépendances | `auth.users`, `public.exercises_db`, `gen_random_uuid()` |
| État requis | `public.seedance_jobs` totalement absente |
| Objets | table de 15 colonnes, PK, deux FK `ON DELETE SET NULL`, deux index, RLS activée |
| Données | aucune insertion ou réécriture |
| Accès | aucune policy; écritures `anon` et `authenticated` refusées par RLS |
| Transaction | DDL PostgreSQL transactionnel; une transaction dédiée |
| Locks | création et FK peuvent verrouiller brièvement les relations référencées |
| Durée attendue | courte sur l'état observé vide; timeout opérateur obligatoire |
| Risque | faible sur données, modéré sur contrat RLS/colonnes |

`CREATE TABLE IF NOT EXISTS` ne complète pas une table homonyme partielle. Si
la table existe, même incomplète, la décision est `STOP`; il faut inventorier
colonnes, contraintes, index, RLS, policies et propriétaire avant toute suite.

Postconditions : table et 15 colonnes présentes, trois index attendus, RLS
active, aucune policy, aucune ligne, puis version enregistrée une fois.

### 2. Auth — `20260729100000`

| Propriété | Contrat |
|---|---|
| Dépendances | `auth.users`, `public.profiles`, fonction `public.handle_new_user()` |
| État requis | fonction exacte présente; trigger `on_auth_user_created` absent |
| Objet | trigger `AFTER INSERT` par ligne sur `auth.users` |
| Données | aucune mutation lors de l'application |
| Transaction | DDL transactionnel; une transaction dédiée |
| Locks | verrou DDL bref sur `auth.users`; éviter les créations Auth concurrentes |
| Durée attendue | courte; timeout opérateur obligatoire |
| Risque | élevé Auth si fonction ou trigger homonyme divergent |

La garde par nom ne corrige pas un trigger partiel ou mal défini. Si un trigger
homonyme existe, la décision est `STOP`, même si la version manque. La fonction
doit être `SECURITY DEFINER`, avoir `search_path=public` et borner le rôle issu
des metadata à `client` ou `coach`.

Postconditions : un seul trigger, définition exacte, création locale contrôlée
d'un utilisateur synthétique donnant un profil au bon rôle, puis cleanup Auth
et profil sans doublon ni élévation admin.

### 3. Realtime — `20260805100000`

| Propriété | Contrat |
|---|---|
| Dépendances | table `public.messages`, publication `supabase_realtime` |
| État requis | table et publication présentes; entrée messages absente |
| Objet | une entrée `public.messages` dans la publication |
| Données | aucune ligne métier modifiée |
| Transaction | DDL transactionnel; une transaction dédiée |
| Locks | verrou DDL bref sur la publication et la table |
| Durée attendue | courte; timeout opérateur obligatoire |
| Risque | modéré Realtime, RLS inchangée |

Si la publication n'existe pas, la migration échoue sans état partiel. Si
l'entrée existe déjà une fois, le replay est un no-op; si l'inventaire est
ambigu, `STOP` avant application.

Postconditions : exactement une entrée pour `public.messages`, nombre et
contenu des autres publications inchangés, policies RLS inchangées.

### 4. Billing — `20260806100000`

| Propriété | Contrat |
|---|---|
| Dépendances | `public.payments`, colonne nullable `stripe_event_id`, ancien index unique partiel exact |
| État requis | zéro doublon non nul; contrainte absente; index partiel compatible présent |
| Objet | contrainte réelle `UNIQUE (stripe_event_id)` et index non partiel associé |
| Données | aucune mise à jour ni suppression; plusieurs `NULL` restent permis |
| Transaction | bloc DDL atomique dans une transaction dédiée |
| Locks | scan anti-doublon puis locks sur `payments`; timeout de lock obligatoire |
| Durée attendue | dépend du volume et des sessions concurrentes; ne jamais extrapoler le temps local |
| Risque | élevé Billing en cas de doublon ou de lock |

Le contrôle des doublons précède la suppression de l'ancien index. La
transaction évite une fenêtre visible sans unicité : un échec restaure l'index
partiel. Une contrainte ou un index homonyme incompatible provoque `STOP`.

Postconditions : contrainte exacte, index non partiel, plusieurs `NULL`
acceptés, doublon non nul refusé, `ON CONFLICT(stripe_event_id)` fonctionnel,
replay webhook idempotent et tests Billing verts.

## Ordre et protocole d'application

L'ordre chronologique est confirmé par les dépendances et le plan final. Il
est obligatoire. Les quatre versions seront ajoutées après les 141 entrées en
temps d'application; la comparaison finale les trie par version, conformément
au comparateur.

Pour chaque étape, l'opérateur doit :

1. acquérir l'état read-only préalable;
2. exiger la précondition exacte;
3. lancer un dry-run ne contenant que cette migration;
4. contrôler version, nom et SHA-256;
5. obtenir l'autorisation de l'étape;
6. appliquer SQL et historique dans une frontière atomique supportée;
7. exécuter immédiatement les assertions post-application;
8. acquérir à nouveau l'historique read-only;
9. décider `CONTINUE` seulement si toutes les preuves sont vertes.

Après un échec, la décision par défaut est `STOP`. La poursuite n'est possible
qu'après preuve read-only que la transaction a été annulée, qu'aucun verrou ou
objet partiel ne subsiste et que l'état correspond exactement à la dernière
étape validée. Une étape réussie n'est jamais annulée par un downgrade SQL;
une correction nécessite une migration compensatoire séparée.

## Scénarios d'échec validés localement

| Scénario | État attendu | Décision |
|---|---|---|
| échec avant la première version | ledger 141, structure initiale intacte | `STOP`; relance possible après nouvelle lecture |
| table Seedance partielle | transaction annulée, table toujours absente | `STOP`; analyser l'objet, ne pas poursuivre |
| échec entre Seedance et Auth | Seedance reste validée, ledger à 142 | `STOP`; reprendre à Auth après preuve read-only |
| trigger Auth homonyme erroné | postcondition le détecte, transaction simulée annulée | `STOP`; aucune correction automatique |
| replay d'une migration | no-op structurel, ledger non dupliqué | `CONTINUE` uniquement si postconditions identiques |
| doublons Billing inattendus | exception avant suppression de l'index; transaction annulée | `STOP`; remédiation de données séparée |
| lock Billing | `lock_timeout`, transaction annulée, index partiel conservé | `STOP`; attendre puis prouver la libération du backend |
| objet/index homonyme incompatible | migration fail-closed | `STOP`; investigation dédiée |

Sont interdits : suppression de données pour faire passer la migration,
`migration repair`, réécriture d'une migration, downgrade SQL, reset distant,
force-push ou mutation Production.

## Dry-run local représentatif du 7 août 2026

Une stack Supabase Docker jetable a matérialisé les 141 versions du plan final
déjà observées à distance, incluant l'overlay et les cinq exclusions. Aucune
donnée réelle n'a été chargée.

| Contrôle | Résultat |
|---|---|
| projet local | identifiant jetable préfixé `moovx-remediation-dry-run-` |
| PostgreSQL | port dédié `64322` |
| base initiale | 141 versions, sept invariants structurels conformes |
| ordre appliqué | quatre versions dans l'ordre défini ci-dessus |
| replays | 4/4 `PASS` |
| Seedance | table/colonnes/index/RLS et refus d'écriture non privilégiée `PASS` |
| Auth | trigger unique, fonction, profil synthétique et cleanup `PASS` |
| Realtime | publication unique et autres entrées inchangées `PASS` |
| Billing | contrainte, `NULL`, doublon, `ON CONFLICT` et replay `PASS` |
| scénarios STOP | avant première, objet partiel, entre étapes, doublon et lock `PASS` |
| historique final local | 145/145, ordre lexical conforme |
| fingerprint structurel ciblé | `270c1c97a6d592b62659346c2a846d0e` |
| résidus synthétiques | 0 |
| durée | 63 607 ms |
| cleanup | conteneurs, volumes et répertoire jetables supprimés |

Des calibrations antérieures du harnais temporaire ont échoué sur des
assertions de preuve ou sur l'attente de libération du verrou; leurs cleanups
ont été vérifiés. Elles n'ont modifié ni les migrations ni une base distante.
Seul le run final ci-dessus constitue la preuve positive.

## Diagnostic local de restauration logique

Le 7 août 2026, l'échec antérieur d'une restauration logique a été reproduit
sur une stack Supabase locale jetable, sans nouvelle acquisition staging. La
cause exacte est l'instruction suivante du dump `roles.sql` :

```sql
GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";
```

Le rôle local `postgres` n'est pas superuser et ne peut pas émettre ce
`GRANT ROLE` au nom de `supabase_admin`. PostgreSQL retourne donc SQLSTATE
`42501`, classé `INSUFFICIENT_PRIVILEGE`. Une première fixture incomplète avait
retourné `42704` parce que le rôle cible n'existait pas; elle n'est pas retenue
comme diagnostic. Une autre calibration contenant un grant artificiel a aussi
été écartée avant la preuve finale.

Le harnais canonique local est :

```bash
node scripts/preproduction/restore-staging-backup-locally.mjs \
  --backup-dir /private/tmp/<backup-local-expurge> \
  --runs 2
```

Le défaut reste `--runs 2`. Le mode strict `--runs 1` qualifie uniquement une
première restauration opérateur dans une stack jetable et ne prétend pas
démontrer la reproductibilité. Le mode `--runs 2` conserve la preuve historique
avec deux stacks indépendantes et comparaison obligatoire des fingerprints,
compteurs et propriétaires. Toute autre valeur est refusée avec la
classification `INVALID_RUN_COUNT`.

Il exige exactement `roles.sql`, `schema.sql`, `data.sql`,
`history_schema.sql` et `history_data.sql`, dans un répertoire temporaire
local. Il restaure dans l'ordre `roles → schema → data → history schema →
history data`, avec `ON_ERROR_STOP`, une transaction unique et
`session_replication_role=replica` avant les données. Conformément à la
procédure Supabase de backup/restore, il accepte deux formes strictes de
`roles.sql` : zéro occurrence lorsque la CLI actuelle a déjà omis le grant, ou
exactement une occurrence officielle, alors retirée uniquement dans une copie
en mémoire. Les fichiers source ne sont jamais modifiés. Une occurrence
multiple ou une instruction apparentée mais non reconnue bloque la restauration
avec une classification expurgée.

- zéro occurrence : `OFFICIAL_GRANT_ALREADY_OMITTED`;
- une occurrence officielle : `OFFICIAL_GRANT_FILTERED`;
- plusieurs occurrences : `MULTIPLE_OFFICIAL_GRANTS`;
- variante apparentée : `UNRECOGNIZED_PRIVILEGE_GRANT`.

Le harnais refuse `--linked`, `--prod`, `--db-url`, `--password`, `--no-owner`,
les entrées distantes, les commandes `psql` dangereuses et tout ensemble de
fichiers incomplet ou supplémentaire. Il ne charge ni `.env`, ni client
réseau. Une suppression globale des clauses `OWNER` ou `GRANT`, une élévation
de rôle, un changement des propriétaires Supabase gérés ou un ordre de
restauration différent sont explicitement exclus : ces stratégies masqueraient
le contrat de sécurité au lieu de traiter l'incompatibilité précise.

Quatre restaurations indépendantes d'une sauvegarde entièrement synthétique,
deux avec zéro occurrence officielle et deux avec une occurrence officielle,
ont retourné `RESTORABLE`, avec l'empreinte commune
`71c68b801ba2e5511f944bfb72fddb65`. Chaque run a vérifié deux lignes métier
synthétiques, deux versions d'historique, RLS active, une policy, une fonction
`SECURITY DEFINER`, une publication, l'absence du membership incompatible et
les propriétaires `supabase_admin` inchangés pour `auth`, `storage` et
`realtime`. Les comptes Auth et objets Storage sont restés vides; les quatre
stacks, volumes et répertoires jetables ont été nettoyés.

Cette preuve valide uniquement le mécanisme local et son diagnostic. La
sauvegarde staging antérieure n'est pas conservée, aucune nouvelle sauvegarde
staging n'a été acquise et la capacité réelle de restauration staging reste à
attester sous autorisation séparée.

Le contrat acceptant une occurrence déjà omise a été ajouté après qu'un dump
staging réel acquis le 7 août 2026 a présenté zéro occurrence. Ce dump a été
supprimé sans exécuter son SQL. Aucun dump staging réel n'a encore été restauré
avec ce nouveau contrat; la capacité de récupération staging reste donc non
attestée et Preview reste `NO_GO`.

Le mode strict à une restauration a été validé uniquement avec les deux formes
de fixture synthétique. Aucun nouveau dump staging réel n'a été acquis ou testé
avec ce mode; la capacité réelle staging reste non attestée.

Le contrôle de sécurité des artefacts SQL reste fail-closed, mais analyse
désormais le contexte lexical au lieu de rechercher les motifs dangereux dans
le texte brut. Les commentaires, chaînes SQL, identifiants entre guillemets,
corps dollar-quoted et blocs de données `COPY ... FROM STDIN` sont masqués en
conservant leurs lignes et positions avant l'analyse. Une vraie méta-commande
`psql` `\!` en début de ligne et un vrai statement top-level
`COPY ... FROM/TO PROGRAM` restent bloqués avant toute
création de stack, avec des classifications expurgées. Un commentaire bloc,
une chaîne, un identifiant quoted ou un corps dollar-quoted non terminé bloque
avec `SQL_LEXING_INCOMPLETE`; aucune construction ambiguë n'est supposée sûre.

Ce durcissement a été qualifié uniquement sur des fixtures synthétiques : les
motifs documentaires sont acceptés, tandis que les commandes shell et
`COPY PROGRAM` exécutables sont refusés avant la stack. Aucun nouveau dump
staging réel n'a été acquis ou restauré après ce correctif. La capacité réelle
de restauration staging reste non attestée et Preview reste `NO_GO`.

Une acquisition read-only staging autorisée le 7 août 2026 a ensuite produit
les cinq artefacts attendus, avec 141 versions d'historique et révocation HTTP
200 du credential CLI temporaire. L'unique restauration réelle demandée avec
`--runs 1` s'est arrêtée dans `roles.sql`, instruction 7, ligne 11, sur
`GRANT SET ON PARAMETER` pour `log_min_messages` vers le rôle géré
`supabase_realtime_admin`. Le rôle local initiateur `postgres` possède
`CREATEROLE` mais n'est pas superuser; PostgreSQL retourne donc `42501`
`INSUFFICIENT_PRIVILEGE`. Cette instruction est distincte du grant
`cli_login_postgres` précédemment traité.

La reproduction synthétique locale retourne le même SQLSTATE et la même
opération. Sur une stack Supabase jetable, le rôle géré préexistant
`supabase_admin` peut appliquer exactement ce privilège, après quoi
`has_parameter_privilege(..., 'SET')` est vrai. Le harnais reconnaît donc
uniquement la forme officielle exacte, l'applique séparément sous ce rôle géré,
puis la retire uniquement de la copie mémoire transmise à la restauration
canonique. Zéro occurrence reste accepté; une occurrence multiple ou toute
variante apparentée bloque. Aucun `GRANT` ou `OWNER` générique n'est filtré,
le dump source et `ON_ERROR_STOP` restent inchangés, et aucun superuser
artificiel n'est créé.

Le backup réel n'a pas été rejoué après ce correctif : aucune deuxième
restauration et aucun dry-run `141 → 145` n'ont été exécutés. La capacité réelle
de restauration staging demeure non attestée et Preview reste `NO_GO`.
Une validation synthétique du chemin corrigé a dépassé
`canonical_restore`, puis s'est arrêtée sur une erreur distincte en phase
`inventory`. Cette nouvelle erreur n'est pas diagnostiquée dans ce sous-batch
et aucun verdict `RESTORABLE` de bout en bout n'est revendiqué.

## Validation distante future

Après les quatre étapes, une nouvelle acquisition read-only indépendante doit
vérifier :

- 145 versions, aucun manque, ajout, doublon ou inversion;
- les sept invariants structurels dans leur état final;
- absence d'erreur Auth, Realtime, Billing ou Seedance;
- absence de résidu synthétique;
- comparateur local avec verdict exact `ALIGNED`.

Un verdict différent de `ALIGNED` impose `NO_GO`. La remédiation est distincte
de la release : aucune promotion Preview ne suit automatiquement une réussite.

## Interdictions et limites

- aucune commande Production;
- aucun secret, URL signée ou donnée métier dans les rapports;
- aucun `db push` global opaque;
- aucun `migration repair`;
- aucun reset distant;
- aucune restauration sans backup/PITR attesté;
- aucun rollback applicatif présenté comme substitut à une migration
  compensatoire;
- aucune affirmation que staging est remédié avant la preuve distante finale.
