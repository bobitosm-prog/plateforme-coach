# Catalogue Athena — tests StoreKit locaux

## Périmètre

`AthenaCatalog.load()` charge les produits Apple dans l'ordre mensuel, annuel,
à vie. Les prix affichables sont `Product.displayPrice`, jamais des constantes
CHF dans le code de l'application. Le catalogue rejette un résultat incomplet,
un mauvais type ou une mauvaise période, des groupes différents et une offre
introductive. La politique reste : 14 jours MoovX sans engagement, puis achat
Apple explicite. L'initialisation de l'essai serveur est inchangée.

La fixture `Athena.storekit` contient les trois identifiants App Store Connect,
10 CHF/mois, 80 CHF/an, 150 CHF à vie, même groupe/niveau pour les abonnements,
aucun partage familial ni offre introductive. Elle est embarquée uniquement dans
la cible de tests, pas dans l'application ou une archive de distribution.

## Exécution

Depuis la racine du dépôt, avec un simulateur iPhone disponible :

```sh
xcodebuild -project ios/MoovXPrototype/MoovXPrototype.xcodeproj \
  -scheme MoovXStoreKitTests -configuration Debug \
  -destination 'platform=iOS Simulator,name=MoovX Recovery QA' \
  -derivedDataPath /tmp/moovx-storekit-derived test
```

Les tests utilisent réellement `Product.products(for:)` et `SKTestSession` :
chargement/prix/devise sans transaction, refus de réponse partielle et reprise
après erreur réseau simulée. Ils ne contactent pas le catalogue commercial et
ne prouvent pas que les produits sont disponibles dans TestFlight.

## Suite nécessaire

Ce lot ne branche pas encore un bouton d'achat et n'accorde aucun droit.
La vérification serveur et la séparation des droits Apple/Stripe doivent
précéder l'activation du parcours d'achat, restauration et notifications.
Les contrats et produits Apple doivent ensuite être validés en sandbox réel.

Situation administrative constatée le 29 septembre 2026 : contrat payant accepté,
banque en traitement, DSA en vérification. W-8BEN en attente de correction de la
nationalité verrouillée ; demande envoyée par Marco à Apple Finance.

## Sources

- https://developer.apple.com/documentation/storekit/product/products(for:)
- https://developer.apple.com/documentation/storekittest/sktestsession
- https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode

## Validation du 29 septembre 2026 — 4/4 pour ce sous-lot

1. Runtime StoreKit : 3 tests XCTest réussis sur MoovX Recovery QA, iOS 27.
2. Régression native : 33 assertions navigation, minuteur et connexion Apple réussies.
3. Build iPhone Release sans signature réussi (compilation uniquement, aucune installation).
4. Isolation : aucune fixture `.storekit` ni bundle `.xctest` dans le bundle Release ;
   aucun appel d'achat, endpoint, changement DB ou modification des droits existants.

Ces validations portent sur le catalogue, pas sur un paiement de bout en bout.
La destination générique iOS de Xcode 27 a refusé ce projet ; le build Release a
utilisé la destination iPhone disponible, sans exécuter ni installer le binaire.
