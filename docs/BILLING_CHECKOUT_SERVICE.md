# Service Billing Checkout

## Périmètre

Le module `lib/billing/checkout` porte la logique commune des deux frontières HTTP existantes :

- `POST /api/stripe/checkout` pour les offres plateforme ;
- `POST /api/stripe/coach-checkout` pour l'abonnement de coaching.

Les routes conservent le parsing HTTP, l'authentification serveur, les adaptateurs Supabase et le mapping des réponses legacy. Le service ne lit ni cookies, ni variables d'identité fournies par le navigateur.

## Contrat de sécurité

- L'identité client provient exclusivement de la session Supabase vérifiée par la route.
- Les corps refusent toute clé autre que `planId` pour le checkout plateforme et toute clé pour le checkout coach. Une injection de `clientId`, `coachId` ou compte Connect est donc rejetée avant Stripe.
- Le checkout coach exige un profil client, une relation active résolue de manière unique et un compte Connect relu côté serveur.
- Le prix plateforme provient d'un catalogue fermé et des variables serveur existantes ; le tarif coach provient du profil coach relu côté serveur.
- Le paiement plateforme `pending` est créé avant Stripe. Son identifiant
  porte la clé `checkout-payment-{paymentId}`; après succès, la Checkout
  Session est rattachée conditionnellement à la même ligne. Une panne Stripe
  conserve le payment `pending` sans session.
- L'adaptateur Stripe E2E conserve les gardes `MOOVX_E2E=1`, HTTP local et hôte `localhost`/`127.0.0.1`.

## Responsabilités

### Fonctions pures

- validation des deux corps de requête ;
- résolution du plan plateforme et du rôle compatible ;
- construction des metadata plateforme et coach via le [contrat Stripe central](BILLING_STRIPE_CONTRACTS.md) ;
- construction des paramètres de session Stripe, URLs et transfert Connect compris.

### Orchestration testable

- `createPlatformCheckout` orchestre profil, plan, prix, compte plateforme,
  payment local `pending`, session Stripe puis rattachement de la session ;
- `createCoachCheckout` orchestre profil client, relation active unique, coach, customer Stripe puis session Stripe Connect.

Les accès Supabase et Stripe sont injectés par des ports minimaux. Le service peut ainsi être testé sans réseau ni clé réelle.

## Compatibilité conservée

- Plans, montants, descriptions, modes Stripe et Price IDs inchangés.
- Metadata inchangées. La clé d'idempotence plateforme est désormais ancrée
  sur le payment local préparé avant Stripe.
- URLs plateforme `payment=success|cancel` et coach `payment=success|canceled` inchangées.
- Commission coach de 3 %, statuts HTTP et corps JSON legacy inchangés.
- Le webhook Stripe n'est pas modifié et continue de consommer les mêmes metadata.

## Limites ouvertes

- La clé plateforme est stable par payment local; la clé coach conserve
  l'heure courante. Deux tentatives plateforme distinctes créent encore deux
  payments et deux clés.
- La création du customer Stripe et sa persistance locale ne sont pas transactionnelles.
- Les trois opérations plateforme — création du payment, création Stripe et
  rattachement de la session — ne forment pas une transaction distribuée. La
  réconciliation doit notamment traiter un payment `pending` resté sans
  session après une panne Stripe.
- Le cycle de vie du coordinateur de chargement du dashboard a été corrigé de façon bornée pour supporter le setup-cleanup-setup de React Strict Mode. Les E2E plateforme et coach atteignent désormais les frontières Checkout locales et sont verts.

Voir aussi [le modèle Billing](BILLING_DOMAIN_MODEL.md), [le modèle d'accès](BILLING_ACCESS_MODEL.md) et [le harnais E2E checkout](E2E_CHECKOUT_HARNESS.md).
