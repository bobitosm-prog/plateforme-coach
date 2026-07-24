# Architecture Decision Records — MoovX

Ce répertoire conserve les décisions techniques structurantes de MoovX. Un ADR décrit une décision dans son contexte, ses conséquences et ses limites ; il ne remplace ni la documentation d'utilisation ni la roadmap.

## Statuts

- `proposed` : décision soumise à discussion, pas encore applicable comme règle du dépôt ;
- `accepted` : décision adoptée et reflétée par l'état courant du dépôt ;
- `superseded` : décision remplacée ; l'ADR reste conservé et pointe vers son successeur.

Un ADR accepté n'est pas réécrit pour masquer l'historique. Une évolution substantielle crée un nouvel ADR et marque l'ancien `superseded`.

## Numérotation et nommage

Les ADR utilisent un numéro séquentiel sur quatre chiffres et un nom descriptif en kebab-case : `NNNN-sujet.md`. Le prochain numéro est déterminé par le plus grand numéro déjà versionné, sans réutiliser un numéro supprimé.

## Quand créer un ADR

Créer un ADR lorsqu'une décision :

- fixe une frontière d'autorité, de sécurité ou de données ;
- introduit un contrat partagé entre plusieurs domaines ;
- choisit une stratégie de migration, compatibilité ou rollback ;
- engage durablement les tests, l'exploitation ou l'architecture ;
- présente des alternatives raisonnables dont le rejet doit rester explicable.

Une correction locale, un renommage ou un détail d'implémentation réversible ne nécessite généralement pas d'ADR.

## Format

```markdown
# ADR NNNN — Titre

- Statut : proposed | accepted | superseded par ADR NNNN
- Date : AAAA-MM-JJ

## Contexte

## Décision

## Conséquences

## Limites et dette restante

## Références
```

Les affirmations doivent être vérifiables dans le code ou dans une documentation versionnée. Une propriété souhaitée mais non démontrée est présentée comme une limite ou une cible.

## Index

- [ADR 0001 — Baseline de sécurité de la Phase 1](0001-phase-1-security-baseline.md)
- [ADR 0002 — Frontières E2E locales](0002-local-e2e-boundaries.md)
- [ADR 0003 — Frontières d'accès Supabase](0003-supabase-access-boundaries.md)
- [ADR 0004 — Contrats des routes API](0004-api-route-contracts.md)
- [ADR 0005 — Séparer contrat financier et accès produit dans Billing](0005-billing-domain-model.md)
- [ADR 0006 — Stockage et CDN des médias](0006-media-storage-cdn.md)
- [ADR 0007 — Contrat de persistance des plans Nutrition](0007-nutrition-plan-persistence-contract.md)
