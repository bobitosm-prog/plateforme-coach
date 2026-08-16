# Proposition de roadmap suivant la Phase 9

## Statut

Cette roadmap est **préparée mais non activée**. La capture initiale au SHA
`25c7426` est conservée dans la baseline; sa réconciliation au SHA `554575c`
classe désormais la Phase 9
`PHASE_9_COMPLETE_WITH_MONITORING_PENDING`. Les travaux structurels CI et
Training sont terminés. Les deux suivis P0 ci-dessous restent ouverts sans être
déclarés accomplis : fenêtre statistique CI et validation Training sur corpus
organique staging.

Les estimations correspondent à du travail concentré pour une personne assistée
par l'IA et devront être recalibrées après l'audit terrain de chaque tâche.

## P0 — Critique

| Tâche | Objectif et raison | Estimation | Risque | Dépendances | Critère de sortie |
|---|---|---:|---|---|---|
| Valider le serving Training sur corpus organique staging | Dès qu'au moins un template non-fixture apparaît organiquement, exécuter l'assessment read-only existant sans nouvelle donnée ni corrélation métier. Le rollout technique et son rollback sont déjà validés; l'état runtime final reste `legacy-only`. | Observation conditionnelle | Faible | Corpus organique staging disponible, runner et télémétrie expurgée existants | Trois parcours complets conformes, `REAL_CORPUS_VALIDATION_PENDING` levé uniquement par preuve réussie; toute promotion Production reste interdite et exige un contrat séparé. |
| [Attester la stabilité CI](CI_STABILITY_STATISTICAL_CONTRACT.md) | Faire progresser le registre append-only actuellement à `1/150` runs primaires et `1/7` jours UTC, sans retry masquant. La collecte automatique est déjà opérationnelle. | Observation multi-runs | Moyen | Gates A/B/C1/C2 inchangés, artefacts importables et revue append-only | Au moins 150 runs primaires complets sur 7 dates UTC distinctes, p95 nearest-rank <20 min, flaky rate des premiers résultats <2 %, zéro échec non résolu, échecs et reruns même SHA correctement classifiés. |

## P1 — Haute

| Tâche | Objectif et raison | Estimation | Risque | Dépendances | Critère de sortie |
|---|---|---:|---|---|---|
| Réintégrer les tests React serveur `.test.tsx` | Rendre la suite standard exhaustive et qualifier la dette six skeletons contre sept sans modifier arbitrairement le contrat. | 1–1,5 j | Moyen | Audit du glob Vitest et caractérisation des composants serveur | Tous les `.test.tsx` attendus sont découverts par une commande canonique, la divergence est expliquée ou corrigée, suite complète verte. |
| Étendre l'observabilité serveur et performance | Généraliser une corrélation locale expurgée et bornée sur les chemins coûteux pour distinguer temps serveur, DB et overhead. | 2–4 j | Faible | Contrats d'observabilité, fixtures locales, métriques PostgreSQL | Request IDs et durées corrélés sans secret, ressources échantillonnées sans daemon résiduel, rapport reproductible sur au moins un parcours supplémentaire. |

## P2 — Moyenne

| Tâche | Objectif et raison | Estimation | Risque | Dépendances | Critère de sortie |
|---|---|---:|---|---|---|
| Auditer l'accessibilité de `Modal` et `ConfirmDialog` | Vérifier les composants maison après retrait des dépendances Radix inutilisées. | 2–3 j | Moyen | Inventaire des dialogs et tests UI adaptés | Navigation clavier, focus initial/restauré, fermeture, annonces et rôles accessibles couverts sans régression visuelle. |
| Migrer la taxonomie d'erreurs API legacy | Déterminer puis retirer le mapping `LEGACY_TEST_ONLY_KEEP` seulement quand aucun contrat réseau ou rollback n'en dépend. | 1–2 j | Moyen | Inventaire routes/clients, contrat API et fenêtre de compatibilité | Zéro producteur/consommateur legacy démontré, tests canoniques conservés, mapping supprimé sans perte contractuelle. |
| Remplacer le fallback Seedance local | Fournir un parcours local canonique avant de retirer `SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED`. | 1–3 j après décision de stockage | Moyen | Stockage de référence local, tests Seedance, gardes d'origine | Tests positifs migrés, fallback absent, Production et origines distantes toujours refusées, aucune régression locale. |
| Observer le cutover GitHub Actions Node 24 | Les actions v7 sont versionnées sans réinitialiser la fenêtre statistique ; qualifier leur premier run complet. | Monitoring | Faible | Premier push portant le cutover, artefact CI Stability | Warning Node 20 absent, commandes et sécurité des Gates A/B/C inchangées, run complet vert et observation importable. |

## P3 — Faible

| Tâche | Objectif et raison | Estimation | Risque | Dépendances | Critère de sortie |
|---|---|---:|---|---|---|
| Réévaluer les index Nutrition sur nouvelle preuve | Éviter un index spéculatif : les scans actuels ne produisent aucun `DB_SCAN_SIGNAL`. | Conditionnel, 1–2 j si déclenché | Moyen | Dataset plus représentatif ou dégradation reproductible | Signal mesuré avant/après, plan et coût comparés, index idempotent seulement si le gain et le coût d'écriture sont démontrés. |

## Contraintes transverses

- aucun résultat local ne vaut validation staging ou Production ;
- aucun secret fournisseur réel dans les tests, métriques ou artefacts ;
- RLS et authentification serveur restent obligatoires ;
- chaque changement est isolé, réversible et validé au runtime avant commit ;
- aucune suppression legacy ou optimisation d'index sans preuve d'usage ou de
  performance.
- aucun rollout Training Production n'est autorisé par la validation technique
  staging; il exige une décision et un contrat de release séparés.

La [baseline finale Phase 9](PHASE_9_FINAL_BASELINE.md) constitue l'entrée de
référence de cette proposition.
