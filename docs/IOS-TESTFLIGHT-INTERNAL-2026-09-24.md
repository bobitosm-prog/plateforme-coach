# Préparation TestFlight interne — 24 septembre 2026

Portée : une bêta réservée à Marco, distincte d'une candidature à l'App Store.
Le binaire reste un prototype SwiftUI + WKWebView affichant le site de
**production**. Aucun achat réel, changement de base ou publication n'est inclus.

## Configuration

- Le scheme partagé autorise l'archive en configuration Release.
- Release cible iOS physique, avec signature automatique et identifiant stable
  `ch.moovx.app` ; Debug conserve son identifiant `ch.moovx.prototype` et son
  build simulateur non signé.
- Version `0.1.0`, build `1`. Incrémenter le build avant un second téléversement.
- `ios/ExportOptions-InternalTestFlight.plist` exporte localement, sans upload,
  avec `testFlightInternalTestingOnly=true`. Aucun Team ID, profil ni secret
  n'est stocké dans le dépôt.

Depuis la racine du dépôt, après sélection de l'équipe Apple dans Xcode :

```sh
xcodebuild -project ios/MoovXPrototype/MoovXPrototype.xcodeproj \
  -scheme MoovXPrototype -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /chemin/local/MoovXPrototype.xcarchive \
  DEVELOPMENT_TEAM=<TEAM_ID> -allowProvisioningUpdates archive

xcodebuild -exportArchive \
  -archivePath /chemin/local/MoovXPrototype.xcarchive \
  -exportPath /chemin/local/export \
  -exportOptionsPlist ios/ExportOptions-InternalTestFlight.plist \
  -allowProvisioningUpdates
```

`<TEAM_ID>` est une valeur à fournir localement, jamais dans un commit. Les
archives et `.ipa` générés restent hors du dépôt.

## Validation locale de ce lot

1. Contrat : version, bundle ID, caméra et icône présents dans le paquet iPhone.
2. Automatisation : 14 tests Swift de politique de navigation réussis ; plist
   d'export valide.
3. Runtime : Marco a vérifié sur iPhone l'icône, l'ouverture, le message lors
   d'une coupure réseau et la session conservée après « Réessayer ». Le build
   Release a aussi été lancé sur simulateur. Une archive Release arm64 a été
   créée ; export `.ipa` signé avec certificat Apple
   Distribution géré par Apple, profil App Store et droit bêta actif.
4. Sécurité : `codesign --verify --deep --strict` réussit sur le `.ipa` extrait ;
   `get-task-allow=false`. L'export est limité à TestFlight interne. Aucun
   téléversement App Store Connect ni achat de test effectué.

## Reste avant une bêta utilisable

- Vérifier ou créer la fiche `ch.moovx.app` dans App Store Connect, puis
  téléverser explicitement le `.ipa` interne et attendre le traitement Apple.
- Confirmer les informations TestFlight demandées et ajouter seulement Marco
  au groupe de test interne ; tester l'installation et le lancement de cette
  **version distribuée**, qui n'a pas encore été exécutée sur appareil.
- Le parcours photo d'un vrai repas est reporté à la disponibilité d'un repas.
  Le retour après réseau ne prouve pas la conservation d'un brouillon non sauvé.
- La conformité à la règle Apple 4.2, la stratégie d'abonnements iOS, la
  confidentialité et les parcours complets restent ouverts avant toute
  publication App Store. Ce lot ne les déclare pas résolus.

Références : [distribution Xcode](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases),
[règles App Review](https://developer.apple.com/app-store/review/guidelines/).
