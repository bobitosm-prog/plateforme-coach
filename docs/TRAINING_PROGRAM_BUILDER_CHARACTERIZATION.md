# Caractérisation de `ProgramBuilder`

> État observé au 18 juillet 2026, avant refactor de l'éditeur de programme.
> Cette documentation décrit le comportement existant ; elle ne définit pas le
> modèle cible.

## Frontière et consommateurs

`ProgramBuilder` est ouvert par `TrainingTabOverlays`. Il reçoit le client
Supabase navigateur déjà créé, la session, le droit d'utiliser l'IA, un
programme optionnel à éditer et les callbacks `onSave`/`onClose`. La sauvegarde
rafraîchit les programmes ; la fermeture efface également le programme en cours
d'édition dans le contrôleur parent.

Le composant renvoie volontairement `null` pendant un rendu serveur, puis rend
son contenu dans `RailOverlay` côté navigateur. Les tests de caractérisation
utilisent donc les frontières pures existantes et un inventaire statique, sans
ajouter de simulation DOM fragile.

## Formats acceptés

Le format principal est `custom_programs.days`, un tableau JSON libre. À
l'édition, `padTo7Days` conserve les sept premières entrées, ajoute les jours
manquants comme repos et renseigne `weekday` en français lorsqu'il manque.
Cette fonction clone le tableau mais enrichit actuellement en place les objets
jour existants : l'immutabilité profonde des props n'est pas garantie.

Un jour porte implicitement `name`, `weekday`, `is_rest` et `exercises`. Un
exercice peut être résolu par la priorité suivante :

1. `exercise_name` ;
2. `custom_name` ;
3. `name` ;
4. `exercise_id` relu dans le catalogue chargé ;
5. libellé « exercice inconnu ».

Le muscle suit `muscle_group`, puis `focus`, puis le catalogue. L'éditeur écrit
`sets`, `reps`, `rest`, `tempo`, `technique` et `technique_details`. Il ne
propose actuellement ni charge ni RIR. Le tempo d'affichage par défaut est
`2-0-2`. Les techniques prises en charge sont drop set, rest-pause, superset et
mechanical drop set.

## États et actions observés

| Zone | Comportement actuel |
|---|---|
| programme vide | mode de sélection initial ; la création manuelle exige un nom puis matérialise sept jours |
| programme existant | nom et jours repris, passage direct à l'éditeur manuel |
| jours | sept positions calendaires fixes ; il n'existe pas d'ajout/suppression structurel |
| repos | la bascule en repos vide immédiatement les exercices du jour |
| exercices | ajout depuis le catalogue/personnalisé, suppression confirmée, modification des prescriptions |
| ordre | flèches haut/bas pour les exercices ; échange de deux jours en conservant leur `weekday` |
| bibliothèque | catalogue suivi des exercices personnalisés, ordre stable, aucune déduplication de noms |
| variantes | recherche par `variant_group`, sinon recherche approchée sur les deux premiers mots |
| exercice personnalisé | insertion propriétaire avec séries/répétitions/repos et `is_private: true` |
| IA | génération streamée, puis réutilisation du même éditeur et du même contrat de sauvegarde |
| annulation | fermeture sans appel de sauvegarde ; l'état d'édition est nettoyé par le parent |

Les valeurs d'ajout utilisent les fallbacks historiques `sets || 3`,
`reps || 10` et `rest_seconds || 90`. Une valeur numérique zéro est donc
remplacée, et non conservée. Les entrées sans nom exploitable sont isolées par
la frontière de recherche partagée.

## Persistance actuelle

Une sauvegarde construit la projection suivante sans validation structurée :

- `user_id` depuis `session.user.id` ;
- nom trimé ;
- description IA éventuelle ;
- tableau `days` tel qu'édité ;
- source `ai` ou `manual` ;
- date `updated_at` calculée au moment de l'appel.

Un programme existant est mis à jour par son `id`. Une création reçoit
`is_active: false`. Ensuite, le builder supprime les `scheduled_sessions` non
terminées de la semaine courante et recrée une session à 08:00 pour chaque jour
non repos. Les erreurs de cette synchronisation sont journalisées, mais
`onSave()` puis `onClose()` sont tout de même appelés. Cette chaîne n'est ni
transactionnelle ni confiée au repository Training dans l'état actuel.

## Accès Supabase directs

Le composant lit directement :

- `exercises_db` avec une projection bornée à 200 entrées ;
- `custom_exercises` avec `select('*')` et filtre propriétaire ;
- `profiles.gender` pour la génération IA ;
- les groupes et alternatives de `exercises_db`.

Il écrit directement `custom_exercises`, `custom_programs` et
`scheduled_sessions`. Ces accès sont caractérisés comme dette ; aucun accès,
repository ou contrat RLS n'est modifié dans cette tranche.

## Couverture et limites

La suite `program-builder-characterization.test.ts` couvre les formes vide et
existante, le padding sept jours, les jours de repos, l'ajout/suppression et le
réordonnancement, les prescriptions, les fallbacks legacy, la recherche, les
exercices personnalisés, les variantes, le payload de sauvegarde, les callbacks
et l'inventaire Supabase. Elle caractérise explicitement la mutation superficielle
de `padTo7Days` au lieu de la présenter comme une garantie cible.

Le rendu interactif complet n'est pas monté : `ProgramBuilder` dépend de
`document`, de Framer Motion et de plusieurs frontières navigateur, tandis que
la combinaison jsdom 29/Node 24 reste instable dans ce dépôt. Les tests ne
simulent donc pas artificiellement l'interface ni Supabase. Les callbacks sont
vérifiés à leur frontière réelle, et les transformations pures sont exécutées
avec des fixtures synthétiques sans donnée personnelle.

## Modèle d'édition pur extrait

[`program-editor-model.ts`](../lib/training/program-editor-model.ts) porte
désormais les types et décisions de l'éditeur sans dépendance React, Next,
Supabase, navigateur, Framer Motion ou DnD Kit. Il formalise un programme de
sept jours, les jours de repos, les exercices catalogue/personnalisés et leurs
prescriptions legacy : séries, répétitions, repos, tempo et techniques.

Les opérations suivantes sont immuables et utilisées par `ProgramBuilder` :

- normalisation sur sept jours et création d'une semaine selon le nombre de
  jours d'entraînement ;
- modification du nom ou de l'état repos d'un jour ;
- ajout, suppression et modification d'un exercice ;
- déplacement d'un exercice dans son jour et échange de deux jours en
  conservant leurs positions calendaires ;
- validation bornée et préparation du payload legacy de sauvegarde.

Le déplacement utilise des positions `{ dayIndex, exerciseIndex }`. Une source
ou destination invalide est refusée avec une raison stable ; un déplacement
vers la même position est un succès sans changement. Le builder ne permet pas
actuellement de déplacer un exercice entre deux jours : cette tentative est
donc refusée par `cross_day_not_supported`, sans inventer une fonctionnalité.

La validation renvoie une union discriminée. Les erreurs exposent uniquement
un code et un chemin (`name`, `days`, `days.N.exercises.N`) et sont bornées à
20 entrées. Aucun contenu de programme, message SQL ou contexte utilisateur
n'est inclus.

Le payload reste constitué de `user_id`, `name`, `description`, `days`,
`source` et `updated_at`. L'horloge est injectée pour les tests. Les écritures
`custom_programs` et la régénération `scheduled_sessions` restent dans le
composant, dans le même ordre et avec les mêmes callbacks.

### Correction d'immutabilité bornée

`ProgramBuilder` n'utilise plus directement `padTo7Days` pour charger un
programme édité ou généré. La nouvelle normalisation clone profondément les
jours, exercices et champs JSON avant d'ajouter un `weekday`. Les props et les
données IA ne sont donc plus enrichies en place. Les champs legacy connus sont
conservés, y compris l'absence de clé `exercises` sur un jour incomplet, afin de
ne pas modifier le payload sauvegardé.

L'export historique `padTo7Days` reste disponible depuis `ProgramBuilder` pour
ses consommateurs actuels et conserve encore son ancien comportement mutable.
Sa migration globale est hors de cette tranche.

Les accès Supabase directs, la synchronisation non transactionnelle, le rendu
monolithique et les types `any` restants demeurent des dettes explicites.

Prochaine tranche : extraire la persistance et la présentation du builder sans
modifier les règles caractérisées.
