# ADR 0004 — Contrats des routes API

- Statut : accepted
- Date : 2026-07-17

## Contexte

Les routes API combinaient souvent parsing HTTP, validation, métier, fournisseur et persistance. Les erreurs et réponses n'avaient pas de contrat commun, ce qui rendait les migrations risquées et l'observabilité hétérogène.

## Décision

Les routes migrées suivent progressivement ces contrats :

- `ApiResponse` définit l'enveloppe commune de succès et d'erreur pour les nouvelles surfaces compatibles ;
- la taxonomie commune fournit les codes, catégories et statuts HTTP stables ;
- le helper Zod transforme une entrée invalide en erreur HTTP bornée sans exposer le payload brut ;
- `route.ts` reste une frontière HTTP mince, `schema.ts` décrit l'entrée lorsqu'elle existe et `service.ts` porte la logique testable ;
- un `x-request-id` valide est propagé, sinon un identifiant est généré côté serveur ; le même identifiant relie réponse et journal ;
- les journaux sont JSON, structurés, bornés et expurgés ; ils distinguent les résultats utiles sans conserver secret, cookie, jeton, e-mail, body brut ou stack complète.

La migration reste compatible : lorsqu'un consommateur dépend d'une forme legacy, la route conserve cette forme et ses statuts tout en adoptant la séparation route/service/schema et l'observabilité. Le contrat commun ne justifie pas une rupture silencieuse.

## Conséquences

- Une nouvelle route doit valider son entrée, mapper ses erreurs et tester séparément ses frontières pertinentes.
- Les huit routes simples déjà migrées servent de référence d'intégration, pas de preuve que toutes les routes du dépôt sont conformes.
- Un échec critique produit au plus un événement structuré utile par requête dans ce contrat.
- Toute évolution d'une forme publique exige un plan de compatibilité et des tests consommateurs.

## Limites et dette restante

- De nombreuses routes, notamment les flux complexes Stripe, invitation, push et IA, n'ont pas encore été migrées vers cette structure commune.
- Toutes les réponses legacy ne contiennent pas encore une enveloppe `ApiResponse` dans le corps ; l'en-tête de corrélation reste la frontière compatible.
- La collecte centralisée, les métriques et les alertes ne sont pas définies par cet ADR.

## Références

- [Contrat de réponse API](../API_RESPONSE_CONTRACT.md)
- [Taxonomie d'erreurs](../API_ERROR_TAXONOMY.md)
- [Validation API](../API_VALIDATION.md)
- [Migration des routes simples](../API_SIMPLE_ROUTE_MIGRATION.md)
- [Observabilité API](../API_OBSERVABILITY.md)
