# Registre des modèles et coûts IA

> État vérifié le 20 juillet 2026. Le registre décrit les modèles connus par
> MoovX sans modifier les modèles effectivement appelés par les 15 flux IA.

## Responsabilité

Le module pur [`lib/ai/models`](../lib/ai/models/) centralise les identifiants,
capacités, limites et tarifs connus. Il sert à la résolution explicite, à
l'observabilité et aux estimations internes. Il ne décide ni de l'autorité, ni
des quotas, ni de la facturation client, et ne choisit jamais un modèle de
remplacement.

Le registre ne dépend pas de React, Next.js, Supabase, du SDK Anthropic, du
navigateur ou de `app/`. Aucun flux runtime n'est encore migré vers lui.

## Modèles enregistrés

| Identifiant logique MoovX | Identifiant fournisseur exact | Statut | Usages observés |
|---|---|---|---|
| `anthropic-haiku-4.5` | `claude-haiku-4-5-20251001` | `active` | recette, alternative et instructions d'exercice, programme coach legacy, surcharge |
| `anthropic-sonnet-4.6` | `claude-sonnet-4-6` | `active` | Athena, adaptation de séance, analyse de repas photographié |
| `anthropic-opus-4.8` | `claude-opus-4-8` | `active` | génération Training, régénération, plan Nutrition, diagnostic, analyses corporelle et photo |
| `anthropic-opus-4.7-legacy` | `claude-opus-4-7` | `legacy` | script opérationnel hors runtime uniquement |

La garde statique recense les littéraux de modèle dans `app/api` et `lib`, puis
échoue si un identifiant runtime n'est pas enregistré. Les trois identifiants
runtime restent inchangés. Opus 4.7 est volontairement séparé : sa proximité
nominale avec Opus 4.8 ne constitue ni un alias ni un fallback.

## Capacités et limites

Les quatre entrées déclarent les capacités texte, image, outil et JSON comme
supportées d'après la documentation officielle. Le streaming reste `unknown` :
MoovX ne possède actuellement aucun appel SDK Anthropic streaming et le
registre ne déduit pas une capacité depuis les SSE applicatifs.

| Modèle | Entrée maximale connue | Sortie maximale connue |
|---|---:|---:|
| Haiku 4.5 | 200 000 tokens | 64 000 tokens |
| Sonnet 4.6 | 1 000 000 tokens | 128 000 tokens |
| Opus 4.8 | 1 000 000 tokens | 128 000 tokens |
| Opus 4.7 legacy | 1 000 000 tokens | `null` |

Une capacité ou limite non démontrée reste `unknown` ou `null`; elle n'est pas
héritée d'un modèle voisin.

### Paramètres runtime audités

Le registre décrit les limites fournisseur connues; il ne remplace pas les
budgets `max_tokens` propres aux appels existants. Les 14 expressions runtime
conservent les valeurs suivantes :

| Modèle | Frontière | `max_tokens` / `maxTokens` |
|---|---|---:|
| Haiku 4.5 | recette | 1 500 |
| Haiku 4.5 | suggestion d'exercice | 500 |
| Haiku 4.5 | instructions d'exercice | 500 |
| Haiku 4.5 | programme coach legacy | 3 000 |
| Haiku 4.5 | surcharge progressive | 300 |
| Sonnet 4.6 | Athena | 1 024 |
| Sonnet 4.6 | adaptation de séance | 800 |
| Sonnet 4.6 | analyse de repas photographié | 1 000 |
| Opus 4.8 | service programme Training partagé par route et cron | 8 000 |
| Opus 4.8 | génération quotidienne Nutrition, répétée sept fois | 1 500 |
| Opus 4.8 | diagnostic hebdomadaire partagé par route et cron | 2 048 |
| Opus 4.8 | analyse corporelle | 1 024 |
| Opus 4.8 | évaluation de photos de progression | 2 048 |
| Opus 4.8 | comparaison de photos de progression | 1 024 |

Le script opérationnel hors runtime demande 16 000 tokens à Opus 4.7. Les
mocks emploient aussi des identifiants synthétiques (`claude-test`,
`synthetic-model`) : ils testent les transports et ne sont pas des modèles
MoovX enregistrables.

## Tarifs vérifiés

Source unique : [tarification officielle Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), recoupée avec la [vue officielle des modèles](https://platform.claude.com/docs/en/about-claude/models/overview), le 20 juillet 2026. Les montants sont en dollars américains par million de tokens.

| Modèle | Entrée | Sortie | Cache lecture | Cache écriture 5 min | Cache écriture 1 h | Batch entrée | Batch sortie |
|---|---:|---:|---:|---:|---:|---:|---:|
| Haiku 4.5 | $1 | $5 | $0.10 | $1.25 | $2 | $0.50 | $2.50 |
| Sonnet 4.6 | $3 | $15 | $0.30 | $3.75 | $6 | $1.50 | $7.50 |
| Opus 4.8 | $5 | $25 | $0.50 | $6.25 | $10 | $2.50 | $12.50 |
| Opus 4.7 legacy | $5 | $25 | $0.50 | $6.25 | $10 | $2.50 | $12.50 |

La source officielle ne fournit pas, dans les éléments vérifiés, une date
d'effet exacte exploitable : `effectiveFrom` reste donc `null`. Les catégories
`tool` et `image` restent également sans tarif séparé (`null`). Le calculateur
ne les assimile pas silencieusement aux tokens d'entrée.

Chaque tarification stocke sa source, `verifiedAt`, son unité et son état
`verified` ou `unknown`. L'appelant choisit explicitement l'ancienneté maximale
acceptable via une horloge injectée. Une source trop ancienne rend
l'estimation `unavailable`, jamais exacte par défaut.

## API publique

Le point d'import est `lib/ai/models/index.ts` :

- `listAiModels()` retourne le registre immuable ;
- `getAiModel(logicalId)` résout uniquement un identifiant logique ;
- `resolveAiModel(identifier)` accepte un identifiant logique ou fournisseur
  exact et indique lequel a correspondu ;
- `getAiModelCapability(identifier, capability)` retourne l'état explicite ou
  `null` pour un modèle inconnu ;
- `createAiModelRegistry(entries)` refuse les entrées invalides et les doublons
  d'identifiant logique ou fournisseur ;
- `validateAiUsage(usage)` valide des compteurs `number` sûrs ou `bigint` ;
- `estimateAiCost(options)` calcule une estimation discriminée ;
- `validatePriceFreshness(...)` vérifie une tarification avec l'horloge fournie.

La résolution ne contient aucun alias implicite, fallback ou remplacement
automatique. `recommendedReplacement` reste `null` pour chaque entrée, car
aucune décision de remplacement n'est établie dans le dépôt.

## Calcul monétaire

Les tarifs sont stockés en micros USD entiers par million de tokens. Les
volumes et produits utilisent `bigint`; aucune multiplication monétaire en
virgule flottante n'intervient. `AiExactMoney` expose :

- `wholeMicros`, la partie entière en micros ;
- `subMicroNumerator / subMicroDenominator`, le reliquat exact inférieur à un
  micro ;
- la devise explicite.

Cette représentation conserve aussi bien un seul token de cache qu'un volume
supérieur à la plage des entiers JavaScript sûrs. L'affichage et l'arrondi sont
la responsabilité d'une future frontière de présentation.

## Résultats d'estimation

| État | Signification |
|---|---|
| `complete` | toutes les catégories demandées ont un tarif vérifié et frais |
| `partial` | certaines catégories sont calculées, d'autres restent explicitement indisponibles |
| `unavailable` | aucun coût fiable ne peut être calculé, ou le tarif est inconnu/périmé |
| `invalid` | modèle, usage, horloge, monnaie ou unité invalide/incompatible |

Les catégories entrée, sortie, cache, batch, outil et image restent séparées.
Zéro est une valeur valide; absence n'est pas transformée en zéro. Sont
refusés : nombres négatifs, fractionnaires, non finis, `number` non sûr,
registre inconnu, devise différente et unité différente. Les résultats et
erreurs ne contiennent aucun prompt, secret ou contenu utilisateur.

## Limites et migration future

- Les 15 flux conservent leurs littéraux, paramètres `max_tokens` et transports
  historiques; le registre n'est encore qu'une frontière commune disponible.
- Seul le diagnostic hebdomadaire exploite actuellement les compteurs de
  tokens fournisseur; aucune estimation de coût runtime n'est branchée.
- Les tarifs doivent être revérifiés avant expiration de la durée choisie par
  l'appelant; le registre n'effectue aucun accès réseau.
- Les tarifs séparés outil/image et la sortie maximale Opus 4.7 restent
  inconnus.
- Aucun coût ne doit être utilisé comme montant facturé au client.

La [frontière d'usage IA](AI_USAGE_QUOTAS.md) réutilise `estimateAiCost()` pour
produire et persister un coût technique en micros USD lorsque modèle et tokens
sont connus. Une absence de tokens reste `unavailable`, jamais zéro inventé.

La prochaine étape de la roadmap est de migrer Chat, Recipes et Suggest
Exercise vers l'interface provider commune.

## Références

- [Inventaire des prompts, modèles et sorties](AI_PROMPTS_MODELS_OUTPUTS_INVENTORY.md)
- [Interface commune du provider IA](AI_PROVIDER_INTERFACE.md)
- [Politique commune de résilience](AI_RESILIENCE_POLICY.md)
- [Quotas et journalisation d'usage](AI_USAGE_QUOTAS.md)
