# ADR 0001 — Baseline de sécurité de la Phase 1

- Statut : accepted
- Date : 2026-07-17

## Contexte

La Phase 1 devait stabiliser les flux externes critiques avant les refactorings de domaines. Les risques concernaient l'association coach/client, les identités de paiement, le rejeu Stripe, les notifications, le rendu du chat et la capacité à revenir en arrière sans restaurer une vulnérabilité.

## Décision

La baseline de sécurité suivante est obligatoire :

- une invitation coach est vérifiée côté serveur, liée au coach attendu, expirante et consommable une seule fois ;
- l'ancien flux direct `assign-coach` est supprimé : une relation provient d'une invitation vérifiée ou d'un flux serveur explicitement autorisé, notamment l'affectation du coach par défaut ;
- les checkouts plateforme et coach dérivent l'utilisateur, le coach et la relation depuis l'identité serveur ; les identifiants fournis par le navigateur ne font pas autorité ;
- les webhooks Stripe sont signés et dédupliqués afin qu'un rejeu du même événement n'entraîne pas une seconde mutation métier ;
- une notification push coach vers client exige une relation active et son URL applicative doit être un chemin interne autorisé ;
- le contenu du chat est rendu sans injection HTML : le HTML brut n'est pas une entrée de confiance et le rollback sûr reste le texte brut ;
- les rejets critiques produisent des journaux structurés et expurgés avec des codes de raison stables ;
- le rollback est applicatif et vers l'avant : restaurer un flux vulnérable ou annuler globalement les migrations de sécurité est interdit.

Les parcours locaux invitation, checkout plateforme, checkout coach, push et chat caractérisent ces frontières critiques.

## Conséquences

- Les opérations sensibles ont une autorité serveur explicite.
- Les tests doivent utiliser Supabase et des fournisseurs locaux, jamais la production.
- Une modification de ces flux requiert les tests unitaires/SQL concernés et le parcours E2E local correspondant.
- Une régression doit être corrigée par désactivation ciblée, rollback applicatif sûr ou migration corrective additive.

## Limites et dette restante

- La déduplication couvre les événements Stripe supportés ; elle ne constitue pas encore le domaine Billing ni une réconciliation Stripe/base complète.
- Les cinq parcours Chromium locaux ne certifient ni les infrastructures ni les fournisseurs réels.
- Les politiques RLS et matrices doivent continuer à évoluer lorsqu'une nouvelle table ou capacité sensible est ajoutée.

## Références

- [Contrat d'invitation coach](../COACH_INVITATION_CONTRACT.md)
- [Affectation du coach par défaut](../DEFAULT_COACH_ASSIGNMENT.md)
- [Matrice de tests RLS](../RLS_TEST_MATRIX.md)
- [Rollback de Phase 1](../PHASE_1_ROLLBACK.md)
- [Stratégie de tests](../TESTING_STRATEGY.md)
