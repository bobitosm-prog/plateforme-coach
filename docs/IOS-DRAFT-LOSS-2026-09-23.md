# Diagnostic — brouillon absent dans le prototype iOS

## Incident observé

Le compte de test a repris Full Body C à 0/15 puis 1/15 séries après arrêt et
relancement. Les captures montraient ensuite 2/15. Après d'autres manipulations
et une réinstallation du prototype, l'écran proposait une nouvelle séance.
L'historique visible ne montrait que des séances du 19 septembre : cela ne
constitue pas une lecture exhaustive de la base. Aucune finalisation, suppression
ou récupération de séance n'a été effectuée pendant ce diagnostic.

La table localStorage du conteneur WebKit inspecté était vide. Une lecture SQLite
sur disque ne prouve pas le contenu en mémoire à l'instant de l'incident ni la
cause de disparition. Ne pas conclure que la réinstallation a effacé la séance.

## Expériences synthétiques

### Modèle de brouillon web : perte inter-utilisateurs reproduite

`training-draft-loss-characterization.test.ts` écrit un brouillon fictif A avec
deux séries validées, puis appelle `readActiveWorkoutDraft` comme B et enfin A.
B ne reçoit pas les données de A (isolation de lecture), mais la lecture B
supprime la clé partagée. A ne retrouve plus son brouillon.

Cause de ce scénario : `moovx_training_session_v2` est une clé commune ;
`isDraft` mélange propriété, version, structure et expiration. Tout rejet d'un
JSON non nul déclenche sa suppression. Ce test documente un comportement
indésirable existant, PAS un invariant à préserver dans le futur correctif.
Il ne prouve pas qu'une lecture avec le mauvais utilisateur s'est produite
pendant l'incident : aucun journal causal ne permet de l'affirmer ici.

### Stockage WebKit après arrêt/réinstallation : conservé dans le témoin

Application **distincte** `ch.moovx.storageprobe`, compilée avec `STORAGE_PROBE`.
Page HTML synthétique locale avec base HTTPS `storage-probe.invalid`, aucun
accès réseau, cookie ou compte de production. Même `.default()` WebKit que le
prototype. Clé `moovx_synthetic_storage_probe`, deux séries fictives.

| Étape | Résultat |
|---|---|
| Écriture puis lecture immédiate | Présent, 2 séries |
| Arrêt complet puis lancement en lecture seule | Présent, 2 séries |
| Réinstallation de la même version, sans désinstallation | Présent, 2 séries |
| Installation du build 2, sans désinstallation, puis lecture | Présent, 2 séries |

Dernier rapport natif : build `2`, `found: true`, `completedSets: 2`,
`recordedAt: 2026-09-23T12:05:34Z`. Les UUID des conteneurs ont changé lors des
installations, sans perte de la valeur synthétique. La sonde a été arrêtée puis
désinstallée ; seules ses données synthétiques ont été retirées. Le code permet
de les recréer. Le prototype utilisateur n'a pas été désinstallé.
Limites : ce témoin n'exécute pas le code de MoovX, les transitions de comptes,
une désinstallation, une purge système, ou un arrêt immédiatement après écriture.

## Conclusion et correctif à spécifier

La cause historique reste **indéterminée**. Deux choses sont établies : le témoin
WebKit conserve sa valeur lors des réinstallations testées, et la lecture d'un
brouillon avec un autre utilisateur supprime celui du propriétaire dans le code.

Correction recommandée : clés par propriétaire, migration de la clé historique
uniquement pour son propriétaire vérifié, absence de suppression lors d'une
simple lecture par un autre compte. Encadrer aussi les écritures/suppressions
pour qu'un composant d'un ancien compte ne puisse pas écraser un brouillon récent.
Prévoir une indication explicite d'expiration/échec de stockage et des tests
A→B→A, changement de compte avec callbacks tardifs, quota, arrêt et réinstallation.
Ne pas ajouter une copie native ou un brouillon serveur sans spécifier leur
autorité, confidentialité et suppression : ce serait une évolution distincte.

## Reproduire la sonde (simulateur uniquement)

```sh
xcodebuild -project ios/MoovXPrototype/MoovXPrototype.xcodeproj \
  -scheme MoovXPrototype -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /private/tmp/moovx-storage-probe-build \
  PRODUCT_BUNDLE_IDENTIFIER=ch.moovx.storageprobe \
  SWIFT_ACTIVE_COMPILATION_CONDITIONS=STORAGE_PROBE build
```

Installer ce binaire distinct avec simctl. Lancer une fois avec `--write`, puis
sans cet argument pour toutes les lectures. Le rapport synthétique est dans
Documents/storage-probe-result.json du conteneur retourné par get_app_container.
Le code de sonde est exclu de la compilation normale ; aucune modification de
la gestion de brouillon en production n'est livrée par ce diagnostic.
