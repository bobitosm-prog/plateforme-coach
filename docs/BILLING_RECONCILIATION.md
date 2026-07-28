# Réconciliation Stripe/base — audit read-only

## Statut

Service read-only disponible depuis le 17 juillet 2026. Il complète le
[modèle Billing](BILLING_DOMAIN_MODEL.md), les
[contrats Stripe](BILLING_STRIPE_CONTRACTS.md) et les
[handlers webhook](BILLING_WEBHOOK_HANDLERS.md).

## Objectif et frontière

[`lib/billing/reconciliation`](../lib/billing/reconciliation) compare un snapshot local borné à des autorités Stripe relues via un port injectable. Le rapport est uniquement diagnostique :

- le repository n'expose que `readSnapshot` ;
- le port Stripe n'expose que des opérations `retrieve*` et `list*` ;
- aucune route publique ou admin n'est ajoutée ;
- aucune écriture, réparation, replay ou suppression n'est exécutée ;
- aucune migration n'est requise.

Une future commande serveur devra vérifier explicitement une cible staging,
refuser Stripe live et créer ses clients après validation de l'environnement.
Le service ne doit jamais être importé dans une interface navigateur. Aucune
route publique n'est requise pour archiver une preuve opérateur expurgée.

## Écarts détectés

| Source | Détection actuelle | Recommandation |
|---|---|---|
| Webhook | `failed` ancien ou lease `processing` dépassant le seuil | Rejouer explicitement l'événement après diagnostic. |
| Paiement | Paiement `paid` sans `stripe_event_id`, payment `pending` déjà couvert par un checkout réussi, doublon d'event ID, événement de paiement réussi sans paiement local | Inspecter l'autorité Stripe et la mutation locale. |
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
  scope: RC1_PHASE6_RECONCILIATION_SCOPE,
})
```

Cet exemple suppose que `adminSupabase` a été créé après un contrôle admin effectif. Il ne constitue pas une autorisation d'ajouter une route publique.

## Contrat RC1 Phase 6

Le scope `RC1_PHASE6_RECONCILIATION_SCOPE` est explicite et ne modifie pas le
comportement de l'audit générique :

- `76000000-*` est la cohorte Auth historique gelée. Ses profils et payments
  sont comptés dans `quarantinedExcludedCount`; ses événements et autorités
  Stripe corrélées sont comptés dans `historicalExcludedCount`.
- Seul l'événement synthétique signé et vérifié sans mutation métier
  `evt_rc1_platform_checkout_1785178456533` est autorisé dans l'inventaire
  `syntheticEventIds`. Un nouvel événement v2, même avec un nom ressemblant à
  une fixture, n'est jamais exclu.
- Une Checkout Session Stripe sans metadata MoovX et sans client courant est
  une fixture fournisseur et incrémente `syntheticExcludedCount`. Une session
  portant un client `76100000-*` mais un contrat invalide reste auditée.
- Une invoice `subscription_create` ne requiert pas un second payment si un
  événement `checkout.session.completed` réussi de la même subscription
  possède déjà un payment `paid`. Elle incrémente
  `ignoredInitialInvoiceCount`.
- Une invoice `subscription_cycle` reste productrice d'un payment distinct.
- Un payment `pending` sans événement checkout réussi local n'exige pas encore
  de `stripe_event_id` et incrémente `pendingNotFinalizedCount`. Une transition
  future vers `failed` ou `expired` reste souhaitable pour les créations Stripe
  interrompues.
- Un payment `paid` sans event et un payment `pending` dont le checkout réussi
  est déjà claimé restent des divergences.

Les cinq compteurs sont des volumes observables d'objets/règles, pas des issues
actives. Les catégories peuvent décrire des étapes différentes d'un même
scénario historique; elles ne doivent donc pas être additionnées pour
reconstruire un nombre d'incidents.

## Ce que l'audit ne répare pas

- Il ne modifie pas un profil, paiement ou événement webhook.
- Il ne relance pas un webhook et ne crée pas de paiement manquant.
- Il ne choisit pas automatiquement entre Stripe et la base lorsqu'ils divergent.
- Il ne garantit pas un historique exhaustif au-delà de la fenêtre bornée.
- Il ne remplace pas une future transaction ou procédure de réparation idempotente.
- Il ne détecte pas encore les refunds, disputes ou invoices non supportés par le modèle actuel.

## Tests

`npx vitest run tests/unit/billing-reconciliation.test.ts` couvre l'absence d'écart, chaque famille d'écarts, les pannes partielles, l'expurgation, les bornes et l'absence de mutation ou route publique.
