# Proposition de roadmap suivant la Phase 9

## Statut

Cette roadmap est **préparée mais non activée** au SHA `25c7426`. La Phase 9
reste active avec le verdict `PHASE9_NOT_READY_TO_CLOSE`. Les deux P0 déjà
ouverts — stabilité CI et migration runtime Training — ne sont ni fermés ni
reportés implicitement par ce document.

Les estimations correspondent à du travail concentré pour une personne assistée
par l'IA et devront être recalibrées après l'audit terrain de chaque tâche.

## P0 — Critique

| Tâche | Objectif et raison | Estimation | Risque | Dépendances | Critère de sortie |
|---|---|---:|---|---|---|
| Achever la migration runtime Training canonique | Brancher progressivement le modèle et les adaptateurs déjà prêts sans casser les formats encore actifs. L'impact métier est critique et aucun producteur/consommateur canonique runtime n'existe aujourd'hui. | 7–10 j | Élevé | Modèle canonique, adaptateurs, repositories Training, fixtures et rollback | Entrées validées, double lecture comparée, persistance additive si nécessaire, consommateurs basculés un par un, observation et rollback prouvés, absence de trafic legacy démontrée avant suppression. |
| Attester la stabilité CI | Transformer `CI_STABILITY_CANDIDATE` en preuve statistique sans retry masquant. | Observation multi-runs | Moyen | Gates A/B/C1/C2 inchangés et collecte de durées fiable | Échantillon suffisant et documenté, p95 complet <20 min, flaky rate <2 %, échecs et reruns même SHA correctement classifiés. |

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
| Qualifier les actions GitHub et le warning Node 20 | Traiter la dette de compatibilité des actions v4 dans un sous-batch isolé. | 0,5–1 j | Faible | Matrice de compatibilité GitHub Actions et contrats CI | Warning éliminé ou décision documentée, commandes et sécurité des Gates A/B/C fonctionnellement inchangées, run complet vert. |

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

La [baseline finale Phase 9](PHASE_9_FINAL_BASELINE.md) constitue l'entrée de
référence de cette proposition.
