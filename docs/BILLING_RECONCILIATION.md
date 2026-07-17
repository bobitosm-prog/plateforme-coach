# Réconciliation Stripe/base — audit initial

## Statut

Premier service read-only disponible depuis le 17 juillet 2026. Il complète le [modèle Billing](BILLING_DOMAIN_MODEL.md), les [contrats Stripe](BILLING_STRIPE_CONTRACTS.md) et les [handlers webhook](BILLING_WEBHOOK_HANDLERS.md).

## Objectif et frontière

[`lib/billing/reconciliation`](../lib/billing/reconciliation) compare un snapshot local borné à des autorités Stripe relues via un port injectable. Le rapport est uniquement diagnostique :

- le repository n'expose que `readSnapshot` ;
- le port Stripe n'expose que des opérations `retrieve*` et `list*` ;
- aucune route publique ou admin n'est ajoutée ;
- aucune écriture, réparation, replay ou suppression n'est exécutée ;
- aucune migration n'est requise.

Une future commande admin devra authentifier l'administrateur avant de créer le client service-role et le client Stripe. Le service ne doit jamais être importé dans une interface navigateur.

## Écarts détectés

| Source | Détection actuelle | Recommandation |
|---|---|---|
| Webhook | `failed` ancien ou lease `processing` dépassant le seuil | Rejouer explicitement l'événement après diagnostic. |
| Paiement | Paiement sans `stripe_event_id`, doublon d'event ID, événement de paiement réussi sans paiement local | Inspecter l'autorité Stripe et la mutation locale. |
| Profil/customer | Subscription locale sans customer, customer Stripe supprimé ou absent | Vérifier le customer avant toute correction. |
| Subscription | Statut local divergent ou inconnu, subscription absente, customer de subscription différent du profil | Vérifier la subscription et ses autorités. |
| Checkout | Checkout Stripe terminé sans claim webhook local | Retrouver puis rejouer l'événement signé via un flux contrôlé. |
| Connect | Compte absent ou charges, payouts ou détails incomplets | Reprendre l'onboarding Connect. |
| Fournisseur | Lecture Stripe indisponible | Marquer le rapport partiel et relancer l'audit. |

## Rapport et confidentialité

Le rapport expose des types explicites : `ReconciliationIssue`, `ReconciliationSeverity`, `ReconciliationSource`, `ReconciliationRecommendation` et `ReconciliationReport`.

- Les références d'entités sont des empreintes SHA-256 tronquées et non les IDs locaux ou Stripe.
- Les messages sont fixes ; aucune erreur fournisseur, clé, signature, payload, e-mail, token ou URL n'est propagé.
- Les statuts inconnus sont remplacés par `unknown` et signalés.
- Le snapshot est limité à 100 lignes par collection par défaut, 500 au maximum.
- Le rapport contient au plus 200 écarts par défaut, 500 au maximum, puis `truncated: true`.
- Une indisponibilité Stripe produit `partial: true` sans arrêter les autres comparaisons.

## Utilisation serveur future

Le service reçoit explicitement :

```ts
await reconcileBillingAudit({
  repository: createBillingReconciliationRepository(adminSupabase),
  stripe: createBillingReconciliationStripePort(stripe),
})
```

Cet exemple suppose que `adminSupabase` a été créé après un contrôle admin effectif. Il ne constitue pas une autorisation d'ajouter une route publique.

## Ce que l'audit ne répare pas

- Il ne modifie pas un profil, paiement ou événement webhook.
- Il ne relance pas un webhook et ne crée pas de paiement manquant.
- Il ne choisit pas automatiquement entre Stripe et la base lorsqu'ils divergent.
- Il ne garantit pas un historique exhaustif au-delà de la fenêtre bornée.
- Il ne remplace pas une future transaction ou procédure de réparation idempotente.
- Il ne détecte pas encore les refunds, disputes ou invoices non supportés par le modèle actuel.

## Tests

`npx vitest run tests/unit/billing-reconciliation.test.ts` couvre l'absence d'écart, chaque famille d'écarts, les pannes partielles, l'expurgation, les bornes et l'absence de mutation ou route publique.
