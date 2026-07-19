# Read models progression et analytics

> Statut : contrats de Phase 4. Ces read models préparent les données affichées
> sans devenir une autorité d'identité et sans fusionner les historiques
> Training indépendants.

## Architecture

La frontière `lib/progression/read-models/` contient trois modèles :

- `createAnalyticsReadModel` charge les sources analytics par ports injectés,
  applique les agrégations de `lib/progression/` et restitue les formes legacy
  attendues par `useAnalytics` ;
- `buildProgressionSummaryReadModel` prépare les compteurs, le volume total et
  le delta de poids utilisés par `ProgressTab` ;
- `buildProgressionHistoryReadModel` trie les historiques de poids,
  mensurations et records, puis transporte séparément `workout_sessions`, `completed_sessions` et
  `scheduled_sessions`.

Les read models n'importent ni React, Next, Supabase, navigateur ou `app/`. Ils
ne créent aucun client. L'appelant fournit un `ownerUserId` déjà vérifié par la
frontière authentifiée ; ce paramètre sert au scope des ports, jamais de preuve
d'autorité navigateur.

## Port analytics et projections

| Port | Projection utilisée par l'adaptateur actuel | Fenêtre et limite | Sortie |
|---|---|---|---|
| `listPersonalRecords` | `id,user_id,exercise_name,record_type,value,previous_value,unit,achieved_at,created_at` | 50, `achieved_at DESC` | records legacy |
| `listNutrition` | repository Nutrition, projection `id,user_id,date,meal_type,food_id,custom_name,quantity_g,calories,protein,carbs,fat,created_at` | depuis J-7 inclus, 100 | totaux quotidiens legacy |
| `listWater` | repository Nutrition, projection `id,user_id,date,amount_ml,created_at` | depuis J-7 inclus, 30 | ml quotidiens |
| `listWeights` | `date,poids` | depuis J-90 inclus, 100 | points triés ascendants |
| `listCompletedSets` | `weight,reps,created_at` | 28 × 24 h, 500 sets complétés | volume hebdomadaire lorsque le contrat temporel est compatible |

Toutes les projections sont explicites. Les erreurs du port sont réduites aux
codes `unauthorized`, `unavailable` ou `failure`; aucun message Supabase, SQL,
payload ou identifiant personnel brut n'entre dans la sortie.

## Résultats

- `success` : toutes les lectures nécessaires ont réussi et au moins une source
  contient des données ;
- `unavailable` : absence confirmée, avec collections vides ;
- `partial` : certaines sources sont lisibles et d'autres en panne ou invalides,
  avec la liste bornée des sources concernées ;
- `failure` : aucune lecture utile n'a abouti.

Une source vide ne devient pas une panne. Une panne ne devient pas une valeur
zéro. Les tableaux sont copiés et ordonnés avant exposition.

## Agrégations et métriques couvertes

Le modèle analytics couvre actuellement les métriques du
[catalogue](PROGRESSION_METRICS_CATALOG.md) suivantes : records #14–16, poids
#17–19, Nutrition/eau #32–36 et volume Training #8–9 lorsque la stratégie
temporelle explicite est utilisée. Le modèle de synthèse couvre les compteurs
#1/#15, le volume #8, le streak #27 reçu de sa stratégie existante et le delta
de poids #18.

Les formules passent par les fonctions documentées dans
[les agrégations pures](PROGRESSION_AGGREGATIONS.md) : tri/delta de poids,
agrégations Nutrition et eau, tonnage hebdomadaire et stratégies legacy
nommées. Aucun score IA n'est recalculé.

## Consommateurs migrés

- `useAnalytics` délègue les lectures records, Nutrition, eau et poids au read
  model. Son contrat public, ses formes snake_case et ses états React restent
  inchangés.
- `ProgressTab` délègue le volume total et le delta de poids à la vue synthèse.
  Props, callbacks, sections et rendu ne sont pas restructurés.
- `AnalyticsSection` reçoit indirectement ces collections préparées et conserve
  ses props publiques. Ses agrégations e1RM et variation utilisent déjà le
  noyau pur.

## Fallbacks et limites

- Le volume hebdomadaire affiché par `useAnalytics` garde provisoirement son
  fallback borné : 500 sets complétés sur 28 jours, opérations `Date` locales,
  puis clé tronquée en UTC. Cette stratégie peut différer de la semaine locale
  explicite autour des changements de jour/DST ; la remplacer modifierait des
  valeurs visibles. Le port Training du read model reste disponible pour une
  bascule après comparaison dédiée.
- La détection/écriture de PR reste une mutation du hook historique et se situe
  hors de cette tranche read-only. Sa relecture utilise désormais une projection
  explicite, sans `select('*')`.
- Les mensurations runtime absentes des types ne sont pas inventées. Le read
  model historique accepte seulement les points déjà résolus par ses ports.
- `completed_sessions`, `workout_sessions` et `scheduled_sessions` demeurent
  trois collections distinctes, sans déduplication ni jointure supposée.
- `symmetry_score`, `fitness_score`, `score_semaine` et les analyses IA restent
  non reproductibles.
