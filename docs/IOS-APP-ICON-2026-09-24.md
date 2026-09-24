# Icône iOS MoovX — 24 septembre 2026

L'icône web canonique `public/icon-512x512.png` est reprise pour le prototype
iPhone. Elle a été agrandie mécaniquement en 1024 × 1024 et aplatie sur son
fond sombre pour fournir un PNG sans canal alpha. Le projet utilise désormais
un catalogue d'assets `AppIcon`.

Validation : catalogue JSON lisible, image 1024 × 1024 RGB, build simulateur
réussi, `CFBundleIcons` et `AppIcon` présents dans le paquet, build signé pour
l'iPhone physique réussi, vérification de signature stricte, installation et
lancement confirmés. Marco confirme voir l'icône noire et dorée sur l'écran
d'accueil de son iPhone et que l'app s'ouvre normalement après installation.

Cette image est suffisante comme candidat de test interne. La source disponible
mesure 512 × 512 ; une source graphique native 1024 × 1024 serait préférable
avant distribution. Le présent lot ne change ni la connexion, ni les données,
ni les autorisations de l'application.

Référence : https://developer.apple.com/documentation/xcode/configuring-your-app-icon
