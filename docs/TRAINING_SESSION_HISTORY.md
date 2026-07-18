# Historique Training et séances récentes

## Périmètre

La frontière pure [`lib/training/session-history.ts`](../lib/training/session-history.ts) centralise la préparation des historiques affichés par le dashboard client et `TrainingTab`. Elle ne lit ni n'écrit Supabase et ne convertit pas ces données vers le modèle Training canonique.

Les sources restent volontairement distinctes :

- `workout_sessions` décrit une exécution détaillée ; `workout_sets` fournit ses séries ;
- `completed_sessions` reste un marqueur de navigation dans un programme assigné ;
- le cache dashboard transporte la projection `workout_sessions`, tandis que
  les marqueurs `completed_sessions` alimentent les maps de navigation en
  mémoire sans être fusionnés à cette projection ; le cache ne devient jamais
  une autorité.

Aucune date, aucun nom ou index n'est utilisé pour fusionner ou dédupliquer ces deux historiques.

## Contrat de préparation

- Les séances et complétions sont triées par date décroissante.
- Deux dates égales conservent l'ordre d'entrée, qui est le départage historique fourni par la requête.
- La liste récente conserve ses limites existantes : 3 éléments en aperçu et 20 en historique étendu.
- Le dashboard conserve au plus 50 marqueurs `completed_sessions`.
- Le filtre de type continue d'utiliser `resolveSessionType` et ses alias legacy.
- Le libellé de date conserve le format localisé actuel : jour de semaine, jour numérique et mois long.
- Les séries restent groupées selon l'ordre `exercise_name`, puis `set_number`, fourni par la requête existante ; la frontière n'invente pas un autre classement.
- Les lignes dont l'identité ou la date est inexploitable sont isolées avec un code structuré. Une ligne invalide ne fait pas échouer les autres.
- Les entrées ne sont jamais mutées.

## Présentation et états

`RecentSessionsList` conserve l'état vide et ses filtres locaux. `WorkoutDetailList` conserve ses états chargement/vide et délègue seulement le calcul des totaux d'exercices, séries et volume. `TrainingTab` délègue le regroupement des séries détaillées et l'extraction des anciennes clés calendaires `date`.

## Limites

- La lecture récente de `TrainingTab` reste un accès Supabase direct et demande encore la colonne legacy `workout_sessions.date`, absente des types canoniques générés.
- `completed_sessions` n'a toujours pas de clé étrangère vers `workout_sessions` ; ce document n'en crée pas.
- Les autres consommateurs historiques (`HomeTab`, analytics, détail client et dashboard desktop) ne sont pas migrés dans cette tranche.
- Les formes invalides sont isolées en mémoire, sans réparation ni écriture en base.

Voir aussi [l'inventaire des formats](TRAINING_FORMATS_INVENTORY.md), [le modèle canonique](TRAINING_CANONICAL_MODEL.md), [les repositories Training](TRAINING_REPOSITORIES.md) et [la caractérisation de `TrainingTab`](TRAINING_TAB_CHARACTERIZATION.md).
