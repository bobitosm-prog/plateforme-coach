# iOS — fiabilité, 29 septembre 2026

## Point de reprise

Version distribuée : 0.1.0 (6). Marco indique avoir réalisé le test proposé
(retour d'app/verrouillage) et que cela semble bien fonctionner. Ce retour est
un premier signal positif ; il ne certifie pas séparément tous les parcours
ni la conservation de chaque saisie. Observation en utilisation habituelle.

Les sources iOS sont conservées dans le worktree permanent
`/Users/marcoferreira/.codex/worktrees/moovx-ios-recovery`, branche
`codex/ios-webview-recovery`. Ne pas recréer un chantier uniquement dans `/tmp`.

## Audit actualisé

- Le rapport initial du 23 septembre est historique, pas une liste actuelle
  de défauts. Main contient désormais l'isolation des brouillons de séance
  par propriétaire (PR 38) et la persistance des brouillons nutrition (PR 41).
- La branche iOS n'est pas synchronisée avec tous les changements web de main.
  Le binaire charge le site distant : les fichiers web de cette branche ne
  représentent pas le site de production. Ne pas fusionner cette branche
  entière dans main pour livrer un correctif natif.
- La sonde locale WebKit existante utilise une page synthétique et le même
  magasin `.default()`, mais pas le modèle de brouillon ni l'authentification
  de MoovX. Sa réussite ne prouve pas la reprise d'une vraie séance.

## Lot C1 — contrôle reproductible du stockage

**Tâche :** automatiser la vérification de conservation du stockage WebKit.
**Scope :** sonde existante, script local et rapport ; aucun changement produit.
**Contexte :** contrôle manuel historique, aucune commande unique de régression.
**Logique :** deux builds distincts de `ch.moovx.storageprobe` sur un simulateur
existant ; écrire deux séries fictives puis lire sans réécrire après arrêt,
réinstallation et mise à jour. Chaque lecture doit produire un rapport neuf.
**Validations 4/4 :** compilation des deux builds ; assertions sur mode,
propriété fictive et séries ; exécution réelle des quatre étapes ; isolation
bundle/données, aucun accès de production, arrêt du simulateur démarré par le script.
**Livrable :** `ios/scripts/check-storage.py` et résultats JSON locaux ignorés.
**Contraintes :** aucun secret, compte réel, achat, migration SQL, changement de
session, effacement de l'app utilisateur ni publication de nouveau build.

Commande depuis la racine du worktree :

```sh
python3 ios/scripts/check-storage.py --device <SIMULATOR_UUID>
```

Les journaux de compilation et `results.json` sont dans
`ios/DerivedData/storage-qa/`. Seul le rapport précédent de la sonde est supprimé
pour empêcher un faux succès sur un ancien résultat ; sa valeur stockée n'est
pas effacée entre les lectures. L'app de sonde reste installée pour inspection.

## Résultats C1

Exécution réussie le 29 septembre 2026 sur iPhone 17 simulé / iOS 27 :

| Scénario | Résultat |
|---|---|
| Écriture initiale, build 601 | Présent, 2 séries fictives |
| Arrêt complet puis lecture, build 601 | Présent, 2 séries fictives |
| Réinstallation sans désinstallation, build 601 | Présent, 2 séries fictives |
| Mise à jour sans désinstallation, build 602 | Présent, 2 séries fictives |

Les deux compilations ont réussi, les quatre rapports frais passent les
assertions et le simulateur démarré par le script a été arrêté. Aucune
modification du binaire distribué ni des données utilisateur.

## Contrôles appareil encore ouverts

| Parcours | Preuve attendue |
|---|---|
| Séance réelle après retour d'app | Même séance, même nombre de séries validées, dernière saisie vérifiée |
| Notification de repos sur build 6 | Alerte à échéance, pas de doublon après retour |
| Inscription/retour email/OAuth | Parcours complet à qualifier ; navigation externe encore limitée par le prototype |

Les achats/restaurations, confidentialité et choix d'architecture final restent
des lots distincts avant App Store. Aucun de ces sujets n'est validé par C1.

## Retours nutrition actualisés — 29 septembre

- Caméra et scan déclarés opérationnels par Marco.
- Captures 10:57:33 puis 10:58:19 : sélection conservée en mode avion,
  retour réseau et une seule occurrence visible dans le journal.
- Changement A → B → A déclaré validé : brouillon isolé sur A et retrouvé au retour.

Ces retours clôturent les scénarios nutrition concernés sur appareil ; ils ne
constituent pas une recherche exhaustive de doublons en base. Les preuves web
et les tests de retour d'authentification sont suivis sur main dans
`docs/NUTRITION-OPEN-JOURNAL-2026-09-29.md` et
`docs/IOS-AUTH-RUNTIME-2026-09-29.md` (PR 81).
