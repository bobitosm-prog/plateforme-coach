# ADR 0005 — Séparer contrat financier et accès produit dans Billing

- Statut : accepted
- Date : 2026-07-17

## Contexte

Le Billing courant projette abonnement, essai, invitation, lifetime et accompagnement coach dans quelques colonnes de `profiles`. La table `payments` conserve une partie de l'historique financier, tandis que Stripe porte les subscriptions et invoices. Cette superposition rend ambiguës l'autorité, les transitions et la coexistence d'un abonnement plateforme avec un abonnement coach.

## Décision

Le modèle Billing distingue désormais, au niveau du contrat métier :

1. catalogue `plan/prix` ;
2. checkout comme intention ;
3. subscription comme contrat récurrent, classé `platform` ou `coach_service` ;
4. payment/invoice comme faits financiers ;
5. entitlement comme droit produit explicite ;
6. relation coach/client comme autorité externe consultée, jamais créée par Billing ;
7. événement Stripe comme entrée fournisseur idempotente traduite en événement métier.

Une ligne de paiement ne suffit jamais à accorder un accès. Un abonnement coach ne remplace pas un abonnement plateforme. Les droits sont projetés depuis des sources vérifiées, avec une période et un état propres.

La mise en œuvre suivra une migration progressive expand/backfill/calcul parallèle/comparaison/bascule/contract. Les champs `profiles.subscription_*` et les tables financières existantes restent compatibles jusqu'à migration explicite de leurs consommateurs.

## Conséquences

- Les futures tables et services Billing devront rendre ces frontières explicites sans migration big bang.
- Les handlers webhook évolueront vers des commandes idempotentes par agrégat et par identifiant Stripe.
- Les accès produit ne pourront plus dépendre d'un cache ou d'un statut financier isolé.
- Une relation active sera recoupée pour toute activation coach/client, y compris au rejeu d'un webhook.
- Les remboursements, annulations et périodes de service auront des transitions distinctes.

## Limites et dette restante

- Cet ADR n'ajoute aucun schéma, service ou handler ; le modèle cible reste à implémenter par tranches.
- Les colonnes runtime divergentes de `payments` et `profiles` doivent être auditées avant une migration.
- Les statuts historiques ne sont pas encore normalisés et les entitlements n'existent pas encore comme objets persistés.
- La réconciliation Stripe/base, les remboursements et les événements désordonnés restent à construire.

## Références

- [Modèle métier Billing](../BILLING_DOMAIN_MODEL.md)
- [Baseline de sécurité Phase 1](0001-phase-1-security-baseline.md)
- [Frontières d'accès Supabase](0003-supabase-access-boundaries.md)
- [Contrats des routes API](0004-api-route-contracts.md)
- [Rollback Phase 1](../PHASE_1_ROLLBACK.md)
