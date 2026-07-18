# Programme Training actif et navigation des jours

## Statut

Depuis le 18 juillet 2026, les décisions de sélection du programme actif et de
navigation hebdomadaire de `TrainingTab` passent par la frontière pure
[`lib/training/active-program-day.ts`](../lib/training/active-program-day.ts).
Le rendu, les formats persistés et les accès Supabase restent inchangés.

## Priorité préservée

La résolution conserve le contrat legacy observé avant l'extraction :

1. le premier programme personnel chargé avec `is_active = true` ;
2. sinon le programme coach assigné reçu par `TrainingTab` ;
3. sinon l'état sans programme.

Un jour personnel interprétable conserve la priorité même lorsqu'il représente
du repos ou lorsqu'il a été complété par le padding historique à sept jours. Un
programme personnel vide, ou un nom de jour non interprétable, laisse le
programme coach prendre le relais comme auparavant. Un jour coach absent reste
un jour vide non marqué comme repos ; cette ambiguïté n'est pas corrigée ici.

## Résolution d'un jour

- l'ordre est lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche ;
- les programmes personnels continuent d'utiliser `getSessionForDay`, y compris
  ses valeurs legacy par défaut ;
- les jours de repos restent explicites dans la valeur résolue ;
- les prescriptions périodisées utilisent toujours la semaine effective et les
  phases `p1`, `p2`, `p3`, avec le fallback historique vers `p1` ;
- les chaînes de répétitions périodisées restent converties avec le premier
  entier lisible, conformément au comportement caractérisé ;
- l'entrée n'est jamais mutée.

Le démarrage d'une séance reçoit encore exactement le jour résolu puis la liste
d'exercices résolue et enrichie par `TrainingTab`. Aucun adaptateur canonique
n'est branché dans cette tranche.

## Navigation

La frontière calcule les transitions semaine précédente, semaine suivante et
retour à aujourd'hui, ainsi que leur direction d'animation. La sélection d'un
jour utilise la même table lundi-premier. Les boutons, gestes mobiles, dates du
calendrier et animations restent rendus par `TrainingTab`.

## Limites

- Les programmes personnel et coach restent deux formats legacy distincts.
- Un programme personnel comportant moins de sept jours est complété par des
  jours de repos, même si un programme coach possède une séance ces jours-là.
- Un programme coach sans entrée pour le jour choisi produit une séance vide,
  pas un repos.
- Le chargement, l'activation et la persistance des programmes personnels
  restent dans `TrainingTab` et seront traités par des tranches ultérieures.
- La navigation pure ne déplace aucune date elle-même : elle calcule uniquement
  l'offset et le sens attendus par l'interface existante.

## Tests

[`tests/unit/training-active-program-day.test.ts`](../tests/unit/training-active-program-day.test.ts)
couvre la priorité, les fallbacks, les repos, les données incomplètes, la
périodisation, l'absence de mutation et la navigation déterministe. La
[caractérisation de `TrainingTab`](TRAINING_TAB_CHARACTERIZATION.md) continue de
protéger le rendu et les données transmises au démarrage d'une séance.
