# Golden fixtures IA

## Portée

Les fixtures sous [`tests/fixtures/ai-golden`](../tests/fixtures/ai-golden) figent les **15 points d'entrée IA runtime** inventoriés. Elles ne remplacent ni les schémas Zod ni les tests de route : elles rendent explicites l'entrée synthétique, le modèle logique et fournisseur, la politique de quota, la surface HTTP/SSE/cron, le mode de sortie et les formes publiques succès/échec/invalide.

| Domaine | Points d'entrée | Contrats d'invocation |
|---|---:|---:|
| Chat | 1 | 1 |
| Nutrition | 3 | 3 |
| Training | 7 | 6 |
| Progression | 2 | 2 |
| Diagnostic | 2 | 1 |
| **Total** | **15** | **13** |

La route Training moderne et son cron partagent volontairement un contrat. Le diagnostic manuel et son cron partagent également un contrat. Ils restent deux points d'entrée distincts dans le manifeste afin qu'une nouvelle divergence de surface, quota ou réponse publique soit visible.

## Contrat figé

Chaque entrée de `AI_GOLDEN_CONTRACTS` contient :

- un identifiant stable et le chemin exact ;
- le domaine et la surface `http`, `sse` ou `cron` ;
- les modèles logique et fournisseur ;
- la politique de quota ;
- le mode `text`, `json`, `tool` ou `sse` ;
- une entrée synthétique lisible produisant le prompt système, les messages, blocs image, outils, `tool_choice`, température et limite de tokens réels ;
- une empreinte SHA-256 de la sérialisation canonique de l'invocation complète ;
- des exemples publics synthétiques de succès, panne et sortie invalide, plus les cas partiels ou legacy lorsqu'ils existent.

Une empreinte modifiée signifie que **des octets du contrat fournisseur ont changé**. Le diff doit alors être relu avec le builder de prompt concerné et ses tests de caractérisation. Aucun test normal ne réécrit les fixtures.

## Sérialisation canonique

`canonicalSerialize` trie uniquement les clés d'objet. Il préserve l'ordre des tableaux, les retours à la ligne, accents, chaînes et nombres. Les `bigint` utilisent la forme explicite `{ "$bigint": "…" }`. `undefined`, fonctions, symboles, `NaN` et infinis sont refusés ; aucune valeur inconnue n'est supprimée ou normalisée silencieusement.

## Mise à jour contrôlée

Il n'existe volontairement aucune commande de régénération automatique. Pour accepter un changement intentionnel :

1. modifier le contrat runtime dans sa tranche dédiée ;
2. exécuter le test ciblé et relever uniquement l'empreinte reçue pour le point d'entrée concerné ;
3. relire le prompt, les outils, paramètres, modèles, quota et réponse publique avant de modifier l'empreinte avec un patch explicite ;
4. exécuter deux fois les tests ciblés, puis la suite complète ;
5. examiner le diff et lancer la recherche de secrets avant staging.

Cette procédure interdit les mises à jour opportunistes via snapshot/update mode. Les fixtures ne contiennent ni e-mail, token, clé, image réelle ni donnée personnelle.

## Garanties et limites

Les tests prouvent la couverture 15/15, l'égalité exacte des invocations, le partage byte-identique des deux contrats communs, le déterminisme, l'immutabilité, les cas publics minimaux et l'absence de marqueurs de secret. Les sorties structurées restent validées par les [schémas IA](./AI_OUTPUT_SCHEMAS.md) et le [parseur commun](./AI_STRUCTURED_PARSING.md).

Les cas publics d'échec et de partialité sont recoupés avec la
[politique des fallbacks](./AI_FALLBACK_POLICY.md). Le manifeste golden fige le
contrat observé; le registre décide séparément si des fragments déjà valides
peuvent être conservés.

Les empreintes sont exactes mais ne constituent pas une approbation métier du contenu des prompts. Les sept points d'entrée encore sur transport historique restent couverts comme contrats observés ; cette tranche ne les migre pas. Les fallbacks restent absents et seront traités séparément.
