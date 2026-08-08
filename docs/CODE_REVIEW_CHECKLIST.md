# Code Review Checklist

Cette checklist complète le [guide de contribution](CONTRIBUTING.md). Les
contrats détaillés restent définis par la [stratégie de
tests](TESTING_STRATEGY.md), la [procédure de
release](RELEASE_PROCEDURE.md), la [procédure de
rollback](ROLLBACK_PROCEDURE.md) et les [ADR](adr/README.md).

## Règles d'utilisation

- L'auteur effectue une self-review avant de demander une revue.
- Le reviewer vérifie les preuves indépendamment de l'auteur.
- Toute case `N/A` comporte une justification explicite.
- La profondeur des preuves reste proportionnée au risque et au périmètre.
- Cette checklist ne remplace pas les quality gates CI.

## 1. Périmètre et intention

- [ ] Le changement répond au besoin annoncé et reste limité à son périmètre.
- [ ] Aucun fichier, refactoring ou comportement opportuniste n'est inclus.
- [ ] Le comportement attendu, les compromis et la dette résiduelle sont identifiables.

## 2. Architecture

- [ ] Les frontières de domaine et les contrats frontend/API/service/repository sont cohérents.
- [ ] Les patterns existants sont réutilisés sans duplication ou abstraction prématurée.
- [ ] Les conventions et ADR concernés sont respectés ou leur évolution est documentée.

## 3. Sécurité et autorisation

- [ ] L'identité et l'autorisation sont vérifiées côté serveur; le frontend ne fait pas autorité.
- [ ] La RLS reste une frontière obligatoire et `service_role` est limité au strict besoin serveur.
- [ ] Les entrées sont validées, le rate limit est appliqué lorsque pertinent et les erreurs sont expurgées.

## 4. Données / Supabase / migrations

- [ ] La migration est additive et compatible lorsque possible; aucun historique partagé n'est réécrit.
- [ ] Types Supabase, contraintes, index, grants et policies correspondent au schéma attendu.
- [ ] Les données existantes, l'idempotence et la stratégie de rollback ou compensation sont couvertes.

## 5. Secrets et confidentialité

- [ ] Aucun secret, credential, cookie, jeton ou URL signée n'est persisté dans le code, les tests, les logs ou les preuves.
- [ ] Les données personnelles et payloads sensibles sont absents des journaux ou strictement expurgés.

## 6. Tests

- [ ] Les tests ciblés protègent le comportement, les régressions et les cas d'erreur pertinents.
- [ ] Idempotence, replay, concurrence et reprise sont couverts lorsque le risque le requiert.
- [ ] Les validations runtime/E2E sont proportionnées au changement; les tests réellement exécutés et leurs résultats sont fournis.

## 7. UI / UX

Lorsque concerné :

- [ ] Responsive, accessibilité, i18n et hiérarchie visuelle sont préservés.
- [ ] Les états loading, error et empty sont explicites et utilisables.
- [ ] La relecture visuelle ne révèle aucune régression évidente.

## 8. Performance

Lorsque concerné :

- [ ] Aucun rendu, chargement ou appel réseau inutile n'est introduit.
- [ ] Cache, invalidation et budgets restent cohérents; l'impact critique est mesuré.

## 9. Exploitation

Lorsque concerné :

- [ ] L'observabilité produit des erreurs exploitables sans donnée sensible.
- [ ] Procédure de release, compatibilité d'environnement et rollback sont connus et vérifiables.

## 10. Documentation et Git

- [ ] Les documents et commentaires utiles reflètent tout contrat modifié.
- [ ] Le commit est focalisé, lisible et exempt de secret, fichier temporaire ou changement hors scope.
- [ ] Le statut Git, le diff indexé et `git diff --check` concordent avec les preuves annoncées.

## Résumé reviewer

- **Verdict :** `APPROVE` / `REQUEST_CHANGES` / `BLOCKED`
- **Risques résiduels :**
- **Preuves principales :**
- **Cases `N/A` et justifications :**
