# Vérification des transactions Apple — sous-lot serveur

Le module `lib/apple/transaction-verification.ts` vérifie les preuves signées
avant toute future attribution de droits. Un adaptateur et une migration de
registre sont préparés et testés localement (détails en fin de document). Le raccordement aux droits serveur et au verrou d’abonnement du tableau de bord
est préparé derrière un drapeau désactivé. Le pont d’achat iOS reste à raccorder ;
la réception des notifications est également désactivée. Aucune
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

## Clé Apple et premier échange réel validés

Après confirmation explicite de Marco, la clé dédiée « MoovX Server Purchases »
a été générée dans App Store Connect et téléchargée le 29 septembre 2026.
La clé privée et ses métadonnées sont conservées localement hors du dépôt,
avec répertoire 0700 et fichiers 0600 ; aucun secret dans ce document ou Git.

Un appel réel de lecture `getNotificationHistory` en Sandbox, limité à la
dernière heure, a réussi avec la bibliothèque officielle : authentification
acceptée, zéro notification, aucune page supplémentaire. Cela valide la clé,
l'émetteur et l'accès API pour cette application ; cela ne valide PAS encore
un achat, un remboursement, une notification reçue ou le parcours iPhone.
Aucun achat effectué, aucune clé ajoutée au déploiement, aucune migration
appliquée en production. Le raccordement serveur/iOS reste à terminer.

## Réception durable des notifications V2 — préparée, désactivée

Deux chemins explicites : `/api/apple/notifications/sandbox` et
`/api/apple/notifications/production`. Le chemin impose l'environnement vérifié,
jamais un champ du corps. La signature Apple remplace l'authentification par
session navigateur. Le proxy existant laisse passer les routes `/api/`.

Les flags serveur `APPLE_IAP_SANDBOX_NOTIFICATIONS_ENABLED` et
`APPLE_IAP_PRODUCTION_NOTIFICATIONS_ENABLED` valent faux par défaut. Aucun flag
activé, aucune URL de notification configurée dans App Store Connect et aucune
migration exécutée en production dans ce sous-lot.

Le handler borne le corps réellement lu (même sans Content-Length), impose JSON,
vérifie la signature/chaîne Apple, le bundle, l'environnement, la version 2.0,
l'identifiant de notification, la date et l'ID d'app en production. Les anciennes
dates sont acceptées pour les réessais. Les payloads de notification sont limités
à 128 Kio ; une limite de 300 requêtes/minute par environnement et par processus
utilise le pattern existant. Une limitation distribuée/au niveau de la plateforme
et les délais réseau devront être vérifiés avant exposition commerciale.

La migration `20260929154935_apple_notification_inbox.sql` ajoute une boîte de
réception RLS, sans grants/politiques navigateur, avec une RPC invoker réservée
au service et des droits SELECT/INSERT uniquement. Clé unique : environnement
et UUID de notification. Un contenu signé différent sous la même clé est rejeté
pour analyse, jamais écrasé. Aucune donnée du payload n'est journalisée ou renvoyée
au demandeur ; le JWS conservé en base doit rester traité comme donnée privée.

HTTP 200 signifie uniquement « stocké durablement », y compris un doublon exact.
Une panne de base ou de vérification temporaire donne 503 ; une signature invalide
400, un corps trop volumineux 413, un dépassement de débit 429. Les événements
TEST sont marqués `test_received`, les autres `pending`. Le worker devra vérifier
les JWS imbriqués, résoudre le propriétaire, relire Apple et enregistrer les droits
courants atomiquement AVANT de considérer un événement traité. Il n'est pas encore
implémenté : **ne pas activer ces endpoints pour les achats réels**.

Validations : 124 tests Vitest (dont 28 pour signatures de notification et handler
HTTP) ; TypeScript et ESLint ciblé ; PostgreSQL éphémère avec les deux migrations
appliquées deux fois, 12 enregistrements concurrents, conflits, isolation des
environnements, contrôle des permissions et advisors sans warning/erreur.
Le transport HTTP Apple vers un déploiement n'a pas encore été testé.

Apple réessaie les notifications V2 en production, mais une seule livraison a
lieu en sandbox. Prévoir récupération de l'historique et demande explicite de
notification TEST lors du raccordement.
Source : https://developer.apple.com/documentation/appstoreservernotifications/responding-to-app-store-server-notifications

## Traitement des notifications et état Apple courant — préparés

Le worker `processOneAppleNotification` traite un événement par appel. Il reste
serveur uniquement, sans endpoint de déclenchement ni planification active.
La migration `20260929155616_apple_notification_processing.sql` ajoute les baux
et l'état courant `apple_purchase_state`, sans modifier les profils Stripe ni
le résolveur de droits. Toutes les migrations restent locales/non déployées.

- Réservation avec `FOR UPDATE SKIP LOCKED`, bail de cinq minutes, jeton unique.
  Après interruption, un nouveau worker reprend avec un nouveau jeton ; les
  écritures tardives de l'ancien worker sont refusées.
- Revalidation de l'enveloppe et de la transaction imbriquée. Le token signé
  sert uniquement à chercher le compte dans le rattachement serveur existant.
  Aucun compte n'est créé ou transféré à partir d'une notification.
- Relecture API Apple avant toute observation courante. Une étiquette REFUND
  ancienne n'est pas appliquée aveuglément si Apple confirme un état ultérieur.
- Une RPC atomique enregistre preuve/propriétaire/état et marque l'événement
  traité. Si elle échoue, toutes les écritures sont annulées. Les observations
  plus anciennes (date de signature ou début de consultation) ne remplacent
  pas les plus récentes. L'heure de contrôle est maintenant capturée au début
  du rapprochement pour qu'une requête lente ne paraisse pas plus récente.
- Les pannes laissent le dernier état confirmé intact et programment un réessai
  progressif jusqu'à une heure. Signature invalide, compte sans rattachement et
  événements non pris en charge sont mis en quarantaine avec un code sans
  données privées. Aucune réponse automatique aux demandes de consommation,
  qui nécessitent un parcours distinct et une revue des données transmises.
- Les RPC de traitement sont invoker/service-only. Les droits UPDATE de l'inbox
  sont limités aux colonnes de traitement : le contenu signé reste immuable.
  La table d'état force RLS sans accès navigateur. Les notifications TEST
  restent `test_received` et ne sont pas réclamées par le worker.

Validation : 136 tests Vitest ; PostgreSQL local avec troisième migration
réappliquée, bail expiré/reprise, rejet de l'ancien bail, mise à jour atomique,
remboursement puis ancienne observation active, échec/rollback, réessai différé,
quarantaine, workers concurrents distincts et refus d'accès navigateur. Advisors
locaux sans warning/erreur ; TypeScript et ESLint ciblé validés.

Reste avant activation : lecteur des droits par source avec politique de
fraîcheur, planification authentifiée du worker et récupération de l'historique,
reprise des quarantaines, limites réseau/distribuées, migrations et configuration
sur l'environnement de test, puis notification TEST réellement livrée par Apple.
La simple existence d'un état Apple en base ne donne encore aucun accès à l'app.


## Lecture des droits Apple — 29 septembre 2026

La fonction SQL `read_apple_entitlement_states` lit uniquement les achats Production
rattachés au compte authentifié, avec preuves et état courant concordants. Elle
est inaccessible aux rôles navigateur ; aucune écriture du profil Stripe.

Le serveur accepte les états active/grace jusqu’à l’échéance Apple, ou lifetime.
Les preuves remboursées, remplacées, expirées et les contrôles vieux de 24 heures
ne donnent pas d’accès. Même le lifetime doit être revérifié périodiquement pour
prendre en compte les remboursements. Plusieurs achats sont combinés sans qu’un
achat révoqué annule un autre achat valide. Le DTO public ne contient aucun
identifiant de transaction ni token Apple.

`APPLE_IAP_ENTITLEMENTS_ENABLED=true` activera la lecture après déploiement des
migrations et mise en place de la réconciliation périodique. Il reste désactivé.
Les droits Stripe, les accès historiques et les 14 jours d’essai conservent leurs
règles. Une panne de lecture Apple n’accorde aucun droit Apple et n’efface pas un
accès indépendant. Le dashboard reconnaît le droit Apple, rafraîchit au retour
au premier plan et chaque minute visible, et recalcule à son échéance. Changer
de compte efface le snapshot ; les réponses de l’ancien compte sont ignorées.

Validation locale : 175 tests ciblés passés, TypeScript sans erreur ; PostgreSQL
réel avec application répétée des migrations, isolation compte/environnement,
refus aux rôles navigateur et aucun avertissement des advisors. Aucun achat réel,
aucun déploiement ni activation en production dans ce sous-lot. Le libellé de
facturation de la page Compte et le parcours natif achat/restauration restent
à raccorder avec le prochain lot iOS.
