# Vérification des transactions Apple — sous-lot serveur

Le module `lib/apple/transaction-verification.ts` vérifie les preuves signées
avant toute future attribution de droits. Il n'est pas encore raccordé à une
route, au journal des achats, au résolveur des droits ou au pont iOS. Aucun
changement en base, aucun achat réel et aucun changement des accès Stripe.

## Contrat de sécurité

- Bibliothèque officielle Apple 3.1.0, signature ES256 et chaîne de certificats.
  Racines publiques embarquées depuis https://www.apple.com/certificateauthority/
  le 29 septembre 2026 ; URL et empreinte SHA-256 conservées dans le JSON. La mise
  à jour des racines doit passer par une revue, jamais par le client HTTP.
- En déploiement, vérification en ligne OCSP obligatoire. Une indisponibilité de
  vérification ne donne aucun accès : erreur dédiée permettant un réessai.
- Environnement fourni par configuration serveur : Production OU Sandbox,
  jamais Xcode/LocalTesting (ces derniers désactivent la signature dans la lib).
  Pas de repli automatique vers Sandbox après un échec Production.
- Bundle exact `ch.moovx.app`, trois produits autorisés, type et groupe cohérents,
  achat personnel uniquement, quantité 1, identifiants et dates contrôlés.
- Le token attendu doit venir du rattachement serveur du compte authentifié.
  Un token absent ou différent est refusé. Ne pas accepter un token attendu
  fourni dans le corps de la requête ; ne pas transférer une transaction entre
  comptes lors d'une restauration.
- La sortie est une **preuve historique signée**, pas un droit actif. Une preuve
  valide peut précéder un remboursement : consulter l'état Apple actuel avant
  attribution et conserver les notifications/révocations dans un registre.
- Dates d'expiration, révocation et remplacement conservées ; aucune durée
  artificielle de 30/365 jours, aucun accès accordé par un simple booléen client.
- Entrée bornée à 32 Kio ; erreurs sans payload, token de compte ou identifiant
  Apple. Aucune clé privée dans ce lot. La clé In-App Purchase serveur future
  sera distincte de la clé Apple Sign In.

## Validations du sous-lot (distinctes de la recette des achats)

1. Logique : mensuel/annuel/à vie, types, dates, groupe, données expirées/révoquées.
2. Sécurité : falsification du payload, fausse autorité de certification,
   mauvais bundle/environnement/compte, token absent, mode Xcode interdit.
3. Runtime : Vitest exécute la vraie bibliothèque Apple avec une chaîne EC créée
   temporairement par OpenSSL et détruite après lecture. Aucun mock de la
   signature ; vérification offline limitée à cette PKI de test. Les erreurs
   OCSP sont simulées, pas une validation réseau Apple réelle.
4. Intégration statique : TypeScript et ESLint ; tests existants des droits/essai
   pour vérifier l'absence de régression. Les paiements ne sont PAS prêts pour
   publication sur la seule base de ces tests.

Commandes :

```sh
npx vitest run tests/unit/apple-transaction-verification.test.ts tests/unit/effective-entitlement-resolver.test.ts tests/unit/initialize-trial.test.ts tests/unit/legacy-entitlement-repository.test.ts
npx tsc --noEmit
npx eslint lib/apple/transaction-verification.ts tests/unit/apple-transaction-verification.test.ts tests/unit/helpers/apple-test-chain.ts
```

## Sous-lots suivants

1. Registre source Apple avec RLS, accès serveur, unicité par environnement et
   transaction, propriétaire immuable par transaction d'origine, mise à jour
   monotone des événements signés. Sandbox n'accorde pas un droit de production.
2. App Store Server API et notifications V2 signées : rapprochement de l'état
   actuel, remboursements, renouvellements, rejeu/concurrence et réconciliation.
3. Routes authentifiées/limitées et fusion des droits par source ; ne pas écrire
   dans les champs Stripe du profil. L'essai MoovX de 14 jours reste inchangé.
4. Achat/restauration iOS, prix localisés, gestion, textes légaux ; tests sandbox
   de bout en bout avant un nouveau candidat App Store.

Référence officielle : https://github.com/apple/app-store-server-library-node
