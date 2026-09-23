# MoovX — prototype simulateur (B0)

Prototype technique, **pas un candidat App Store**. Aucune modification du site,
du schéma DB, des contrats API ni des droits d'abonnement. Pas de secret embarqué.

## Décision limitée

Next.js conserve son serveur. SwiftUI + WKWebView sert de banc d'essai sans
dépendance supplémentaire pour mesurer les incompatibilités du site sur iOS.
Ce choix ne valide pas l'architecture finale : comparer ensuite client React
embarqué/Capacitor et composants natifs. Une simple enveloppe web ne démontre
pas la conformité à [Apple 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).
L'Apple Watch nécessitera sa propre intégration ; rien ici ne l'implémente.

## Ouvrir et construire

Ouvrir `MoovXPrototype/MoovXPrototype.xcodeproj` dans Xcode, sélectionner le scheme
MoovXPrototype et un iPhone simulé. Aucun compte Apple n'est nécessaire pour ce
build simulateur sans signature. La cible ne permet volontairement ni archive
de distribution ni installation sur appareil physique.

Depuis la racine du dépôt :

```sh
xcodebuild -project ios/MoovXPrototype/MoovXPrototype.xcodeproj \
  -scheme MoovXPrototype -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/DerivedData build

swiftc ios/MoovXPrototype/App/NavigationPolicy.swift \
  ios/MoovXPrototype/Tests/main.swift -o /tmp/moovx-ios-navigation-tests
/tmp/moovx-ios-navigation-tests
```

L'accueil natif ne contacte aucun serveur. « Ouvrir MoovX » ouvre explicitement
`https://app.moovx.ch/login` : **les actions du site restent des actions de
production**, pas une sandbox. Utiliser uniquement un compte de test dédié.
Le paramètre de lancement `--open-moovx` ouvre directement cette page pour le
contrôle visuel anonyme ; aucun identifiant ni jeton n'est transmis.

## Frontières et limites

- Navigation WebKit limitée à HTTPS app.moovx.ch, sans port alternatif,
  identifiants URL, popup ou pont JavaScript natif. TLS standard, aucune exception ATS.
- Ce filtre de navigation n'est pas un pare-feu : le site conserve ses appels
  réseau et sous-ressources existants. Il ne bloque pas ses requêtes API Stripe.
  Ne pas tester d'achat réel. Aucun flux IAP/StoreKit n'est implémenté.
- Sessions WebKit dans le sandbox de l'app ; aucun cookie Safari importé.
  Connexion, reconnexion, déconnexion et isolation entre comptes non qualifiées.
- OAuth externe bloqué explicitement ; retours email et universal links à construire.
- Aucun droit caméra, santé, microphone, notifications ou stockage partagé ajouté.
- Chargement, erreur réseau et interruption du processus WebKit présentés dans
  l'interface. Pas de promesse de sauvegarde/reprise ou fonctionnement hors ligne.
- Pas d'icône définitive, de traductions complètes, de fiche de confidentialité,
  de paiement natif ou de cible Watch. Pas de publication automatique.

## Validation 4 axes et suite

1. Contrat : cible simulateur et compilation Swift ; API/DB inchangées.
2. Automatisation : 14 cas de politique URL, dont domaines trompeurs et Stripe.
3. Runtime : lancer l'accueil puis la page de connexion anonyme sur iOS 27 ;
   les parcours authentifiés/séances et l'appareil réel sont un lot suivant.
4. Sécurité : pas de secrets, pas d'achat, pas d'accès natif sensible ; retour
   arrière par retrait du dossier ios uniquement. Production web non modifiée.

Avant TestFlight : compte Apple actif, architecture décidée, auth + universal
links, tests interruption/réseau/perte de réponse, achats Apple/restauration,
confidentialité et consentements, caméra et accessibilité sur appareil réel.

Référence API : [WKNavigationDelegate](https://developer.apple.com/documentation/webkit/wknavigationdelegate).

## Résultats du 23 septembre 2026

- Xcode 27.0 (27A266a), simulateur iOS 27.0 (24A434), iPhone 18 Pro.
- Build Debug simulateur réussi ; 14/14 cas de politique URL passent.
- Installation et lancement par simctl réussis. Page `/login` chargée et
  contrôlée visuellement avec le bandeau prototype, sans connexion ni achat.
- Accueil natif également contrôlé visuellement après relancement sans argument.
- Session authentifiée, navigation externe bloquée en interaction, erreurs
  réseau, accessibilité VoiceOver et reprise de séance restent à tester.
- Ce jalon B0 ne ferme ni le lot B (connexion + séance), ni les phases 9/10.
