# Achats intégrés iOS et essai de 14 jours

Audit du 29 septembre 2026. Base web : main 6596fda1 ; binaire iOS : build 7,
branche codex/ios-apple-sign-in. Ce document prépare l'intégration ; aucun achat
Apple ni produit payant App Store Connect n’a été activé pendant cet audit.
Groupe MoovX Athena créé dans App Store Connect (22425039), état « Finaliser
avant soumission ». Produits et tarifs confirmés puis préparés (détails ci-dessous).

## Conditions Apple vérifiées

- Un abonnement renouvelable peut proposer une offre introductive gratuite de
  **2 semaines**, notamment pour une formule mensuelle ou annuelle.
- Une personne ne peut utiliser qu'une offre introductive par groupe
  d'abonnements. Vérifier son éligibilité via StoreKit avant de promettre l'essai.
- L'essai Apple commence à la confirmation de l'abonnement ; le renouvellement
  devient payant à son terme sauf annulation. Afficher durée, prix localisé,
  périodicité et renouvellement clairement avant confirmation.
- Prévoir restauration des achats et gestion de l'abonnement, ainsi que les
  liens vers confidentialité et conditions d'utilisation.
- Vérifier le contrat Paid Apps, les données fiscales et bancaires dans App
  Store Connect avant distribution. État de préparation consigné en fin de document.
- L'accès numérique MoovX doit avoir son parcours StoreKit sur iPhone. Le
  coaching individuel en direct et le logiciel Coach Pro sont des offres
  distinctes : ne pas appliquer automatiquement une exception à toute l'app.

Sources officielles :
- https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions
- https://developer.apple.com/app-store/subscriptions/
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/in-app-purchase/
- https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/

## Audit terrain

- La fonction de production public.set_initial_trial fixe exactement 14 jours,
  une seule fois, après l'onboarding. L'appel est authentifié et verrouille la
  ligne du profil. Le paramètre historique p_days ne permet pas de changer
  la durée. Ce n'est pas un abonnement Apple et aucun paiement n'est confirmé.
- profiles possède trial_ends_at, subscription_type/status/end_date et des
  identifiants Stripe ; aucun champ Apple dans les colonnes de facturation
  inspectées. Une provenance distincte des droits Apple sera nécessaire.
- Le résolveur effectif reconnaît des types payants communs. Les écritures du
  webhook Stripe sont directes dans profiles : ne pas ajouter un webhook Apple
  qui écraserait aveuglément les droits d'une autre source.
- Aucun StoreKit d'achat dans le binaire audité. Le pont Apple Sign In existant
  n'est pas un pont de paiement.
- Le script historique Stripe contient 10 CHF/mois, 80 CHF/an et 150 CHF à vie
  pour Athena, 50 CHF/mois pour Coach Pro. Ce script ne prouve PAS les tarifs
  commerciaux actuels ; Marco a ensuite confirmé les trois tarifs Athena ci-dessous.

## Choix produit confirmé par Marco

A. Conserver l'essai MoovX actuel : 14 jours sans confirmation d'abonnement,
   puis achat Apple au tarif normal. Pas d'offre introductive Apple ajoutée.
B. Utiliser l'essai Apple : confirmation initiale, 2 semaines gratuites pour les
   personnes éligibles, puis renouvellement payant. Adapter l'initialisation
   côté serveur pour ne pas accorder en plus un essai MoovX aux nouveaux comptes
   iOS ; décider explicitement du traitement des comptes web existants.

Décision reçue : option A. Conserver les 14 jours sans engagement, puis demander
un achat Apple explicite. Aucun renouvellement automatique au terme de l’essai
MoovX ; aucun essai introductif Apple supplémentaire. Les abonnements achetés
ensuite sont renouvelables selon la formule choisie. Tarifs confirmés ensuite : 10 CHF/mois, 80 CHF/an, 150 CHF à vie.
Un simple indicateur envoyé par le navigateur ne doit jamais accorder un droit.

## Sous-lots d'implémentation

1. Catalogue : groupe d'abonnements et produits mensuel/annuel selon validation
   commerciale, prix remontés par StoreKit, essai choisi ci-dessus, configuration
   locale de test. Offre à vie non consommable confirmée ; offre coach hors de ce lot.
2. Serveur : transactions Apple signées vérifiées côté serveur, rattachement
   au compte authentifié (appAccountToken), unicité de la transaction d'origine,
   séparation sandbox/production, dates d'expiration fournies par Apple,
   événements idempotents, remboursements/révocations, renouvellements et
   rapprochement en cas de notification manquante. Fusion des droits par source
   pour qu'une expiration Stripe n'annule pas un achat Apple valide, et inversement.
3. iOS : StoreKit 2, achat, annulation, attente d'approbation, restauration et
   suivi des transactions. Pont limité à l'origine principale MoovX, réponse
   liée à la requête et au compte initial ; aucune attribution de droit depuis JS.
4. Interface : prix et période localisés, texte d'essai conditionnel, liens
   légaux, Restaurer, Gérer l'abonnement ; prévenir une seconde souscription si
   le compte a déjà un accès payé compatible.

## Validations 4/4 avant livraison

1. Logique : éligible/non éligible, pas de double essai, expiration et sources
   multiples de droits ; pas de prolongation arbitraire de 30/365 jours.
2. Sécurité : signature/bundle/environnement/produit/compte vérifiés, RLS sur
   données sensibles, écritures serveur uniquement ; auth et rate limit sur
   endpoints utilisateur. Notifications authentifiées par signature Apple,
   pas par session navigateur ; rejeu sans double effet.
3. Runtime : StoreKit local puis sandbox/TestFlight, achat/restauration,
   renouvellement, remboursement, coupure réseau, reprise, changement A/B/A,
   et reconnexion web avec les mêmes droits. Aucun achat réel pour les tests.
4. Distribution : contrats/configuration ASC vérifiés, capture du paywall,
   compte de revue, compilation/signature du candidat distribuable et soumission
   des premiers produits avec la version iOS. Ne pas confondre build interne
   existant et candidat de publication.

## Prompt d'implémentation à utiliser après décisions

Tâche : intégrer StoreKit 2 pour l'accès Athena iOS, en conservant exactement la
politique de 14 jours validée par Marco. Scope : catalogue, pont natif, vérification
serveur, persistance des événements/droits et paywall ; pas de refonte générale.
Contexte : patterns existants ci-dessus, production Stripe à préserver.
Logique : seuls les événements vérifiés accordent les droits ; réessais idempotents,
restauration liée au bon compte, résolution indépendante des sources Stripe/Apple.
Livrable : commits séparés par sous-lot, migrations SQL idempotentes, tests runtime
et preuve des validations 4/4. Contraintes : aucun secret exposé, aucun prix inventé,
aucun achat réel, aucun changement destructif des droits existants.


## Configuration effectuée dans App Store Connect

| Offre | Identifiant de produit | ID Apple | Type | Prix suisse |
|---|---|---|---|---|
| Mensuel | ch.moovx.app.athena.monthly | 6817374325 | Renouvelable, 1 mois | 10 CHF |
| Annuel | ch.moovx.app.athena.yearly | 6817374523 | Renouvelable, 1 an | 80 CHF |
| À vie | ch.moovx.app.athena.lifetime | 6817374844 | Non consommable | 150 CHF |

Groupe des abonnements : 22425039. Prix exacts sélectionnés et confirmés dans
l'interface Apple, avec équivalences proposées par Apple pour les autres régions.
Aucune disponibilité commerciale sélectionnée, aucune offre introductive créée,
aucun produit soumis en revue. Ils ne sont pas encore achetables dans MoovX.
Reste à compléter : noms/descriptions localisés, disponibilités, même niveau de
service mensuel/annuel dans le groupe, captures et notes de revue, intégration
StoreKit/serveur et tests. Ne pas considérer le passage au produit à vie comme
une annulation automatique d'un abonnement renouvelable existant : prévoir
un parcours explicite de gestion pour éviter des renouvellements en parallèle.

## Prérequis commercial constaté

Dernier état consulté le 29 septembre : contrat applications payantes accepté
sur instruction de Marco, statut « En attente d'infos de l'utilisateur ».
Coordonnées bancaires saisies par Marco, traitement Apple annoncé sous 24 h ;
statut de commerçant DSA en cours de vérification. Le formulaire W-8BEN présente
une nationalité incorrecte et non modifiable : demande de correction envoyée
par Marco au support Apple, accusé de réception reçu. Ne pas soumettre le
formulaire incorrect ni considérer le contrat comme actif avant relecture.
Ces étapes bloquent la commercialisation ; le développement local continue.

Référence du produit à vie :
https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-types
