# Décision Phase 4 — divergences Nutrition historiques

## Conclusion

Les preuves `600 → 500 kcal` et `0 → 18 g` sont deux fixtures synthétiques
introduites ensemble par `cca0a72 test(nutrition): compare legacy canonical
totals`. Elles ne sont ni deux versions successives d'une même règle métier,
ni deux valeurs à migrer ensemble.

- `600 → 500 kcal` compare deux autorités possibles d'un total : une valeur
  déclarée et une valeur recalculée. Le dépôt ne permet pas de désigner
  honnêtement l'une comme autorité universelle.
- `0 → 18 g` reproduit une perte d'alias antérieure à la frontière de
  comparaison. Lorsque `proteins: 18` n'est plus présent, aucune lecture ne
  peut reconstruire cette valeur depuis `protein: 0`.

**Décision métier MoovX : option E pour les deux preuves historiques.**
Elles restent divergentes et documentées, sans changement de runtime ni
backfill. Pour les futurs plans seulement, un chantier séparé doit désigner
et versionner la provenance du total avant toute option B :

1. objectif calorique demandé ;
2. total recalculé depuis les aliments.

Ces valeurs ne doivent plus partager un champ ambigu sans provenance.
La perte future d'alias des repas sauvegardés est déjà empêchée par le
snapshot v1 ; cela ne répare pas les objets historiques.

La décision métier accepte ces deux divergences comme exceptions historiques
au critère de concordance. Elles ne bloquent donc plus la clôture technique :
la Phase 4 passe à `met`. Les fixtures et leurs statuts restent inchangés et
aucune case RC1 n'est cochée.

## Origine et portée des preuves

| Preuve | Fichier et frontière | Domaine | Source → cible | Type | Runtime |
|---|---|---|---|---|---|
| 600 → 500 kcal | `tests/fixtures/nutrition-total-comparison.ts`, fixture `totaux déclarés divergents` → `compareLegacyCanonicalTotals` | plan Nutrition / concordance | `declared_totals.total_calories = 600` → résultat canonique complet `kcal = 500` | nombres synthétiques complets | comparateur pur non raccordé à l'UI ou à la persistance |
| 0 → 18 g | même fichier, fixture `alias sauvegardé ignoré par affichage singulier` → même comparateur | repas sauvegardé / alias protéine | aliment legacy `protein = 0` → résultat canonique complet `proteinG = 18` | nombres synthétiques complets | comparateur pur non raccordé à l'UI ou à la persistance |

Le commit d'origine ne contient ni identifiant de ligne, ni export de
production, ni migration. Le SHA-256 des douze fixtures et les deux statuts
`divergent` sont volontairement figés par
`tests/unit/nutrition-total-concordance-policy.test.ts`.

## Divergence 600 → 500 kcal

### Cause exacte

La fixture juxtapose un total déclaré de 600 kcal et un total canonique
recalculé de 500 kcal. Les macros et fibres sont identiques, l'écart de
100 kcal dépasse les tolérances et aucun arrondi, alias ou changement d'unité
ne l'explique.

Ce n'est pourtant pas la preuve que 600 est un ancien défaut ou que 500 est
une nouvelle règle. Les producteurs actifs donnent plusieurs sens au mot
« total » :

- le détail du diagnostic écrit les objectifs du profil dans les colonnes de
  total et le plan généré dans `plan_data`;
- le générateur recalcule `total_kcal` de chaque jour depuis les aliments;
- le producteur coach IA écrit le total du lundi, avec l'objectif en fallback,
  dans `meal_plans.total_calories`;
- les readers de plan utilisent désormais `plan_data`, pas ces colonnes comme
  somme autoritaire du plan.

La cause est donc une **provenance non versionnée et une surcharge sémantique
des totaux**, reproduites par une fixture synthétique. Ce n'est pas une
migration de données démontrée incomplète.

### Flux complet observé

```text
objectif profiles / paramètres du diagnostic
  → génération IA
  → recalcul journalier depuis les aliments
  → plan_data.<jour>.total_kcal
  → écriture meal_plans
      - diagnostic : total_calories = objectif
      - coach IA : total_calories = lundi ou objectif de fallback
  → readers owner-scoped de plan_data
  → parseur/enveloppe de plan
  → rendu du plan et consommateurs aval
```

Le flux de la preuve est distinct :

```text
fixture declared_totals(600)
  + résultat canonique complet(500)
  → compareLegacyCanonicalTotals
  → statut divergent
  → assertion de caractérisation
```

Le comparateur ne stocke, ne rend et ne choisit aucune autorité.

### Consommateurs identifiés

| Consommateur | Usage | Classement |
|---|---|---|
| `nutrition-total-comparison.ts` | source synthétique exacte 600/500 | preuve |
| `nutrition-total-concordance-policy.test.ts` | fige Δ100, 1/6 et `divergent` | test |
| `nutrition-plan-producers.ts` | payloads synthétiques diagnostic et coach IA | caractérisation des producteurs |
| `nutrition-plan-producers-characterization.test.ts` | fige total déclaré, jour et somme d'aliments | test |
| `legacy-total-comparison.ts` | compare sans choisir l'autorité | frontière pure non runtime |
| `WeeklyDiagnosticDetailContent.tsx` | écrit objectif et `plan_data` séparément | producteur runtime |
| `useClientDetailAi.ts` | écrit lundi ou objectif en fallback | producteur runtime |
| `meal-generation/service.ts` | recalcule les totaux journaliers | producteur de JSON |
| readers/enveloppe de plan et vues Nutrition | lisent le plan JSON | consommateurs runtime, sans constante 600/500 |
| documentation Phase 4/plan | explique la divergence | documentation |

Les autres occurrences de 500 ou 600 trouvées (HTTP 500, graisse typographique,
pagination, quantité d'eau, limites de lignes ou valeurs d'autres tests) ne
consomment pas cette divergence.

### Production, schéma et impact utilisateur

Une vérification distante strictement read-only, bornée à moins de 1 000
lignes, a observé 22 `meal_plans`. Aucun objet n'avait simultanément un
`total_calories` numérique et un `plan_data.lundi.total_kcal` numérique :
0 paire comparable et 0 paire exacte 600/500. Aucun identifiant ni contenu
nutritionnel brut n'a été extrait.

Le schéma runtime accepte `plan_data`, `is_active` et les colonnes de totaux
utilisées par les producteurs. Les types générés restent en retard et
décrivent `plan`, `active` sans ces totaux. Cette divergence de contrat
renforce l'interdiction d'inférer une projection ou un backfill.

L'impact utilisateur exact de la paire n'est donc pas démontré en production.
Un changement futur non versionné pourrait toutefois remplacer un objectif
par une somme journalière, ou l'inverse, et modifier plans affichés,
comparaisons et consommateurs aval.

### Matrice de décision

| Option | Impact utilisateur | Risque / compatibilité | Backfill | Tests / production | Réversibilité |
|---|---|---|---|---|---|
| A — conserver l'historique | aucun changement; ambiguïté maintenue | faible immédiatement, dette de provenance conservée | non | fixtures inchangées; production inchangée | totale |
| B — nouvelle valeur pour futurs calculs | cohérence future après choix explicite d'autorité | moyen; exige version et adaptation par producteur | non | nouveaux tests/version; anciens plans restent legacy | élevée avec version/feature gate |
| C — migrer l'existant | pourrait homogénéiser les affichages | très élevé; aucune autorité universelle ni source complète | oui, obligatoire | migration et validation production lourdes | faible |
| D — corriger seulement le rendu | masque une source sans corriger la provenance | élevé; surfaces et exports pourraient diverger | non | snapshots UI à changer; stockage inchangé | moyenne |
| E — documentation uniquement | aucun changement visible | faible; divergence reste explicite | non | attentes actuelles inchangées | totale |

**Décision : E pour l'historique.** Le futur chantier distinct applique B et
doit définir, par producteur et niveau (`objectif`, `jour`, `plan`), l'autorité,
sa version et deux champs/provenances séparés. C et D sont explicitement
refusées.

## Divergence 0 → 18 g

### Cause exacte

La fixture legacy arrive déjà avec `protein: 0`; elle ne contient plus
`proteins: 18`. La séparation a donc eu lieu avant le comparateur, dans un
ancien chemin singulier qui assimilait l'alias absent à zéro. Le comparateur
reconnaît `protein`, `proteins` et `prot` lorsqu'ils sont présents, mais il ne
peut pas recréer une valeur perdue.

Il s'agit d'un **ancien défaut de projection/alias et d'une perte
d'information**, pas d'une règle métier transformant réellement 0 g en 18 g.
Le snapshot Nutrition v1 préserve désormais les alias observés, conserve un
vrai zéro et refuse les alias contradictoires. Cette prévention prospective
est déjà en place ; elle ne fournit aucune source pour un backfill historique.

### Flux complet observé

```text
aliment legacy saved_meals.foods
  → ancien lecteur singulier protein
  → alias proteins absent de la projection
  → fallback historique 0
  → valeur legacy déjà appauvrie
  → comparateur face au canonique 18
  → statut divergent
```

Flux actuel sécurisé :

```text
saved_meals.foods
  → readSavedMealFoodValues / snapshot v1
  → alias singulier/pluriel observé et validé
  → conflit refusé, zéro explicite conservé
  → bibliothèque / sélection / réutilisation
```

### Consommateurs identifiés

| Consommateur | Usage | Classement |
|---|---|---|
| `nutrition-total-comparison.ts` | source synthétique exacte 0/18 | preuve |
| `nutrition-total-concordance-policy.test.ts` | fige Δ18, 100 % et `divergent`; prouve aussi que `proteins: 18` présent est équivalent | test |
| `nutrition-legacy-snapshot.test.ts` | préserve alias et refuse `protein:0`/`proteins:18` contradictoires | test de contrat |
| tests persistence/reuse/selection/render | couvrent pluriel, zéro et rendu | non-régression |
| `saved-meal-snapshot.ts` | lecteur d'alias versionné | frontière runtime |
| `NutritionSavedMealsSection.tsx` | rendu via la frontière | UI runtime |
| `saved-meal-reuse.ts` | conversion validée vers journal | consommateur runtime |
| documentation Phase 4/snapshots | explique la perte | documentation |

Les autres occurrences de zéro protéique ou de 18 g dans les tests de
journal, Analytics, diagnostic et badges représentent des valeurs métier
indépendantes, pas cette preuve.

### Production, schéma et impact utilisateur

Une vérification distante strictement read-only a observé 9 repas sauvegardés
et 37 objets aliments. Elle n'a trouvé ni objet avec seulement
`protein: 0`, ni objet avec seulement `proteins: 18`, ni conflit exact entre
les deux. Aucun identifiant ou objet brut n'a été sorti. Cet échantillon
ponctuel ne prouve pas l'absence future ou historique de toute perte.

Le schéma et les types exposent `saved_meals.foods` comme JSON : la nullabilité
et les alias internes ne sont pas garantis par SQL. Le contrat doit donc
rester porté par le snapshot/reader applicatif.

Aucun impact utilisateur actuel de la paire exacte n'est démontré. Pour une
ligne déjà appauvrie, afficher 18 g serait une invention. Pour les nouvelles
écritures, le snapshot actuel empêche déjà la reproduction silencieuse.

### Matrice de décision

| Option | Impact utilisateur | Risque / compatibilité | Backfill | Tests / production | Réversibilité |
|---|---|---|---|---|---|
| A — conserver l'historique | les valeurs restantes restent telles qu'observées | faible; perte ancienne non réparée | non | fixtures inchangées | totale |
| B — nouvelle règle pour futurs calculs | alias futurs préservés et validés | faible; déjà réalisée par snapshot v1 | non | tests snapshot existants; writers versionnés concernés inchangés ici | élevée |
| C — migrer l'existant | prétend restaurer les protéines | critique sans source autoritaire; risque de falsifier de vrais zéros | oui, source externe requise | migration et audit manuel nécessaires | faible |
| D — corriger seulement le rendu | alias présent peut être lu; valeur absente reste impossible à recréer | élevé si 18 est forcé; incohérent avec les vrais zéros | non | UI changerait sans preuve | moyenne |
| E — documentation uniquement | aucun changement visible | faible; irréversibilité explicitée | non | attentes actuelles inchangées | totale |

**Décision : E pour la preuve historique et B déjà réalisé comme autorité
prospective par les alias et le snapshot v1.** Aucun backfill n'est autorisé
sans source externe fiable associée à chaque aliment. Un vrai zéro reste zéro,
un conflit d'alias reste refusé et une donnée perdue n'est jamais reconstruite.
D ne peut réparer une donnée absente et ne doit jamais coder 18 en dur.

## Décision commune et clôture

Les divergences ne doivent pas être regroupées dans une migration :

| Axe | 600 → 500 kcal | 0 → 18 g |
|---|---|---|
| niveau | total déclaré/recalculé de plan ou jour | nutriment d'un aliment sauvegardé |
| cause | autorités multiples sans provenance versionnée | alias perdu avant la frontière |
| information disponible | deux valeurs présentes mais autorité indécise | valeur 18 absente du legacy |
| remédiation future possible | versionner l'autorité après décision produit | prévention déjà assurée par snapshot v1 |
| backfill honnête | non démontré | impossible sans source externe |

Le domaine Nutrition read-only reste clôturable (A=22, B=7, C=0, D=6,
E=5). La décision métier accepte explicitement les deux preuves protégées
comme exceptions historiques : la Phase 4 est techniquement `met`, sans
requalifier les fixtures ni réécrire de donnée.

Le chantier suivant est distinct de la Phase 4 clôturée : concevoir l'autorité
versionnée des futurs totaux de plan avec un objectif demandé et un total
recalculé séparés. La preuve 0/18 ne requiert aucune action supplémentaire.
