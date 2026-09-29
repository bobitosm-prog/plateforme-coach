# Vérification des transactions Apple — sous-lot serveur

Le module `lib/apple/transaction-verification.ts` vérifie les preuves signées
avant toute future attribution de droits. Un adaptateur et une migration de
registre sont préparés et testés localement (détails en fin de document). Aucun
raccordement à une route, au résolveur des droits ou au pont iOS ; aucune
modification en base de production, aucun achat réel ni changement des accès Stripe.

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

## Registre d'évidence ajouté — 29 septembre

Migration `20260929153040_apple_purchase_evidence_ledger.sql`, créée avec la CLI
Supabase. Validée deux fois sur un cluster PostgreSQL 16.14 éphémère local ;
**non appliquée en production**. Aucune route n'appelle encore ce registre.

- `apple_account_bindings` : token aléatoire stable par compte/environnement.
- `apple_purchase_owners` : rattachement immuable par transaction d'origine.
- `apple_transaction_evidence` : versions signées en ajout uniquement, clé
  environnement/transaction/date de signature. Un même événement est sans effet
  supplémentaire ; une version conflictuelle est rejetée. La lecture de l'état
  devra utiliser la version signée la plus récente, jamais l'ordre d'arrivée.
- RPC `SECURITY INVOKER`, `search_path` vide, réservées à `service_role`, accès
  SELECT/INSERT uniquement. RLS activée et forcée sur les trois tables, aucune
  politique navigateur, aucune autorisation publique de lecture/écriture/RPC.
- Verrou transactionnel par transaction Apple ; rattachement et événement
  enregistrés atomiquement. Les échecs ne laissent pas de rattachement partiel.
- Suppression du compte : utilisateur mis à NULL dans le rattachement, token
  et propriété conservés pour empêcher de réattribuer les mêmes achats. La
  politique de conservation et le parcours de suppression devront être revus
  avant activation commerciale ; aucune donnée réelle stockée à ce stade.
- Adaptateur serveur `purchase-ledger.ts` : erreurs de base masquées ; aucun
  changement des profils Stripe ni du résolveur d'accès. Les appelants devront
  authentifier/limiter les requêtes et passer uniquement des preuves vérifiées.

Runtime SQL (nécessite les binaires PostgreSQL via `pg_config`, ne lit aucune
configuration distante, démarre uniquement un socket Unix privé) :

```sh
node tests/integration/apple-purchase-ledger.mjs --advisors
npx vitest run tests/unit/apple-purchase-ledger.test.ts
```

Scénarios validés : migration répétable, réessai exact, 12 écritures concurrentes,
concurrence entre comptes, renouvellement/à vie, séparation Sandbox/Production,
remboursement reçu avant une ancienne preuve, refus des conflits, rollback,
suppression du compte, permissions et RLS même après un grant SELECT accidentel.
L'audit des catalogues locaux vérifie aussi les fonctions invoker et search_path.
Les advisors Supabase exécutés sur ce cluster local (sécurité et performance,
niveau warning ou supérieur) ne remontent aucun résultat. Ce test ne remplace
pas Supabase Auth/PostgREST ni les contrôles du projet cible lors du déploiement.

Le raccordement aux droits reste bloqué techniquement tant que l'état actuel
Apple n'est pas réconcilié : enregistrer une preuve signée ne démontre pas
l'absence d'un remboursement ultérieur. Prochaine étape : API serveur Apple,
notifications V2 puis résolution des droits, avant achat/restauration iOS.

## Rapprochement de l'état Apple — sous-lot préparé

`server-api.ts` construit le client officiel avec une clé In-App Purchase EC
P-256 dédiée. Variables serveur uniquement : `APPLE_IAP_PRIVATE_KEY`,
`APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`. Aucune valeur de clé dans le dépôt,
aucun repli vers les identifiants Apple Sign In. Ces variables sont absentes
du shell local vérifié ; les secrets du déploiement n'ont pas été inspectés.

`reconciliation.ts` reçoit une preuve déjà vérifiée et le rattachement du compte.
Il relit la transaction via Get Transaction Info ; pour un abonnement, il demande
ensuite Get All Subscription Statuses et vérifie la dernière transaction du même
achat d'origine. Les réponses sont contrôlées (signature, compte, application,
environnement, produit, dates) ; absence, ambiguïté ou échec ne donne aucun droit.

États distingués : actif jusqu'à la date Apple, délai de grâce jusqu'à une date
issue d'un renouvellement signé et concordant, à vie, expiré, relance de paiement,
révoqué, remplacé. Désactiver le renouvellement automatique ne coupe pas une
période déjà payée. Le statut d'un ancien achat ne masque pas un renouvellement
ultérieur. Un remboursement signé prend priorité sur un statut actif.

La sortie est une observation datée, pas un droit persistant : aucun appel depuis
une route, aucune écriture ni intégration au résolveur dans ce sous-lot. Elle ne
doit pas être mise en cache indéfiniment. Une indisponibilité Apple ne doit pas
être convertie en preuve de révocation d'un abonnement précédemment confirmé.
Avant raccordement : persistance atomique de l'état courant, notifications V2,
politique explicite de fraîcheur/reprise et validation sandbox.

Validation : 96 tests applicatifs passés, TypeScript et ESLint ciblé. Les tests
utilisent de vraies signatures/certificats éphémères, mais le transport Apple est
simulé. Ils couvrent les renouvellements, remboursements, grâce, délais réseau,
réponses incohérentes et clés absentes/invalides. Aucun achat Apple réel testé.

Chaque attente d'API est bornée à 15 secondes. La bibliothèque officielle n'expose
pas d'annulation sur ces méthodes ; le délai arrête le rapprochement, mais ne
termine pas la requête HTTP sous-jacente. Prévoir un transport annulable ou un
budget d'exécution réseau approprié avant de raccorder un endpoint public.

Sources consultées le 29 septembre 2026 :
- https://developer.apple.com/documentation/appstoreserverapi/get-transaction-info
- https://developer.apple.com/documentation/appstoreserverapi/get-all-subscription-statuses
- https://developer.apple.com/documentation/appstoreserverapi/status
