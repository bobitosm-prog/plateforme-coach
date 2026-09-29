# Achats intégrés iOS et essai de 14 jours

Audit du 29 septembre 2026. Base web : main 6596fda1 ; binaire iOS : build 7,
branche codex/ios-apple-sign-in. Ce document prépare l'intégration ; aucun achat
Apple ni produit App Store Connect n'a été créé ou activé pendant cet audit.

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
  Store Connect avant distribution. Leur état n'a pas été contrôlé ici.
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
  commerciaux actuels ; les prix iOS et produits inclus restent à confirmer.

## Choix produit demandé à Marco

A. Conserver l'essai MoovX actuel : 14 jours sans confirmation d'abonnement,
   puis achat Apple au tarif normal. Pas d'offre introductive Apple ajoutée.
B. Utiliser l'essai Apple : confirmation initiale, 2 semaines gratuites pour les
   personnes éligibles, puis renouvellement payant. Adapter l'initialisation
   côté serveur pour ne pas accorder en plus un essai MoovX aux nouveaux comptes
   iOS ; décider explicitement du traitement des comptes web existants.

Ne pas modifier les droits ou le parcours de production avant cette décision.
Un simple indicateur envoyé par le navigateur ne doit jamais accorder un droit.

## Sous-lots d'implémentation

1. Catalogue : groupe d'abonnements et produits mensuel/annuel selon validation
   commerciale, prix remontés par StoreKit, essai choisi ci-dessus, configuration
   locale de test. Offre à vie et offre coach à qualifier séparément.
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
