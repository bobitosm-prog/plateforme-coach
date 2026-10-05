# MoovX — client iOS en préparation

## Lancement direct — 4 octobre 2026

L'app ouvre désormais directement `PrototypeBrowser`, sans accueil de prototype,
présentation modale ni bandeau TEST / PRODUCTION. Le nom affiché en Release est
MoovX ; les identifiants de bundle sont conservés pour préserver les installations
et leurs données. Les noms techniques historiques de projet/classes restent
inchangés. Aucun build TestFlight n'est publié par ce changement de code.

La vue respecte les zones sûres iPhone. Les contrôles de navigation, le magasin
WebKit persistant, les ponts Apple, la caméra, le repos et la reprise après
interruption sont conservés. Les messages chargement/erreur/reprise/navigation
sont disponibles en FR/EN/DE. Le lancement contacte désormais directement le site
de production ; les essais authentifiés nécessitent un compte de test dédié.

Validation locale : 33 contrôles de politique passent ; 7 tests XCTest passent
sur iOS 27, dont le catalogue StoreKit, les largeurs WebKit 320–440 points et la
géométrie de la vraie vue SwiftUI (320, 393 et 440 points) après chargement d'une
page synthétique. Le test vérifie l'absence d'espace réservé à l'ancien bandeau.
Ces tests ne certifient ni un achat sandbox complet ni une séance authentifiée.
La compilation Release simulateur est également vérifiée.

Le contrôle visuel et les captures restent à réaliser : les accès à Xcode et
Device Hub par l'outil de contrôle d'interface ont expiré pendant cette session.
Avant distribution, vérifier sur iPhone le lancement, le clavier, la navigation
Analytics → Accueil, la reprise et l'ajout/validation de séries.

## Historique du prototype B0 — 23 septembre 2026

Les sections historiques ci-dessous décrivent les limites des anciens builds ;
leurs mentions d'absence d'achats Apple ne décrivent plus l'implémentation actuelle.

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
  ios/MoovXPrototype/App/AppleSignInPolicy.swift \
  ios/MoovXPrototype/App/RestTimerMessagePolicy.swift \
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
  accès Santé, microphone ou stockage partagé n'est ajouté.
- Le repos peut programmer une notification locale unique à son échéance. La
  première séance demande l'autorisation système pour alertes et sons ;
  aucune notification push, serveur ou mode audio d'arrière-plan n'est utilisé.
  Le pont accepte uniquement un délai fini dans les 30 minutes depuis la page
  principale HTTPS app.moovx.ch. Une prolongation remplace l'alerte, « Passer »
  l'annule, et l'alerte native reste silencieuse si la séance est au premier plan
  (le son web joue alors). Le mode silencieux, Concentration et les réglages iOS
  peuvent empêcher le son. Le build 4 a confirmé sur iPhone physique que le
  diagnostic et le repos réel affichent une notification sonore écran verrouillé.
  Le build 5 retire la cloche et le statut visuel de diagnostic ; le pont et les
  notifications de repos restent inchangés.
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

## Reprise WebKit — 29 septembre 2026

Correctif récupéré et réappliqué sur la base du build 5 (`34e60122`), dans un
worktree permanent, branche `codex/ios-webview-recovery`.

Une interruption hors premier plan attend le retour actif puis recharge la
WKWebView existante (URL et magasin persistant conservés). Une seule tentative
automatique par instance du navigateur ; toute interruption suivante ou au
premier plan affiche Réessayer. Un rappel demande de vérifier les saisies.

Validation locale :
1. Contrat : build Debug simulateur réussi ; aucun changement API/DB.
2. Automatisation : 14 contrôles URL et 7 contrôles du pont repos passent.
3. Runtime : iPhone 17 / iOS 27, page login anonyme chargée ; arrêt ciblé du
   processus WebContent pendant que Réglages est au premier plan, puis retour
   dans MoovX : login rechargé automatiquement avec rappel. Deuxième arrêt
   en arrière-plan : Réessayer affiché. Après relancement de l'app, arrêt
   WebContent au premier plan : Réessayer affiché sans reprise automatique.
4. Sécurité : aucun compte connecté, aucune saisie ni achat ; aucune donnée
   de production modifiée. Aucun build envoyé à TestFlight.

Limites : test par interruption forcée, pas diagnostic de la cause des arrêts
iOS réels. Conservation de session authentifiée et de brouillon de séance à
valider sur appareil physique. Le build 5 distribué reste inchangé.

## Suivi de fiabilité actuel

Voir [le suivi du 29 septembre](../docs/IOS-RELIABILITY-2026-09-29.md) pour le
retour manuel du build 6, les limites des preuves et les parcours restant à
qualifier. La sonde synthétique se relance avec :

```sh
python3 ios/scripts/check-storage.py --device <SIMULATOR_UUID>
```

Elle compile deux builds distincts et vérifie quatre étapes de persistance
sans compte ni connexion au site de production.

## Reprise après arrière-plan — 5 octobre 2026

Le rappel de reprise était permanent : sa présence à plusieurs retours ne
permettait pas de conclure à plusieurs interruptions. Il dispose maintenant
d'un bouton Fermer accessible (FR/EN/DE), sans fermeture automatique ni promesse
de sauvegarde. Il apparaît seulement après la fin de navigation de reprise.

Une reprise réussie réarme la récupération pour une interruption ultérieure en
arrière-plan. Une interruption pendant cette tentative ou au premier plan
conserve l'erreur et le bouton Réessayer, sans boucle automatique. Les traces
OSLog WebRecovery consignent uniquement l'état actif et les étapes de reprise,
sans URL, identité ni contenu. Le magasin WebKit et les brouillons restent inchangés.

Validation : 10 XCTest sur simulateur iOS 27, dont trois nouveaux scénarios
de cycle de vie du coordinateur (callbacks simulés, WKWebView instrumentée).
Ils couvrent trois reprises séparées, l'absence de boucle si la reprise échoue
et le traitement explicite d'une interruption au premier plan. Les tests de
géométrie WebKit et StoreKit existants restent inclus. Ces tests ne déterminent
pas pourquoi iOS a interrompu le processus sur l'iPhone de Marco.
Ce changement natif nécessite un nouveau build TestFlight pour être disponible.

## Apple Watch — première version (5 octobre 2026)

Le compagnon `MoovXWatch` cible watchOS 10+, avec iOS 17+ sur l’iPhone.
L’activation est volontaire depuis une séance ; la préférence sert ensuite aux
séances suivantes. Les séries restent saisies sur l’iPhone. La Watch affiche
la durée, la fréquence cardiaque et les calories actives pendant une session
HealthKit `traditionalStrengthTraining`. Elle est l’unique auteur du workout.

Fermer la fenêtre de séance ne termine pas l’entraînement. Terminer demande
la sauvegarde ; Abandonner demande d’écarter la session non sauvegardée. L’arrêt
reste disponible sur la montre, notamment si la liaison est indisponible.
Une interruption ambiguë ne recrée jamais automatiquement un entraînement.

WatchConnectivity transporte uniquement un identifiant opaque, une action,
sa date et un état. Aucune mesure Santé n’est envoyée au serveur, au coach ou à
l’IA. Les identifiants terminés sont persistés et HealthKit reçoit un
SyncIdentifier stable. Les démarrages de plus de 120 secondes sont rejetés.
L’autorisation d’écriture est vérifiée explicitement ; un refus indique le
chemin Réglages → Santé → Apps → MoovX. La permission est relue au retour actif.

### Validation

- Contrat : iPhone et Watch compilent ; les versions doivent être identiques,
  le compagnon embarqué et ses droits HealthKit présents. Aucun changement DB.
- Automatisation : 14 XCTest natifs passent ; la suite web de 2 412 tests,
  dont les 3 tests du nouveau pont, et TypeScript passent.
- Runtime watchOS 27 simulé : autorisation, démarrage, arrêt manuel, sauvegarde
  et rejeu après relancement. La requête HealthKit limitée à la fixture 113
  retourne exactement un workout, sans erreur ni entraînement encore actif.
- Runtime de la paire dédiée : démarrage envoyé depuis l’iPhone, réveil de la
  Watch, état HealthKit Running, puis finish depuis l’iPhone. La fixture 114
  est enregistrée (saved), sans activeID restant. Le rejeu répété de finish
  et le relancement retournent aussi count=1/queryError=0 dans Santé.
- Sécurité : origine HTTPS/main frame contrôlée dans le pont, UUID obligatoire,
  aucun échantillon de santé transmis au web et sondes absentes du Release.

La recette physique sur Ultra 1/watchOS 26.6 reste à effectuer via TestFlight
avant App Review : autorisation/refus, début/fin depuis la séance réelle,
verrouillage/reprise, déconnexion, arrêt manuel et absence de doublon dans
Fitness. Les mesures du simulateur ne valident pas la précision des capteurs.

### Reproduire les tests

Compiler le simulateur avec `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-`.
Sans signature, les droits HealthKit simulés manquent et la demande d’accès
échoue avant d’ouvrir la fenêtre. Xcode place ces droits simulés dans la section
Mach-O `__TEXT,__entitlements` ; une lecture codesign seule ne suffit pas.

```sh
python3 ios/scripts/check-watch-bundle.py /path/to/MoovXPrototype.app
```

Ce contrôle vérifie versions, identifiant du compagnon et traitement workout
en arrière-plan. La configuration Debug initiale conservait un ancien numéro
iPhone ; elle a été alignée avec la Watch sur 1.0/build 13. Utiliser une paire
simulée connectée, avec les deux composants issus du même build.

Les arguments Debug/simulateur `--watch-workout-probe`, `--watch-start-probe`
et `--watch-finish-probe` utilisent deux fixtures UUID fixes. Le premier teste
la Watch seule, les deux autres le véritable service iPhone. Les vérifications
HealthKit sont limitées à ces fixtures et ne lisent pas l’historique utilisateur.
Les sondes sont exclues du Release.
