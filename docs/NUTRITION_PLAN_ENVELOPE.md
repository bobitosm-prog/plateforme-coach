# Frontière de lecture des plans Nutrition

## Portée

`lib/nutrition/plan-envelope/` implémente le contrat read-only de
[l'ADR 0007](adr/0007-nutrition-plan-persistence-contract.md). Le module est
pur : il ne dépend ni de React, Next, Supabase, `app/`, navigateur, réseau ou
variables d'environnement. Le
[consommateur dashboard coach](NUTRITION_PLAN_DOUBLE_READ_CONSUMER.md) et la
[lecture du plan personnel actif](NUTRITION_PERSONAL_PLAN_DOUBLE_READ.md)
l'utilisent désormais ; aucun producteur n'est raccordé.

## API publique

| API | Contrat |
|---|---|
| `nutritionPlanEnvelopeV1Schema` | Schéma Zod strict de l'enveloppe v1. |
| `validateNutritionPlanEnvelope(value)` | Validation Zod détaillée, sans mutation. |
| `parseNutritionPlanEnvelope(value)` | Retourne une enveloppe valide ou `null`. |
| `serializeNutritionPlanEnvelope(envelope)` | Sérialisation déterministe d'une enveloppe valide, réservée au round-trip et aux tests. |
| `serializedNutritionPlanBytes(value)` | Taille JSON UTF-8 déterministe. |
| `adaptLegacyNutritionPlan(value)` | Convertit uniquement les formes coach et IA françaises inventoriées. |
| `readNutritionPlanDocument({plan, planData})` | Double lecture canonique-prioritaire. |
| `readMealPlanRow(value)` | Sépare document et autorité SQL de `meal_plans`. |
| `readClientMealPlanRow(value)` | Sépare document et autorité SQL de `client_meal_plans`. |
| `presentNutritionPlanForLegacyUi(envelope)` | Projette sans perte démontrée vers le contrat UI historique ou refuse la projection. |

Les résultats sont discriminés :

- `canonical` : enveloppe v1 valide ;
- `legacy_converted` : forme inventoriée convertie avec warnings ;
- `legacy_unsupported` : forme non démontrée ;
- `conflict` : documents, activations ou alias contradictoires ;
- `invalid` : structure ou valeur invalide.

Les erreurs ne contiennent que des codes et chemins bornés. Elles ne recopient
jamais un payload ou une valeur utilisateur.

## Limites exactes

- JSON sérialisé : au plus 1 048 576 octets UTF-8 ;
- exactement sept jours, dans l'ordre lundi logique à dimanche
  (`monday` à `sunday` dans le contrat) ;
- douze repas maximum par jour ;
- 64 aliments maximum par repas ;
- seize alternatives maximum ;
- 128 règles et 128 warnings maximum ;
- textes bornés à 256 caractères, quantités originales textuelles à 128 ;
- nombres finis et non négatifs ; quantité convertie en grammes strictement
  positive ou `null`.

Les objets sont stricts : toute clé inconnue est refusée. `user_id`,
`client_id`, `coach_id`, `owner`, activation et statut d'affectation ne font
pas partie de l'enveloppe.

## Formats legacy

Deux formats seulement sont convertis :

1. coach : jours français avec `{ meals: [{ type, foods }] }`;
2. IA : jours français avec `{ repas: { petit_dejeuner, ... } }` et totaux
   journaliers éventuels.

Les noms anglais de jours ne sont pas acceptés : aucun producteur persistant
inventorié ne démontre ce format. Un jour absent devient `sourceStatus:
missing` avec `legacy_day_missing`. Un jour coach avec `meals: []` devient
`omitted_legacy`; un jour IA avec `repas: {}` reste `observed` avec quatre
repas vides.

Les alias de quantité et nutriments inventoriés sont conservés dans
`observedAliases`. Des alias égaux sont acceptés ; des valeurs contradictoires
retournent `alias_conflict`. L'inconnu reste `null`; aucun `|| 0` n'est
utilisé. Les totaux IA restent attachés au jour et reçoivent
`legacy_total_without_provenance`; ils ne sont pas promus en total de plan.

## Double lecture

1. Une enveloppe valide dans `plan` est prioritaire.
2. Si `plan_data` est aussi présent et équivalent, le résultat reste
   `canonical` avec `legacy_duplicate_source`.
3. Si les documents divergent, le résultat est `conflict`.
4. Un `plan` présent mais invalide n'est jamais masqué par `plan_data`.
5. Deux formes legacy équivalentes utilisent `plan` et signalent le doublon.
6. `active` est prioritaire sur `is_active`; deux booléens divergents
   retournent `activation_conflict`.

Les identités et dates SQL sont rendues dans un objet `authority` séparé.
Elles ne sont jamais recopiées dans l'enveloppe.

## Limites restantes

- Aucun writer ne produit encore `NutritionPlanEnvelopeV1`.
- Deux consommateurs read-only l'utilisent ; `HomeTab` et les lecteurs du
  détail client restent legacy.
- Les colonnes SQL futures `week_start` et `status` ne sont pas créées.
- Aucun backfill ou contrôle distant n'a été réalisé.
- La priorité produit entre plan personnel et plan coach reste inchangée.
