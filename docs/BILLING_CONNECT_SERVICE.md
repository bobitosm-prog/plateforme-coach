# Service Stripe Connect

## Périmètre

Le module `lib/billing/connect` porte les opérations Stripe Connect actuellement utilisées par MoovX :

- création ou réutilisation du compte Express d'un coach ;
- création du lien d'onboarding ;
- lecture de l'état du compte pour confirmer les capacités de paiement et de virement.

Les frontières HTTP restent :

- `POST /api/stripe/connect` ;
- `POST /api/stripe/check-account`.

`setup-products`, le checkout coach et le webhook restent hors de cette extraction. Le checkout coach continue de relire le compte Connect du coach actif côté serveur et le webhook continue de marquer l'onboarding achevé.

## Autorité et sécurité

- L'utilisateur provient de `auth.getUser()` côté serveur.
- Le champ legacy `coachId` reste requis par `/api/stripe/connect` pour compatibilité, mais doit être strictement égal à l'identité authentifiée.
- Le rôle `coach`, l'e-mail et `stripe_account_id` sont relus via le client authentifié avant toute création du client admin ou appel Stripe.
- Les champs navigateur `email`, `existingAccountId` et `accountId` ne font jamais autorité.
- Le service-role n'est construit qu'après authentification, contrôle d'identité, lecture du profil et contrôle du rôle.
- La persistance du compte utilise une écriture conditionnelle lorsque `stripe_account_id IS NULL`; le compte déjà gagné par une exécution concurrente est ensuite réutilisé.
- Les erreurs Stripe sont converties en `PROVIDER_ERROR`. Aucun message fournisseur, secret ou identifiant interne n'est renvoyé.

## Contrats conservés

### Création et onboarding

- Compte Stripe Express, pays `CH`, type d'activité `individual`.
- Capacités `card_payments` et `transfers` demandées.
- Metadata `{ coachId }` et clé d'idempotence `connect-account-${coachId}`.
- URLs `/?stripe=refresh` et `/?stripe=success&account=...` inchangées.
- Réponse de succès `{ url, accountId }` inchangée.
- Compte stocké déjà présent réutilisé sans mutation.

### Lecture du statut

- Réponses `no_account`, `active`, `incomplete` et `error` conservées pour les appels légitimes.
- `connected` reste vrai uniquement lorsque `charges_enabled` et `payouts_enabled` sont vrais.
- Les exigences courantes Stripe restent exposées sous `requirements`.
- L'identifiant interrogé est désormais exclusivement celui du profil coach authentifié.

## État du schéma et limites

- `profiles.stripe_account_id` appartient au schéma canonique et aux types générés.
- `profiles.stripe_onboarding_complete` est utilisé par le webhook et les interfaces mais reste absent des migrations et types canoniques documentés. Cette extraction ne crée pas artificiellement la colonne.
- Plusieurs consommateurs historiques tentent encore de recopier `stripe_account_id` ou `stripe_onboarding_complete` depuis le navigateur après retour Stripe. Ces écritures ne constituent pas une autorité et doivent être supprimées lors d'une tranche dédiée ; la route et le webhook restent les frontières serveur.
- L'idempotence Stripe évite la multiplication normale des comptes, mais la création Stripe et la persistance Supabase ne sont pas transactionnelles. La réconciliation Billing reste nécessaire.
- Aucun E2E dédié à l'onboarding Connect réel n'existe ; les tests unitaires exercent le contrat par ports simulés. Les E2E checkout valident seulement l'utilisation d'une destination Connect déjà synthétique.

Voir aussi [le modèle Billing](BILLING_DOMAIN_MODEL.md), [le service Checkout](BILLING_CHECKOUT_SERVICE.md), [les types Supabase](SUPABASE_TYPES.md) et [le rollback Phase 1](PHASE_1_ROLLBACK.md).
