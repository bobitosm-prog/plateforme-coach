# Modèle métier Billing — MoovX

> Statut : contrat métier accepté pour guider la Phase 6. Ce document décrit l'état observé et la cible ; il ne crée ni table, ni migration, ni nouveau comportement.

## 1. Périmètre et vocabulaire

Billing transforme un contrat commercial vérifié en droits produit explicites. Le domaine sépare quatre faits qui sont encore partiellement confondus dans `profiles` :

1. une offre et son prix ;
2. un abonnement ou un paiement ;
3. un droit d'accès produit (`entitlement`) ;
4. une relation coach/client, qui relève du domaine Coaching.

Stripe est le fournisseur de paiement et la source externe des objets Stripe. MoovX reste l'autorité des identités internes, des relations et des droits produit.

## 2. Acteurs

| Acteur | Responsabilité | N'est jamais autorisé à |
|---|---|---|
| Client | Achète une offre plateforme ou l'accompagnement de son coach actif | choisir l'identité bénéficiaire ou le compte Connect destinataire |
| Coach | Achète MoovX Coach Pro et peut recevoir le prix d'un accompagnement via Connect | créer une relation client, muter un paiement ou accorder un droit depuis le navigateur |
| Plateforme MoovX | Définit les offres, contrôle les identités, prélève sa commission et projette les droits | considérer le cache ou les metadata non vérifiées comme une autorité |
| Stripe Customer | Identité de facturation externe d'un utilisateur MoovX | remplacer `profiles.id` comme identité métier |
| Stripe Account Connect | Compte externe du coach destinataire des transferts | prouver à lui seul qu'un coach est autorisé ou qu'une relation est active |
| Abonnement plateforme | Contrat récurrent client autonome ou Coach Pro entre l'utilisateur et MoovX | représenter l'abonnement d'accompagnement d'un client auprès d'un coach |
| Abonnement coach | Contrat récurrent entre un client et un coach actif, traité via MoovX/Connect | créer ou réactiver la relation coach/client |
| Paiement ponctuel | Règlement sans renouvellement, actuellement utilisé par l'offre client lifetime | être interprété directement comme un abonnement récurrent |

Un futur paiement ponctuel distinct du lifetime devra déclarer son usage et son droit éventuel ; l'existence d'une ligne payée ne suffit pas à l'inférer.

## 3. Objets métier

### Plan

Offre commerciale stable, indépendante de Stripe : audience, produit accordé, cadence et règles d'éligibilité. Les identifiants courants sont `client_monthly`, `client_yearly`, `client_lifetime` et `coach_monthly`. Le nom `coach_monthly` est actuellement ambigu : il désigne à la fois Coach Pro dans le checkout plateforme et l'accompagnement mensuel dans les metadata du checkout coach.

### Prix

Version monétaire d'un plan : montant, devise, périodicité, dates d'effet et référence Stripe Price. Un prix dynamique d'accompagnement est dérivé du `coach_monthly_rate` contrôlé côté serveur. Modifier un prix ne réécrit pas l'historique des paiements.

### Checkout session

Intention de démarrer un paiement ou un abonnement. Elle contient une identité bénéficiaire dérivée de la session serveur, un plan validé, un prix, une destination éventuelle et une clé d'idempotence. Une session créée n'est ni une preuve de paiement ni un droit actif.

### Subscription

Contrat récurrent identifié par son fournisseur, son bénéficiaire, son plan, sa période de service et son état. Deux catégories ne se remplacent pas :

- `platform` : client autonome ou Coach Pro ;
- `coach_service` : accompagnement du client par un coach déterminé.

### Invoice et payment

L'invoice constate une somme due pour une période ou une opération Stripe. Le payment est l'écriture financière immuable ou append-only qui constate tentative, succès, échec ou remboursement. La table `payments` actuelle constitue un journal legacy partiel, pas encore un agrégat Billing complet.

### Entitlement

Droit produit explicite, issu d'une autorité vérifiée : abonnement actif, période d'essai, campagne beta, invitation ou achat lifetime. Il possède un type, un bénéficiaire, une source, une période et un état. Il ne se déduit pas d'un cache ni de la seule présence d'un paiement.

Exemples cibles : accès client autonome, accès Coach Pro, accès client invité et accès à l'accompagnement d'un coach précis.

### Commission plateforme

Part conservée par MoovX sur une transaction coach. Le checkout coach configure actuellement `application_fee_percent: 3`; la table `commissions` existe mais aucun producteur applicatif trouvé ne matérialise ce calcul. La commission doit à terme référencer le paiement, le coach, la règle appliquée et son état de règlement.

### Relation coach/client

Autorité du domaine Coaching. Billing la consulte et exige `status = active` pour un contrat coach/client ; Billing ne la crée, ne l'active et ne la répare jamais à partir d'un paiement.

### Événement Stripe

Message fournisseur signé, identifié par `event.id`, réservable une seule fois à la fois et rejouable après échec. `stripe_webhook_events` conserve actuellement le payload et les états de traitement.

### Période de service

Intervalle `[starts_at, ends_at)` pendant lequel un abonnement ou entitlement peut produire un droit. Elle doit venir des périodes Stripe vérifiées lorsque disponibles, et non d'une approximation locale de 30 ou 365 jours.

### Statut de paiement

État financier distinct de l'état d'abonnement et de l'accès produit. Les valeurs legacy observées incluent `pending`, `paid`, ainsi que `refunded` dans l'interface. La cible définit explicitement les transitions ci-dessous avant de les contraindre en base.

## 4. Invariants

1. L'utilisateur authentifié et le bénéficiaire sont dérivés côté serveur ; `clientId`, `coachId`, compte Connect ou prix fournis par le navigateur ne font pas autorité.
2. Un droit d'abonnement ou d'accès n'est jamais accordé depuis le cache. Le cache peut accélérer une présentation, pas une décision d'autorisation.
3. `service_role` reste côté serveur, après authentification et contrôle métier lorsqu'un flux agit pour un utilisateur. Webhooks et tâches système sont des contextes privilégiés bornés.
4. Un événement webhook valide est signé, réclamé atomiquement, finalisé avec un état stable et rejouable après `failed` ou abandon de `processing`.
5. Le rejeu d'un même `event.id` ne crée ni double paiement, ni double entitlement, ni double commission.
6. Un paiement, même `paid`, ne crée jamais une relation coach/client et ne transforme pas une relation inactive en relation active.
7. Les droits métier proviennent d'entitlements ou d'abonnements vérifiés, jamais de la seule ligne `payments` ni de metadata non recoupées.
8. Tout checkout, webhook ou droit coach/client exige une relation active entre le client et le coach concernés.
9. Un abonnement plateforme et un abonnement coach sont deux contrats indépendants ; annuler l'un ne doit pas annuler implicitement l'autre.
10. Les transitions de paiement, abonnement, entitlement et événement webhook sont séparées et auditables.
11. Les résultats webhook `processing`, `success`, `failed` et `skipped` restent compatibles pendant la migration.
12. Une mutation financière utilisateur est interdite par RLS ; les lectures client et coach actif restent limitées à leur périmètre.

## 5. Machines d'état

Ces états sont le vocabulaire cible. Ils ne prétendent pas être tous implémentés dans le schéma actuel.

### Abonnement plateforme

```text
none → pending → active ↔ past_due
                   │         │
                   ├→ cancel_scheduled → canceled → expired
                   └→ canceled
```

`lifetime` n'est pas un état d'abonnement récurrent : c'est un paiement ponctuel réussi produisant un entitlement sans échéance. `trial`, `beta` et `invited` sont des sources d'accès, pas des plans Stripe.

### Abonnement coach

```text
none → pending → active ↔ past_due → canceled/expired
```

Toute transition vers `active` recoupe la relation active et les identités client/coach. Si la relation devient inactive, l'entitlement coach est suspendu ou révoqué selon une politique à préciser ; le contrat financier doit être réconcilié explicitement, pas silencieusement supprimé.

### Paiement

```text
pending → paid → partially_refunded → refunded
    ├────→ failed
    └────→ canceled
```

Une nouvelle tentative est une nouvelle occurrence ou un nouvel identifiant fournisseur, pas un retour arbitraire de `failed` vers `paid` sur une écriture ambiguë.

### Entitlement

```text
pending → active → suspended → active
             ├────→ expired
             └────→ revoked
```

La source et la période déterminent les transitions. La révocation administrative doit être auditée et ne falsifie pas l'historique financier.

### Événement webhook

```text
absent → processing → success
                    ├→ skipped
                    └→ failed → processing (rejeu)
```

Un `processing` abandonné peut être repris après le délai prévu par la fonction de claim. `success` et `skipped` sont terminaux pour le même `event.id`.

### Annulation et remboursement

L'annulation arrête ou programme l'arrêt d'un abonnement ; le remboursement inverse tout ou partie d'un paiement. Ces commandes sont distinctes. Les écrans reconnaissent déjà `refunded`, mais aucun handler de remboursement Stripe n'a été trouvé dans le webhook actuel. La politique d'impact sur les entitlements reste donc une dette à implémenter et tester.

## 6. Frontières actuelles

### Checkout plateforme

`POST /api/stripe/checkout` authentifie côté serveur, valide le rôle et un plan fermé, crée une session Stripe puis tente d'insérer un paiement `pending`. Il couvre abonnements client, lifetime ponctuel et Coach Pro. Les Price IDs viennent de variables d'environnement.

### Checkout coach

`POST /api/stripe/coach-checkout` dérive le client de la session et le coach d'une relation active, contrôle le rôle et le compte Connect, crée ou réutilise un Stripe Customer, puis crée un abonnement avec transfert au coach et commission de 3 %. Aucun paiement local n'est créé avant le webhook.

### Webhook Stripe

`POST /api/stripe/webhook` vérifie la signature, réclame l'événement via RPC, relit plusieurs objets Stripe et traite actuellement :

- `checkout.session.completed` ;
- `customer.subscription.updated` ;
- `invoice.payment_succeeded` ;
- `customer.subscription.deleted` ;
- `account.updated`.

Il met à jour `profiles`, `payments` puis l'état de l'événement. Les écritures successives ne forment pas une transaction PostgreSQL unique.

### Setup produits

`POST /api/stripe/setup-products` utilise le contrat admin serveur et crée deux produits et quatre prix. Les appels répétés créent de nouveaux objets ; ce comportement non idempotent est caractérisé par un test.

### Lecture dashboard

Le client lit son historique dans `payments`. Le coach actif lit les paiements liés et des agrégations de revenus. L'administration combine les profils, le ledger local et des agrégations Stripe. Ces projections ne constituent pas encore un read model Billing unifié.

### RLS

`payments` est en lecture seule pour les utilisateurs authentifiés : client propriétaire ou coach activement lié. Les mutations sont serveur. `commissions` est lisible par le coach propriétaire et muté uniquement dans un contexte privilégié.

### Repositories futurs

Les repositories actuels normalisent les champs d'abonnement de `profiles`, mais il n'existe pas encore de repositories Billing dédiés aux plans, subscriptions, payments, entitlements, commissions ou événements.

### E2E et faux Stripe local

Les deux parcours checkout exercent Next.js, Supabase local et la véritable frontière HTTP du SDK vers un faux Stripe local. Ils vérifient identité serveur, relation active, metadata, Connect, absence de mutation avant échec et refus d'URL distante. Ils ne simulent pas tout le cycle webhook, les renouvellements, remboursements, événements désordonnés ni la sémantique complète de Stripe.

## 7. Écarts et risques actuels

### Divergence du schéma généré

Les types générés depuis le schéma local décrivent `payments` avec `id`, `client_id`, `coach_id`, `amount`, `currency`, `status`, `stripe_id`, `stripe_event_id` et `created_at`. Les routes et lecteurs utilisent aussi `description`, `stripe_checkout_session_id` et `paid_at`, absents des types générés et des migrations canoniques trouvées.

De même, le code Stripe ou admin utilise `profiles.stripe_onboarding_complete`, `coach_subscription_active` et `subscription_price`, absents des types générés. Le trigger sensible protège certaines clés optionnelles pour compatibilité avec d'anciennes bases, mais cela ne versionne pas ces colonnes. Cet écart doit être résolu par inventaire des environnements et migration additive, jamais par supposition.

### Transactions et idempotence incomplètes

- Checkout plateforme : Stripe est créé avant l'écriture locale ; l'insertion n'est pas vérifiée explicitement et aucune transaction distribuée ne relie les deux opérations.
- Checkout coach : création Customer, mise à jour profil et session sont trois opérations séparées.
- Webhook : profil, paiement et finalisation de l'événement sont des mutations successives ; un échec partiel peut laisser un état à réconcilier.
- Les clés d'idempotence checkout contiennent `Date.now()`, donc deux demandes rapprochées d'un même utilisateur ne partagent pas une clé métier stable.
- `stripe_event_id` protège certains upserts, mais pas toutes les mutations ni les commandes initiées avant webhook.

### Absence d'entitlements explicites

`subscription_type`, `subscription_status`, `subscription_end_date` et `trial_ends_at` portent aujourd'hui à la fois contrat commercial et accès. Les valeurs `invited`, `beta`, `lifetime` et `coach_paid` montrent ce mélange. Un abonnement coach peut ainsi remplacer la projection plateforme du même profil.

### Historique financier incomplet

`payments` mélange intention de checkout, paiement réussi et renouvellement. Les références invoice, payment intent, charge, subscription, période, montant remboursé et granularité des tentatives ne sont pas toutes présentes. `commissions` n'est reliée ni à un paiement ni à une règle de commission et aucun producteur courant n'a été trouvé.

### Autres lacunes

- `setup-products` n'est pas idempotent et la correspondance plan/prix dépend de variables d'environnement.
- Aucune réconciliation périodique Stripe/base ne détecte les sessions orphelines, abonnements divergents ou webhooks manquants.
- Le webhook ne gère pas actuellement `invoice.payment_failed`, remboursement/chargeback ni ordre complet des événements.
- Les dates de service sont approximées par `Date.now() + 30/365 jours` au lieu d'utiliser systématiquement les périodes Stripe.
- Le statut de subscription est mis à jour par `stripe_customer_id`, ce qui ne distingue pas deux abonnements simultanés du même customer.
- Les faux serveurs locaux ne certifient pas Connect, taxes, factures, prorations, remboursements ou comportement réel du réseau Stripe.

## 8. Modèle cible proposé

Les noms suivants sont des concepts à évaluer pendant les migrations suivantes, pas des tables approuvées par ce document :

| Concept futur | Rôle | Transition legacy |
|---|---|---|
| `billing_plans` | Catalogue stable des offres et capacités | refléter d'abord les quatre plans codés en dur |
| `billing_prices` | Versions de prix et références Stripe | importer les Price IDs configurés, sans réécrire l'historique |
| `billing_customers` | Mapping utilisateur ↔ Stripe Customer | coexister avec `profiles.stripe_customer_id` |
| `billing_subscriptions` | Contrats plateforme et coach séparés | double lecture puis backfill depuis profils/Stripe |
| `billing_payments` ou `payments` étendue | Ledger financier versionné | conserver les IDs et lignes historiques |
| `billing_entitlements` | Droits produit explicites et sourcés | calcul parallèle avec les règles legacy avant bascule |
| `billing_commissions` | Commission reliée au paiement et au coach | rapprocher la table `commissions` existante |
| `billing_webhook_events` | État de réception et traitement | faire évoluer `stripe_webhook_events` sans perdre les claims |

### Services futurs

- `PlanCatalogService` : résout plan et prix autorisés ;
- `CheckoutService` : valide la commande et crée une intention idempotente ;
- `ConnectService` : contrôle le compte coach et les destinations ;
- `WebhookService` : vérifie, claim et délègue à des handlers métier ;
- `SubscriptionService` : applique les transitions par identifiant d'abonnement ;
- `PaymentLedgerService` : enregistre tentatives, paiements et remboursements ;
- `EntitlementService` : projette, suspend et révoque les droits ;
- `CommissionService` : calcule et rapproche la commission ;
- `ReconciliationService` : compare Stripe, ledger, subscriptions et entitlements.

### Commandes et événements

Commandes candidates :

- `StartPlatformCheckout` ;
- `StartCoachCheckout` ;
- `CancelSubscription` ;
- `RefundPayment` ;
- `ReconcileBillingAccount`.

Événements métier candidats :

- `CheckoutCompleted` ;
- `SubscriptionActivated`, `SubscriptionPastDue`, `SubscriptionCanceled` ;
- `InvoicePaid`, `PaymentFailed`, `PaymentRefunded` ;
- `EntitlementGranted`, `EntitlementSuspended`, `EntitlementRevoked` ;
- `CommissionRecorded` ;
- `BillingDivergenceDetected`.

Un événement Stripe reçu n'est pas automatiquement un événement métier : il doit être validé, recoupé et traduit.

## 9. Migration progressive

1. **Observer** : figer l'inventaire des schémas locaux/distants et caractériser toutes les valeurs/status existants.
2. **Expand** : ajouter des structures et contraintes rétrocompatibles sans retirer les champs `profiles` ni les colonnes historiques.
3. **Backfill** : importer les références Stripe et classifier les lignes ambiguës avec un rapport d'écarts ; ne rien deviner silencieusement.
4. **Calcul parallèle** : produire subscriptions et entitlements cibles sans modifier les décisions d'accès legacy.
5. **Comparer** : journaliser les divergences sans données sensibles et corriger les règles ou données.
6. **Bascule ciblée** : migrer un consommateur ou handler à la fois derrière un mécanisme de rollback applicatif.
7. **Réconcilier** : valider l'absence de divergence Stripe/base en préproduction.
8. **Contract** : retirer champs et adaptateurs legacy seulement après une release de coexistence et preuve d'absence d'usage.

Pendant la transition, `profiles.subscription_*`, `payments` et `commissions` restent lisibles par leurs consommateurs existants. Les nouvelles écritures doivent être idempotentes et, si un double write temporaire est nécessaire, posséder une autorité unique et un test de cohérence.

## 10. Critères pour les prochaines tranches

La prochaine tranche doit séparer conceptuellement puis techniquement paiement, abonnement et accès produit, sans encore extraire simultanément tous les handlers Stripe. Avant toute migration :

- inventorier les valeurs réelles de statuts et types ;
- résoudre ou isoler les colonnes absentes du schéma canonique ;
- définir les identifiants et clés d'idempotence stables ;
- écrire les tests de caractérisation des projections legacy ;
- prévoir rollback et comparaison ancien/nouveau.

## Références

- [ADR 0005 — Modèle métier Billing](adr/0005-billing-domain-model.md)
- [Baseline de sécurité Phase 1](adr/0001-phase-1-security-baseline.md)
- [Frontières E2E locales](adr/0002-local-e2e-boundaries.md)
- [Frontières Supabase](adr/0003-supabase-access-boundaries.md)
- [Matrice RLS](RLS_TEST_MATRIX.md)
- [Repositories Supabase](SUPABASE_REPOSITORIES.md)
- [Types Supabase](SUPABASE_TYPES.md)
- [Rollback Phase 1](PHASE_1_ROLLBACK.md)
