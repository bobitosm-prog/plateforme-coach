# Carte des domaines — MoovX

## Statut et usage

Cette carte décrit l'organisation applicative observée le 8 août 2026. Elle
répond d'abord à la question « où placer ce code ? » et renvoie aux contrats
plus détaillés. Elle ne transforme pas une cible future ou une exception legacy
en architecture déjà livrée.

Trois rôles doivent rester distincts :

- le **propriétaire** définit les invariants et écrit les données de son
  domaine ;
- le **lecteur transverse** consomme une projection ou un read model sans
  devenir propriétaire de la source ;
- l'**orchestrateur** compose plusieurs domaines pour un écran ou un workflow,
  sans déplacer leurs règles dans le composant ou le dashboard.

La règle de placement canonique est détaillée dans
[l'ADR 0008](adr/0008-domain-boundaries-and-code-placement.md) :

```text
UI / HTTP
  → orchestration applicative
    → domaine / services
      → repositories / ports
        → Supabase ou fournisseur externe
```

La session serveur et la RLS restent obligatoires pour les accès utilisateur.
Un identifiant fourni par le navigateur borne éventuellement une requête, mais
ne constitue jamais une autorité.

## Choisir l'emplacement

| Besoin | Emplacement recommandé |
|---|---|
| Page, composant, hook de présentation | `app/`, au plus près de la surface |
| Adaptation HTTP, parsing et réponse | `app/api/<surface>/route.ts` et `schema.ts` |
| Coordination d'un cas d'usage | service ou contrôleur du domaine sous `lib/<domaine>/` |
| Invariant, calcul ou modèle métier | module pur sous `lib/<domaine>/` |
| Lecture/écriture Supabase | repository injecté sous `lib/repositories/<domaine>/` ou port du domaine |
| Appel fournisseur | port du domaine et adaptateur fournisseur séparé |
| Composition de plusieurs domaines | orchestrateur `client-dashboard` ou `coaching`, sans nouvelle autorité métier |
| Décision durable entre plusieurs domaines | ADR indexé dans `docs/adr/` |

Avant de créer un nouveau fichier à la racine de `lib/`, rechercher le domaine
propriétaire. Les fichiers racine existants sont des exceptions historiques,
pas un modèle de placement pour le nouveau code.

## Auth / profil / onboarding

- **Responsabilité :** établir l'identité, créer et charger le profil, porter
  rôles, statut et progression d'onboarding.
- **Entrées UI/API :** `app/login/`, `app/register-client/`, `app/auth/`,
  `app/onboarding*/`, `app/api/user/` et `proxy.ts`.
- **Modules métier :** `lib/supabase/`, `lib/repositories/identity/`,
  `lib/repositories/profile/` et les loaders de `lib/client-dashboard/`.
- **Repositories/ports :** factories browser/server/admin, repositories
  identity/profile et client Auth Supabase injecté.
- **Données possédées :** identités `auth.users`, champs d'identité, rôle,
  statut et onboarding de `profiles`. Les champs financiers co-localisés dans
  `profiles` restent sous l'autorité Billing.
- **Données seulement lues :** abonnement pour le routage et relation active
  pour choisir une surface ; ces lectures n'accordent aucun droit par elles-mêmes.
- **Dépendances autorisées :** Supabase Auth, repository profil, RLS et services
  d'onboarding explicitement appelés.
- **Documentation :** [ADR 0001](adr/0001-phase-1-security-baseline.md),
  [ADR 0003](adr/0003-supabase-access-boundaries.md),
  [factories Supabase](SUPABASE_CLIENT_FACTORIES.md) et
  [repositories](SUPABASE_REPOSITORIES.md).
- **Legacy :** certains composants utilisent encore `getSession()` ou des
  accès directs ; ils ne justifient pas de nouveaux accès similaires.

## Coach / client

- **Responsabilité :** invitations, relation coach/client, attribution par
  défaut, calendrier coaching et autorisation des vues croisées.
- **Entrées UI/API :** `app/coach/`, `app/client/`, `app/join/`,
  `app/api/coach/` et les tombstones historiques d'invitation.
- **Modules métier :** `lib/coach-invitations/`, `lib/coach-relations/`,
  `lib/coaching/` et `lib/repositories/coach-client-relations/`.
- **Repositories/ports :** relation active injectée, repository calendrier et
  RPC d'invitation atomique.
- **Données possédées :** `coach_invitations`, `coach_clients`,
  `coach_appointments` et notes coaching.
- **Données seulement lues :** profils liés et projections Training,
  Nutrition, Progression ou Messaging nécessaires aux écrans coach.
- **Dépendances autorisées :** identité serveur, relation active, RLS et read
  models des domaines consultés.
- **Documentation :** [invitation coach](COACH_INVITATION_CONTRACT.md),
  [relations](COACH_CLIENT_RELATION_REPOSITORY.md),
  [calendrier](COACHING_CALENDAR_MODULE.md) et
  [détail client](CLIENT_DETAIL_DOMAIN_EXTRACTIONS.md).
- **Legacy :** les dashboards et hooks volumineux conservent des mutations non
  extraites ; ils restent orchestrateurs et ne possèdent pas les données lues.

## Training

- **Responsabilité :** catalogue d'exercices, prescription des programmes,
  exécution des séances, séries et faits de complétion.
- **Entrées UI/API :** `app/components/training/`, l'onglet Training,
  `app/api/generate-*`, `app/api/adapt-workout/` et `app/api/training-regen/`.
- **Modules métier :** `lib/training/` et
  `lib/repositories/training/`.
- **Repositories/ports :** repositories exercise/program/session, ports de
  persistance des programmes et séances, port IA pour la génération.
- **Données possédées :** `exercises_db`, `custom_exercises`, programmes,
  affectations, `workout_sessions`, `workout_sets`, complétions et planification.
- **Données seulement lues :** profil et équipement du client, relation active
  lors d'une action coach.
- **Dépendances autorisées :** Auth/RLS, repositories Training, port IA et
  média d'exercice.
- **Documentation :** [modèle canonique](TRAINING_CANONICAL_MODEL.md),
  [repositories](TRAINING_REPOSITORIES.md),
  [adaptateurs legacy](TRAINING_LEGACY_ADAPTERS.md) et
  [cycle de séance](TRAINING_WORKOUT_SESSION_LIFECYCLE.md).
- **Legacy :** plusieurs JSON de programme et historiques restent distincts ;
  aucun adaptateur ne doit les fusionner silencieusement. La migration runtime
  canonique est `TRAINING_CANONICAL_MIGRATION_NOT_STARTED` : le modèle et les
  adaptateurs sont prêts, mais aucun producteur ou consommateur canonique,
  double lecture ou chemin de coexistence n'est branché. Les adaptateurs sont
  `FUTURE_MIGRATION_RESERVED` jusqu'à la bascule et à la preuve d'absence de
  trafic legacy ; aucune décision d'abandon n'a été prise.

## Nutrition

- **Responsabilité :** catalogues alimentaires, quantités, journal, recettes,
  plans et snapshots nutritionnels.
- **Entrées UI/API :** hooks et composants Nutrition, `app/nutrition/`,
  `app/api/food-*`, `app/api/generate-meal-plan/` et
  `app/api/generate-recipe/`.
- **Modules métier :** `lib/nutrition/`, `lib/meal-plan/` et
  `lib/repositories/nutrition/`.
- **Repositories/ports :** catalog, journal, plans, recipes et service de
  génération par port IA.
- **Données possédées :** aliments globaux/personnels, recettes, repas
  sauvegardés, journaux, eau, `meal_plans` et `client_meal_plans`.
- **Données seulement lues :** objectifs du profil et relation coach/client
  active pour une affectation.
- **Dépendances autorisées :** Auth/RLS, repositories Nutrition, relation
  active et provider IA abstrait.
- **Documentation :** [modèle canonique](NUTRITION_CANONICAL_MODEL.md),
  [repositories](NUTRITION_REPOSITORIES.md),
  [ADR 0007](adr/0007-nutrition-plan-persistence-contract.md) et
  [enveloppe de plan](NUTRITION_PLAN_ENVELOPE.md).
- **Legacy :** plusieurs journaux et formes JSON coexistent ; les adapters
  nommés préservent leur provenance.

## Progression

- **Responsabilité :** poids, mensurations, records, analyses corporelles,
  agrégations et read models de progression.
- **Entrées UI/API :** onglet Progression, analytics client/coach et routes
  d'analyse de progression.
- **Modules métier :** `lib/progression/` et
  `lib/progression/read-models/`.
- **Repositories/ports :** ports injectés des read models ; les écritures de
  mesure restent bornées à leur propriétaire et à la RLS.
- **Données possédées :** `weight_logs`, `body_measurements`,
  `body_assessments`, `body_analyses`, `progress_photos` et
  `personal_records`.
- **Données seulement lues :** séances/séries Training, journaux Nutrition et
  eau. Progression agrège ces faits sans les réécrire.
- **Dépendances autorisées :** repositories/read models explicites Training et
  Nutrition, fonctions pures d'agrégation et RLS.
- **Documentation :** [autorité des agrégations](PROGRESSION_AGGREGATION_AUTHORITY.md),
  [read models](PROGRESSION_READ_MODELS.md) et
  [catalogue de métriques](PROGRESSION_METRICS_CATALOG.md).
- **Legacy :** `workout_sessions`, `completed_sessions` et
  `scheduled_sessions` restent des faits indépendants.

## Messaging / Realtime

- **Responsabilité :** conversation humaine coach/client, état lu/non lu,
  synchronisation Realtime et pièces jointes de messages.
- **Entrées UI/API :** hooks messages client/coach, vues de conversation et
  `app/api/send-notification/` pour l'effet secondaire Push.
- **Modules métier :** `lib/coaching/messaging/`, `lib/notifications/` et
  l'adaptateur Storage des pièces jointes.
- **Repositories/ports :** repository `messages`, service de messagerie,
  `realtime-port` et adaptateur Supabase Realtime.
- **Données possédées :** `messages` et état de lecture ; le bucket privé
  `message-media` porte les objets joints.
- **Données seulement lues :** relation coach/client active, identité et
  abonnement Push du destinataire.
- **Dépendances autorisées :** Auth/RLS, relation active, Realtime et port de
  notification. Athena et `chat_ai_messages` restent hors de ce domaine.
- **Documentation :** [Messaging/Realtime](COACHING_MESSAGING_REALTIME.md),
  [ADR E2E](adr/0002-local-e2e-boundaries.md) et
  [matrice RLS](RLS_TEST_MATRIX.md).
- **Legacy :** polling et Realtime coexistent ; les trois consommateurs sont
  migrés mais certaines limites de pagination et présence restent ouvertes.

## Billing

- **Responsabilité :** catalogue/prix, checkout, Connect, webhooks,
  subscriptions, payments, droits produit et réconciliation diagnostique.
- **Entrées UI/API :** surfaces de paiement et `app/api/stripe/`.
- **Modules métier :** `lib/billing/` et `lib/stripe/`.
- **Repositories/ports :** repositories checkout/webhook/reconciliation et
  ports Stripe injectés.
- **Données possédées :** `payments`, `stripe_webhook_events`, références et
  projections financières de profil. Stripe reste l'autorité externe de ses
  Customers, Accounts, Subscriptions et Invoices.
- **Données seulement lues :** identité MoovX, relation coach/client active et
  produit demandé.
- **Dépendances autorisées :** session serveur, repositories Billing, relation
  active, SDK Stripe derrière un port et événements signés.
- **Documentation :** [ADR 0005](adr/0005-billing-domain-model.md),
  [modèle Billing](BILLING_DOMAIN_MODEL.md),
  [cycle de vie](BILLING_SUBSCRIPTION_LIFECYCLE.md) et
  [réconciliation](BILLING_RECONCILIATION.md).
- **Legacy :** certains droits restent projetés dans `profiles`; les champs
  historiques ne deviennent pas une autorité par leur seule présence.

## IA

- **Responsabilité :** interface provider, prompts, modèles, parsing,
  résilience, quotas, usage et chat Athena.
- **Entrées UI/API :** routes `app/api/chat-ai/`, `generate-*`, `analyze-*`,
  `suggest-*`, diagnostic et quota.
- **Modules métier :** `lib/ai/` et adaptateurs provider sous
  `lib/ai/providers/`.
- **Repositories/ports :** `AiProvider`, registre modèles/coûts et port
  Supabase d'usage.
- **Données possédées :** `ai_usage_logs`, `chat_ai_messages` et métadonnées
  bornées de consommation. Les résultats Training/Nutrition/Progression sont
  possédés par le domaine qui les valide et les persiste.
- **Données seulement lues :** contexte utilisateur strictement nécessaire,
  quotas et données métier fournies par le cas d'usage.
- **Dépendances autorisées :** providers via interface, schémas de sortie,
  politique de fallback et repository d'usage.
- **Documentation :** [interface provider](AI_PROVIDER_INTERFACE.md),
  [frontières des prompts](AI_PROMPT_BOUNDARIES.md),
  [résilience](AI_RESILIENCE_POLICY.md) et [quotas](AI_USAGE_QUOTAS.md).
- **Legacy :** `lib/anthropic/` et certaines routes conservent des adaptateurs
  de transition ; aucune nouvelle intégration ne doit contourner `AiProvider`.

## Médias / Storage

- **Responsabilité :** classification public/privé, chemins, livraison,
  cache, URLs signées et cycle de vie des objets.
- **Entrées UI/API :** uploads avatar/progression/message/feedback, composants
  média et routes admin Seedance.
- **Modules métier :** `lib/media/`, `lib/seedance/` et adaptateurs Storage
  côté serveur ou hooks bornés.
- **Repositories/ports :** policy/résolveur de livraison, Storage Supabase et
  CDN public `media.moovx.ch`.
- **Données possédées :** politique de livraison et objets des buckets
  `avatars`, `progress-photos`, `message-media`, `exercise-videos` ainsi que les
  références temporaires Seedance. Les métadonnées métier restent au domaine
  qui les référence.
- **Données seulement lues :** owner/relation, chemins d'exercice, jobs
  Seedance et métadonnées nécessaires au cleanup.
- **Dépendances autorisées :** contrôle serveur, Storage, URLs signées privées
  et CDN public allowlisté.
- **Documentation :** [ADR 0006](adr/0006-media-storage-cdn.md),
  [étude CDN](MEDIA_STORAGE_CDN_STUDY.md) et
  [runbook média](MEDIA_STORAGE_CDN_RUNBOOK.md).
- **Legacy :** le feedback vidéo utilise encore une URL publique
  `exercise-videos`; cette dette ne doit pas être étendue aux médias privés.

## Infrastructure partagée

- **Responsabilité :** contrats API, factories Supabase, sécurité,
  observabilité, cache, types et mécanismes de test/préproduction.
- **Entrées UI/API :** aucune surface métier propre ; ces modules sont appelés
  par les adaptateurs et domaines.
- **Modules métier :** `lib/api/`, `lib/supabase/`, `lib/security/`,
  `lib/repositories/`, `lib/performance/`, `scripts/` et `tests/fixtures/`.
- **Repositories/ports :** types/factories partagés et résultat repository ;
  aucun repository métier générique ne doit absorber les invariants d'un domaine.
- **Données possédées :** aucune donnée métier. Les logs techniques, contrats
  de cache et artefacts de test restent bornés et expurgés.
- **Données seulement lues :** configuration locale explicite, schéma généré et
  métadonnées techniques nécessaires aux garde-fous.
- **Dépendances autorisées :** bibliothèques techniques sans dépendance vers
  une UI métier. Les domaines peuvent dépendre de ces contrats partagés.
- **Documentation :** [ADR 0003](adr/0003-supabase-access-boundaries.md),
  [ADR 0004](adr/0004-api-route-contracts.md),
  [stratégie de tests](TESTING_STRATEGY.md) et
  [guide de contribution](CONTRIBUTING.md).
- **Legacy :** les utilitaires métier encore à la racine de `lib/` doivent être
  attribués à un domaine avant extension ou déplacement.

## Dépendances transverses autorisées

- Progression lit Training et Nutrition par ports/read models ; le sens inverse
  n'est pas nécessaire pour calculer leurs faits.
- Coaching compose Auth, relations, Training, Nutrition, Progression et
  Messaging pour les écrans coach/client sans posséder leurs tables.
- Les dashboards composent des résultats déjà autorisés ; ils ne créent ni
  règle d'accès, ni formule métier concurrente.
- IA génère une proposition ; le domaine consommateur valide, adapte et
  persiste le résultat.
- Billing consulte identité et relation, mais ne crée jamais une relation
  coach/client.
- Médias contrôle la livraison de l'objet ; le domaine appelant conserve
  l'ownership de la référence métier.

Toute nouvelle dépendance inverse ou cyclique exige un port explicite, un test
de frontière et, si elle engage durablement plusieurs domaines, un ADR.

## Exemples de placement

### Nouvelle logique Auth

La page ou route reste sous `app/` ou `app/api/<surface-auth>/route.ts`. Le cas
d'usage vit sous `lib/auth/` ou `lib/profile/` plutôt que dans un composant ou
un nouveau fichier racine ; l'accès passe par
`lib/repositories/identity/` ou `lib/repositories/profile/`. L'identité provient
de la factory serveur et la route mappe seulement HTTP. Un client admin
éventuel n'est créé qu'après authentification et autorisation explicites.

### Nouvelle fonctionnalité Training

Le modèle et les invariants vivent dans `lib/training/`; les projections ou
mutations Supabase dans un repository/port Training ; l'UI dans `app/`.
Training possède programmes et exécutions. Progression peut en lire les faits
via un read model, sans déplacer le calcul Training dans le dashboard.

### Changement Billing

L'autorité métier vit dans `lib/billing/`; la route Stripe reste un adaptateur
HTTP et Stripe passe par un port. Identité, relation active, signature et
idempotence sont vérifiées avant toute projection locale.

### Dashboard coach multi-domaines

Le dashboard compose des projections Training, Nutrition et Progression déjà
autorisées. Il peut organiser chargement et présentation, mais ne possède ni
leurs tables, ni leurs calculs, ni leurs règles RLS.
