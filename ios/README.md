# MoovX — prototype iOS (B0)

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
build Debug simulateur sans signature. La configuration Release permet désormais
une archive iPhone, mais ce prototype n'est pas un candidat App Store. La
préparation TestFlight interne est décrite dans
[`docs/IOS-TESTFLIGHT-INTERNAL-2026-09-24.md`](../docs/IOS-TESTFLIGHT-INTERNAL-2026-09-24.md).

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
  identifiants URL ni popup. Un pont JavaScript natif limité au signal de caméra
  refusée est présent. TLS standard, aucune exception ATS.
- Ce filtre de navigation n'est pas un pare-feu : le site conserve ses appels
  réseau et sous-ressources existants. Il ne bloque pas ses requêtes API Stripe.
  Ne pas tester d'achat réel. Aucun flux IAP/StoreKit n'est implémenté.
- Sessions WebKit dans le sandbox de l'app ; aucun cookie Safari importé.
  Connexion et reprise après coupure réseau vérifiées sur le compte de test ;
  déconnexion et isolation entre comptes non qualifiées.
- OAuth externe bloqué explicitement ; retours email et universal links à construire.
- Le droit caméra est déclaré pour la photo de repas et le code-barres ; aucun
  accès Santé, microphone, notifications ou stockage partagé n'est ajouté.
- Chargement, erreur réseau et interruption du processus WebKit présentés dans
  l'interface. Pas de promesse de sauvegarde/reprise ou fonctionnement hors ligne.
- Icône de test issue de l'artwork web 512 × 512, pas de source native définitive
  1024 × 1024 ; pas de traductions complètes, de fiche de confidentialité,
  de paiement natif ou de cible Watch. Pas de publication automatique.

## Validation initiale B0 (historique) et suite

1. Contrat : cible simulateur et compilation Swift ; API/DB inchangées.
2. Automatisation : 14 cas de politique URL, dont domaines trompeurs et Stripe.
3. Runtime : lancer l'accueil puis la page de connexion anonyme sur iOS 27 ;
   les parcours authentifiés/séances et l'appareil réel sont un lot suivant.
4. Sécurité : pas de secrets, pas d'achat, pas d'accès natif sensible à ce stade ; retour
   arrière par retrait du dossier ios uniquement. Production web non modifiée.

Avant TestFlight externe ou App Store : compte Apple actif, architecture décidée, auth + universal
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

## Retours manuels et corrections d'affichage

Les captures fournies par Marco le 23 septembre montrent la connexion du compte
de test, la reprise de Full Body C à 0/15 puis 1/15 séries après Stop/Relancer.
Entre deux captures, séance +44 s et repos -44 s : continuité cohérente à l'écran.
Une capture ultérieure montre 2/15 séries. Aucune finalisation de séance n'a été
demandée ; l'écriture finale en base et le mode hors réseau ne sont pas validés.
Le brouillon reste conservé, aucune suppression de données n'est incluse ici.

Corrections B0.1 : présentation native plein écran, une seule barre compacte
avec avertissement production et bouton Fermer ; fond WebKit sombre ; storyboard
de lancement sombre MoovX. Le storyboard traite le flash blanc, **pas la cause
d'une lenteur de démarrage**. Le temps à froid et les premières images restent
à mesurer sur appareil réel. Build et lancement simulateur vérifiés, accueil
authentifié visible après réinstallation sans effacement des données.

Correction web distincte : numéro de série en cours et nombre de séries validées
séparés ; barre fondée sur `set.done`, pas sur l'index de la série active. Quatre
tests de rendu React couvrent début, dernière série non validée, fin et libellés
de techniques. Traductions FR/EN/DE. Ne modifie ni les séries, ni le calcul du
volume, ni la persistance. Ce code web a été livré séparément par la PR 37,
fusionnée au commit `51cdb03f03e353c7e27b6600e35ac45f7fbe56fc` : CI verte,
déploiement production READY avec l'alias app.moovx.ch vérifié le 23 septembre.
Les 2 027 tests, TypeScript, traductions et le build standard passent.
La vérification visuelle de ce nouvel affichage dans la séance en production
reste à effectuer après rechargement ; le brouillon de test n'a pas été modifié.
Le prototype natif de cette PR reste en brouillon et n'a pas été publié.
