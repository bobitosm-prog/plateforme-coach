# Cycle de vie actuel de `WorkoutSession`

## Statut et portée

**Statut : audit du comportement legacy observé le 18 juillet 2026.**

Ce document décrit le fonctionnement réellement présent avant l'extraction du
modèle pur de séance. Il complète l'[inventaire Training](TRAINING_FORMATS_INVENTORY.md),
le [modèle canonique cible](TRAINING_CANONICAL_MODEL.md), les
[adaptateurs legacy](TRAINING_LEGACY_ADAPTERS.md), l'[historique des séances](TRAINING_SESSION_HISTORY.md)
et l'[architecture de `TrainingTab`](TRAINING_TAB_ARCHITECTURE.md). Il ne définit
pas encore une machine à états exécutable et ne modifie ni données ni RLS.

Deux flux coexistent :

1. `WorkoutSession` plein écran, lancé par `useClientDashboardActions`, conserve
   une enveloppe dans `moovx_active_workout`, une progression détaillée dans
   `moovx_workout_draft`, puis écrit `workout_sessions` et `workout_sets` ;
2. la séance rapide interne à `TrainingTabController` utilise les clés
   `moovx-sets-YYYY-MM-DD-<exercise>` et
   `moovx-inputs-YYYY-MM-DD-<exercise>`, puis écrit seulement une ligne
   `workout_sessions`.

Ces flux ne sont pas fusionnés dans cet audit. La machine ci-dessous décrit le
premier ; les divergences du second sont signalées explicitement.

## Vocabulaire observable

| État observé | Critère actuel | Autorité effective | Remarque |
|---|---|---|---|
| Aucune séance | `workoutSession === null` | mémoire React de `useClientDashboard` | État initial en l'absence de restauration locale. |
| Séance préparée | `startProgramWorkout` a produit `{ name, exercises, startedAt, weekdayKey? }` | mémoire React + `moovx_active_workout` | Il n'existe pas encore d'identifiant de `workout_sessions`. |
| Brouillon local proposé | `moovx_workout_draft` correspond au même `sessionName`, date de moins de 24 h, contient au moins une série `done` | `localStorage` | La clé n'est ni liée à l'utilisateur ni versionnée. Le brouillon n'est pas repris silencieusement : un choix reprendre/recommencer est affiché. |
| Séance en cours | `WorkoutSession` monté avec ses exercices et `done === false` | mémoire React (`exos`, séries, `elapsed`) ; copie asynchrone dans `moovx_workout_draft` | Aucun enregistrement serveur n'est créé pendant l'exécution. |
| Repos actif | `restOn === true` | mémoire React, échéance `restEndsAtRef` | Le temps restant est recalculé avec `Date.now()` au retour de visibilité. Il n'est pas persisté. |
| Repos terminé | `restDone === true` | mémoire React | État transitoire fermé après cinq secondes ou action utilisateur. |
| Confirmation de fin | `showEndModal === true` | mémoire React | L'utilisateur peut continuer, supprimer localement ou demander la sauvegarde. |
| Sauvegarde déclenchée | appel de `onFinish` après suppression du brouillon | chaîne asynchrone côté client | Il n'existe ni état persistant `saving`, ni transaction globale, ni verrou anti-double soumission. |
| Séance terminée locale | `done === true` | mémoire React | Atteint après le choix concernant le template, puis fermeture automatique après huit secondes. Ce drapeau ne prouve pas que toutes les écritures serveur ont réussi. |
| Abandon explicite | confirmation de suppression | mémoire React + suppression de `moovx_workout_draft` et, via `onClose`, de `moovx_active_workout` | Aucune ligne d'abandon n'est persistée. Fermer/recharger sans cette confirmation laisse au contraire les clés de reprise. |
| Erreur partielle | une étape de la finalisation échoue après une étape précédente | état dispersé entre base, cache local et logs | Aucun état UI discriminé ne représente cette situation aujourd'hui. |

`prepared`, `in-progress`, `saving`, `completed`, `abandoned` et
`partial-error` sont ici des noms d'audit. Ils ne sont pas des valeurs stockées
dans une colonne d'état unique.

## Diagramme d'état observé

```mermaid
stateDiagram-v2
    [*] --> Aucune
    Aucune --> Preparee: démarrer programme/séance libre
    Preparee --> EnCours: montage WorkoutSession
    EnCours --> BrouillonPropose: rechargement avec progression locale valide
    BrouillonPropose --> EnCours: reprendre ou recommencer
    EnCours --> Repos: valider une série
    Repos --> EnCours: ignorer/annuler le repos
    Repos --> ReposTermine: échéance atteinte
    ReposTermine --> EnCours: fermer ou relancer 30 s
    EnCours --> ConfirmationFin: action terminer
    ConfirmationFin --> EnCours: continuer
    ConfirmationFin --> Abandonnee: confirmer supprimer
    ConfirmationFin --> Sauvegarde: confirmer enregistrer
    Sauvegarde --> Partielle: une écriture échoue
    Sauvegarde --> TermineeLocale: callback résolu et choix template terminé
    Abandonnee --> Aucune: fermeture
    TermineeLocale --> Aucune: fermeture ou délai de 8 s
    Partielle --> Aucune: comportement actuel non orchestré
```

La transition `Sauvegarde -> TermineeLocale` n'est pas atomique : `finish()`
n'attend pas la promesse retournée par `onFinish`, et la fenêtre de sauvegarde
comme template peut être affichée pendant que les écritures métier continuent.

## Table des transitions

| De | Déclencheur | Préconditions observées | Écritures / effets | Vers | Échec actuel |
|---|---|---|---|---|---|
| Aucune | `startProgramWorkout(day, exercises, weekdayKey?)` | appelant possède une session chargée ; l'identité n'est pas fournie par le jour | crée `startedAt`, met l'état React et `moovx_active_workout` | Préparée | un échec `localStorage` est ignoré ; la séance reste en mémoire |
| Préparée | rendu plein écran | `workoutSession` non nul | transforme les exercices legacy en `Exo[]`, démarre durée et wake lock | En cours | champs absents reçoivent des défauts legacy |
| En cours | effet initial | brouillon même `sessionName`, `savedAt` < 24 h, `exos` valides et au moins une série faite | ouvre le prompt | Brouillon proposé | JSON invalide, ancien ou autre nom est ignoré, sans suppression systématique |
| Brouillon proposé | reprendre | brouillon présent | clone les exercices/séries et restaure `weightRaw` | En cours | l'enveloppe `moovx_active_workout` reste indépendante |
| Brouillon proposé | recommencer | aucune | supprime `moovx_workout_draft` | En cours | aucune écriture serveur |
| En cours | modifier charge/répétitions, ajouter/enlever/réordonner exercice ou série | séance montée | met à jour `exos`; l'effet réécrit tout le brouillon | En cours | pas de validation de schéma/version du brouillon |
| En cours | valider une série | répétitions <= 15 ou confirmation explicite | commit de charge, `done=true`, démarrage du repos | Repos | aucune persistance serveur intermédiaire |
| Repos | ignorer, invalider la série ou annuler | repos actif | annule sons/intervalle et efface le contexte de repos | En cours | état de repos perdu au rechargement |
| Repos | échéance calculée atteinte | `restEndsAtRef <= Date.now()` | bip/vibration, message et `restDone=true` | Repos terminé | dépend des capacités navigateur ; progression de séance reste intacte |
| En cours | terminer | aucune obligation `allDone` observée | ouvre le récapitulatif de confirmation | Confirmation de fin | une séance partielle peut être finalisée |
| Confirmation de fin | continuer | aucune | ferme la modale | En cours | aucun effet persistant |
| Confirmation de fin | supprimer puis confirmer | aucune | supprime `moovx_workout_draft`, appelle `onClose`, qui supprime `moovx_active_workout` | Abandonnée puis Aucune | aucune trace serveur d'abandon |
| Confirmation de fin | enregistrer | si séance modifiée, choix préalable « sauvegarder les modifications / cette fois » | `finish()` arrête le compteur, supprime le brouillon et appelle `onFinish` | Sauvegarde | aucun verrou ni attente du callback |
| Sauvegarde | première écriture de `onFinishWorkout` | session Auth encore présente | supprime `moovx_active_workout`; insère `workout_sessions` avec `user_id=session.user.id`, `completed=true` | Sauvegarde | si l'insert échoue, les caches de reprise ont déjà disparu |
| Sauvegarde | session détaillée créée | `savedSession` non nul | marque les planifications du jour, XP/streak, PR, insère `workout_sets`, badges et suggestions | Sauvegarde | étapes séquentielles non transactionnelles ; plusieurs erreurs sont journalisées ou ignorées |
| Sauvegarde | fin commune | session Auth présente | remarque les planifications, met `profiles.last_workout_at`, insère éventuellement `completed_sessions`, recharge le dashboard | Terminée locale | un échec n'annule pas les étapes précédentes ; `completed_sessions` est seulement journalisé en erreur |
| Terminée locale | choix template ou refus, fermeture ou délai | `finish()` déjà appelé | insertion facultative dans `custom_programs`; `done=true`; `onClose` | Aucune | l'échec template n'est pas mappé à un état de séance |

## Sources d'autorité et identité

### Mémoire et stockage local

- `workoutSession` est l'enveloppe de lancement : `name`, `exercises`,
  `startedAt`, `weekdayKey?`.
- `moovx_active_workout` est une copie de cette enveloppe, restaurée au montage
  de `useClientDashboard`. Elle ne contient ni identifiant utilisateur, ni
  version, ni progression détaillée.
- `moovx_workout_draft` contient `sessionName`, `startedAt`, `savedAt` et tout
  `exos`, séries comprises. Sa validité repose sur le nom et une limite de
  24 heures, pas sur l'owner.
- les identifiants d'exercices et de séries en mémoire sont générés avec
  `Math.random`; ils ne deviennent pas les UUID des lignes serveur.
- le repos et son échéance ne sont qu'en mémoire. `startedAt` permet de
  recalculer la durée globale après restauration de l'enveloppe, mais le
  brouillon détaillé ne remplace pas lui-même l'enveloppe active.

Le stockage local est un mécanisme de continuité d'interface, jamais une
preuve d'identité ou d'ownership.

### Tables persistantes

| Table | Rôle actuel | Colonnes utilisées dans ce flux | Ce qu'elle ne prouve pas |
|---|---|---|---|
| `workout_sessions` | historique détaillé racine | `id`, `user_id`, `name`, `completed`, `duration_minutes`, `notes`, `muscles_worked`, `created_at` | ne référence ni programme, ni séance prescrite, ni `scheduled_sessions` |
| `workout_sets` | faits par série rattachés à l'historique détaillé | `session_id`, `user_id`, `exercise_name`, `exercise_id`, `set_number`, `reps`, `weight`, `completed`, `rir`, `created_at` | le nom seul n'est pas une identité canonique ; les séries ne sont écrites qu'à la fin |
| `completed_sessions` | marqueur d'achèvement d'une séance de programme coach | `client_id`, `coach_id`, `program_id`, `session_index`, `session_name`, `duration_minutes`, `completed_at` | ne possède aucune FK vers `workout_sessions`; absence ou présence ne doit pas être fusionnée implicitement |
| `scheduled_sessions` | planification/calendrier et marqueur `completed` | `id`, `user_id`, `coach_id`, `client_id`, `title`, `session_type`, dates/heures, durées, `completed`, `completed_at`, rappel, notes, statut | la finalisation marque toutes les lignes non terminées du jour de l'utilisateur, sans lier une planification précise |

Les écritures `workout_sessions` et `workout_sets` passent par des clients
authentifiés et les policies `*_own` imposent `auth.uid() = user_id`. Le
marqueur `completed_sessions` impose `auth.uid() = client_id`. Dans le code, les
identifiants écrits viennent de `session.user.id`; les métadonnées du programme
ne remplacent pas cette identité.

## Finalisation et échecs partiels

L'ordre réellement observé est :

1. suppression des deux caches locaux (`moovx_workout_draft`, puis
   `moovx_active_workout`) ;
2. insertion de `workout_sessions` ;
3. si elle réussit : première mise à jour des `scheduled_sessions`, XP/streak,
   détection des PR, insertion groupée des `workout_sets`, badges et requêtes
   de suggestion de surcharge ;
4. seconde mise à jour des `scheduled_sessions`, même si la session racine n'a
   pas été créée ;
5. mise à jour de `profiles.last_workout_at` ;
6. insertion facultative de `completed_sessions` pour une affectation coach et
   un `weekdayKey` ;
7. notification de succès et rechargement du dashboard.

Cette chaîne n'est ni transactionnelle ni idempotente. Un double appel peut
créer deux `workout_sessions` et deux marqueurs `completed_sessions`. Une panne
après l'étape 2 peut laisser une session sans séries ; une panne avant l'étape
2 peut néanmoins marquer la planification et le profil, puisque le chemin
commun continue. Les caches de reprise sont supprimés avant confirmation de la
persistance. Aucun statut persistant ne distingue `saving`, `failed` ou
`partial`.

## Invariants actuels et invariants requis

### Garanties observées à préserver

- l'utilisateur de chaque écriture principale provient de la session Auth ;
- RLS borne les mutations `workout_sessions`/`workout_sets` à cet utilisateur ;
- seules les séries `done` sont envoyées à `onFinishWorkout` ;
- une série persistée référence la session racine renvoyée par l'insert ;
- `workout_sessions` et `completed_sessions` restent deux historiques
  indépendants ;
- une forme locale illisible est ignorée plutôt que transformée arbitrairement ;
- la reprise n'est proposée que pour le même nom, sous 24 heures, avec une
  progression effective.

### Invariants non garantis aujourd'hui

- un brouillon doit être lié à `clientId`, `executionId` et `formatVersion` ;
- une finalisation doit avoir une identité stable et être idempotente ;
- une exécution ne doit pas être déclarée terminée si sa session et ses séries
  ne sont pas cohérentes ;
- un marqueur de programme ou de calendrier doit référencer explicitement
  l'exécution qui l'a produit ;
- les transitions inconnues et les échecs partiels doivent être fail-closed et
  récupérables ;
- la suppression locale ne doit intervenir qu'après une persistance durable ou
  une décision explicite d'abandon ;
- les entrées legacy doivent être validées avant usage et ne pas devenir une
  autorité par leur seul nom.

## Divergences avec le modèle canonique

Le [modèle canonique](TRAINING_CANONICAL_MODEL.md) prévoit une
`SessionExecution` versionnée avec identité, client, références de prescription,
statut `planned | in-progress | completed | abandoned`, instants et
`ExerciseCompletion[]`. Le fonctionnement actuel diverge ainsi :

- aucune identité d'exécution n'existe avant l'insert final ;
- l'enveloppe, le brouillon, la session SQL et le marqueur coach n'ont pas de
  clé commune ;
- `completed=true` est écrit directement, sans état durable `in-progress` ;
- les snapshots de programme/révision/session/exercice sont incomplets ;
- les prescriptions et les faits utilisent encore des nombres et chaînes
  legacy plutôt que les unions canoniques d'unités ;
- les séries partielles ne portent pas de statut canonique `skipped`/`partial` ;
- `scheduled_sessions` représente une planification mais ne pointe pas vers
  l'exécution ;
- aucune transition durable ne représente abandon, reprise ou échec partiel ;
- le flux rapide de `TrainingTab` ne persiste pas `workout_sets`, contrairement
  au plein écran.

## Stratégie de migration progressive

1. **Caractériser** les transitions actuelles, notamment reprise, interruption,
   double soumission et chaque panne entre deux écritures.
2. **Extraire un modèle pur** de session et un réducteur de transitions sans
   changer le rendu ni les formats persistés.
3. **Versionner le brouillon local** avec owner et identifiant d'exécution, tout
   en lisant temporairement les deux clés legacy via adaptateur.
4. **Introduire une identité stable** avant le début de l'exécution et la
   propager aux faits, à la planification et aux marqueurs historiques par une
   migration additive.
5. **Extraire la sauvegarde/synchronisation** derrière un service idempotent ;
   conserver les anciennes tables en écriture compatible pendant la transition.
6. **Rendre la finalisation atomique** via une frontière serveur/RPC contrôlée,
   avec résultat explicite `completed`, `retryable` ou `partial` et sans
   supprimer le brouillon avant confirmation.
7. **Comparer silencieusement** les projections legacy et canoniques sur des
   fixtures avant toute bascule de lecture.
8. **Migrer séparément** le flux rapide `TrainingTab`, puis retirer les clés et
   écritures legacy seulement après une période de compatibilité et un rollback
   documenté.

## Couverture de caractérisation obtenue

Les tests ajoutés le 18 juillet 2026 figent le comportement sans prétendre que
les risques legacy sont des garanties cibles :

- [`workout-session-storage.test.ts`](../tests/unit/workout-session-storage.test.ts)
  couvre absence, création, restauration, nettoyage, expiration, caches
  incomplets, immutabilité et absence actuelle d'owner ;
- [`workout-session-transitions.test.ts`](../tests/unit/workout-session-transitions.test.ts)
  exerce directement les actions dashboard avec horloge, stockage et Supabase
  simulés : lancement programmé/libre, ordre complet des écritures, panne de
  session racine, calendrier, séries ou marqueur coach, répétition non
  idempotente et absence d'affectation ;
- [`workout-session-transitions-static.test.ts`](../tests/unit/workout-session-transitions-static.test.ts)
  garde le câblage des modifications de séries, du repos, de l'abandon, du flux
  rapide sans `workout_sets` et de l'absence de lien implicite entre les deux
  historiques.

La frontière pure [`workout-session-storage.ts`](../lib/training/workout-session-storage.ts)
centralise seulement les clés et les règles de sérialisation déjà présentes.
Elle ne lie pas encore le cache à l'utilisateur et ne versionne pas les données.
Les tests caractérisent aussi qu'un `savedAt` illisible est actuellement accepté
(`Invalid Date` produit `NaN`, donc la condition d'expiration ne s'active pas) ;
ce défaut n'est volontairement pas corrigé dans cette tranche.

Les transitions du minuteur restent gardées statiquement : les exécuter comme
hook nécessiterait l'environnement DOM actuellement bloqué par la combinaison
jsdom 29 / Node 24. Aucun graphe ESM fragile n'a été ajouté. La prochaine tranche
peut désormais extraire le modèle pur de session derrière cette couverture.

## Modèle pur extrait

[`workout-session-model.ts`](../lib/training/workout-session-model.ts) formalise
désormais la partie métier sans React, Next, Supabase, navigateur, stockage ni
JSX. Son union discriminée contient uniquement :

- `prepared` : prescription résolue et horodatée, pas encore commencée ;
- `in-progress` : séries et exercices éditables ;
- `resting` : repos actif avec début et échéance calculés par horloge injectée ;
- `rest-complete` : repos arrivé à terme, encore rattaché à sa série ;
- `abandoned` : état terminal local horodaté.

`done`, les modales, alertes et compteurs d'affichage restent de l'état UI.
`moovx_active_workout` et `moovx_workout_draft` restent gérés par la frontière
de stockage. Les écritures `workout_sessions`, `workout_sets`,
`completed_sessions` et `scheduled_sessions` restent dans l'action de
persistance legacy. Le modèle ne présente donc pas une réussite SQL comme un
état métier acquis.

Les décisions pures couvrent création libre/programmée, démarrage, modification
immutable d'une série, ajout/suppression d'exercice, repos, abandon et
préparation d'un snapshot de finalisation. Toute transition retourne soit un
nouvel état, soit un refus stable (`invalid_phase`, `exercise_not_found`,
`set_not_found`, `invalid_duration`, `invalid_input`). Les entrées legacy
compatibles passent par un adaptateur explicite ; une forme sans objet ou sans
nom est isolée comme `unsupported`.

Deux consommateurs représentatifs sont branchés sans changement public :

- le dashboard crée son enveloppe legacy via `createLegacyWorkoutLaunch` ;
- `WorkoutSession` calcule l'échéance de repos via
  `createWorkoutRestPeriod`.

Les risques historiques restent volontairement inchangés : chaîne SQL non
transactionnelle, double finalisation, historiques non liés, caches sans owner,
`savedAt` invalide accepté et divergences de schéma. La prochaine tranche doit
extraire timer, audio et wake lock autour de cette frontière, sans les confondre
avec l'état métier.

## Runtime temporel et effets navigateur extraits

La frontière pure [`workout-runtime.ts`](../lib/training/workout-runtime.ts)
calcule désormais la durée écoulée et le temps de repos restant à partir d'une
horloge injectée. `WorkoutRuntimeController` possède les intervalles, l'échéance
absolue du repos, le franchissement de l'avertissement à cinq secondes et la fin
unique. Il ne dépend ni de React, ni du navigateur, ni de Supabase.

Les effets sont exposés par six ports typés : horloge, scheduler, audio,
vibration, wake lock et visibilité. Leur implémentation navigateur vit dans
[`workout-runtime-browser.ts`](../lib/training/workout-runtime-browser.ts). Le
hook étroit [`useWorkoutRuntime.ts`](../app/hooks/useWorkoutRuntime.ts) relie ces
ports à l'état de présentation de `WorkoutSession`. Le hook historique
`useWakeLock` et le minuteur rapide de `TrainingTab` utilisent également les
ports wake lock, audio et vibration ; leur algorithme de décompte reste distinct
afin de ne pas modifier le comportement observé.

Le runtime plein écran conserve les règles legacy suivantes : tick de repos
toutes les 200 ms à partir d'une échéance absolue, avertissement à cinq secondes,
sons planifiés existants, vibration d'avertissement et de fin, recalcul au retour
de visibilité ou au focus, et maintien de l'écran actif pendant la séance. Une
annulation, un redémarrage, une finalisation ou un démontage annule les
intervalles et sons en attente puis libère le wake lock. Le setup et le nettoyage
sont idempotents pour supporter le double cycle de React Strict Mode. Les API
absentes ou refusées échouent silencieusement sans interrompre la séance ; le
fallback vidéo iOS existant reste borné à l'adaptateur wake lock.

Les minuteurs de présentation non liés au runtime de séance restent locaux :
redirection post-séance, fermeture automatique d'alerte, célébration, debounce
de recherche et exécuteur de tempo. Ils n'acquièrent ni audio de repos ni wake
lock et ne sont donc pas fusionnés artificiellement avec le runtime métier.

La persistance demeure inchangée. Le runtime ne lit ni n'écrit
`moovx_active_workout`, `moovx_workout_draft`, `workout_sessions`,
`workout_sets`, `completed_sessions` ou `scheduled_sessions`. Les dettes de
finalisation non transactionnelle/non idempotente, de caches sans owner et de
`savedAt` invalide restent à traiter séparément. La prochaine tranche est
l'extraction de la sauvegarde et de la synchronisation.

## Sauvegarde et synchronisation extraites

La frontière [`workout-persistence`](../lib/training/workout-persistence/)
centralise désormais les écritures de fin de séance sans React, JSX ni accès
direct au navigateur. Le service reçoit explicitement l'identité déjà issue de
la session authentifiée, une horloge, un port de stockage local et des ports
séparés pour `workout_sessions`, `workout_sets`, `completed_sessions`,
`scheduled_sessions` et la projection `profiles.last_workout_at`. L'adaptateur
Supabase est isolé dans `supabase-port.ts` et ne renvoie jamais le message brut
du fournisseur.

Le flux détaillé conserve exactement l'ordre legacy suivant :

1. tentative de suppression de `moovx_active_workout` ;
2. insertion de `workout_sessions` ;
3. première mise à jour de `scheduled_sessions` si la session racine existe ;
4. gamification et détection des records ;
5. insertion de `workout_sets` si des séries existent ;
6. badges et suggestion de surcharge ;
7. seconde mise à jour de `scheduled_sessions`, même si la session racine a
   échoué ;
8. synchronisation de `profiles.last_workout_at` ;
9. insertion éventuelle du marqueur `completed_sessions`, sans lien vers
   `workout_sessions`.

Cette duplication de planification et la poursuite après certaines erreurs ne
sont pas des règles cibles : elles sont conservées pour éviter un changement de
comportement dans une tranche d'extraction. Une erreur de synchronisation du
profil reste bloquante avant le marqueur de complétion. Les erreurs de session,
planning, séries et marqueur sont rapportées comme états partiels nécessitant
une future réconciliation.

Le résultat discriminé distingue `complete`, `before_persistence_failure`,
`session_create_failed`, `after_session_failure`, `sets_failed`,
`completion_marker_failed`, `schedule_failed` et
`partial_reconciliation_required`. Il contient uniquement des codes stables,
l'identifiant local de session lorsqu'il existe et le besoin de
réconciliation ; aucun message SQL, token ou contenu personnel brut n'est
propagé. Aucun jeton d'idempotence n'est encore produit : deux appels créent
toujours deux sessions et, lorsque applicable, deux marqueurs.

Le flux rapide de `TrainingTab` utilise la même frontière de création de
session mais n'écrit toujours pas `workout_sets`. Son nettoyage des clés
`moovx-sets-*` et `moovx-inputs-*`, ses records, son reset React et son
`fetchAll()` restent après la tentative d'insertion, comme auparavant.

[`workout-draft-sync.ts`](../lib/training/workout-draft-sync.ts) orchestre la
sauvegarde, la restauration et la suppression de `moovx_workout_draft` avec un
stockage et une horloge injectés. Les entrées restent non mutées. Le cache actif
est toujours supprimé avant la première écriture distante, même si celle-ci
échoue ; le brouillon détaillé est toujours supprimé par `WorkoutSession` avant
l'appel de finalisation. Ces nettoyages précoces sont explicitement conservés
malgré le risque de perte de reprise.

La future idempotence pourra être ajoutée derrière les ports sans modifier les
composants, mais elle exige encore une identité durable d'exécution, une
transaction/RPC et un mécanisme de réconciliation. Aucun de ces correctifs n'est
introduit ici.

## Présentation extraite par phase

Les branches visuelles de `WorkoutSession` sont désormais isolées dans
[`app/components/training/workout-session`](../app/components/training/workout-session/).
Elles reçoivent uniquement des données typées et des callbacks ; l'identité,
Supabase, le stockage local, le runtime audio/vibration/wake lock et les
mutations restent dans l'orchestrateur et les frontières déjà documentées.

| État observable | Vue dédiée | Autorité conservée hors vue |
|---|---|---|
| séance active | `WorkoutActiveSessionHeaderView` et `WorkoutActiveSessionFinishView` | horloge runtime, progression calculée, ouverture de finalisation |
| reprise d'un brouillon | `WorkoutDraftResumeView` | lecture/suppression/restauration du stockage |
| repos actif | `WorkoutActiveRestView` | échéance, intervalle, sons et RIR courant |
| repos terminé | `WorkoutRestCompleteView` | arrêt/redémarrage du runtime et message suivant |
| validation d'une série atypique | `WorkoutRepetitionsWarningView` | décision de validation et mutation de la série |
| confirmation de fin | `WorkoutEndConfirmationView` | finalisation, sauvegarde du modèle et persistance |
| confirmation d'abandon | `WorkoutAbandonConfirmationView` | arrêt runtime, nettoyage du brouillon et fermeture |
| proposition de modèle | `WorkoutTemplateSaveView` | construction et écriture du modèle |
| séance terminée | `WorkoutCompletionView` | données de résumé, fermeture et décompte de redirection |

L'éditeur détaillé des exercices et séries reste composé dans
`WorkoutSession` : il contient encore la gestuelle de réordonnancement, les
variantes, le tempo et plusieurs popups legacy. Cette dette est volontairement
préservée ; la tranche n'introduit ni redesign ni nouveau contrat métier. Une
seule phase racine (`active` ou `completed`) est rendue à la fois, tandis que les
confirmations et le repos restent des surcouches compatibles avec l'état actif.

Les vues extraites conservent les styles inline, textes, dimensions mobiles,
z-index, boutons et ordre d'information existants. Des tests de rendu serveur
couvrent les données minimales et complètes, les champs optionnels, le repos,
les séries complétées et le résumé ; un inventaire statique interdit Supabase,
storage et effets runtime dans ces composants.

## Interruption, reprise et arrière-plan mobile

La suite déterministe
[`workout-mobile-interruption.test.ts`](../tests/unit/workout-mobile-interruption.test.ts)
caractérise la continuité mobile sans navigateur système, réseau ou base. Elle
utilise une horloge et un scheduler manuels, un stockage mémoire, une visibilité
simulée et des ports audio, vibration et wake lock factices.

Le comportement observé est le suivant :

- `moovx_active_workout` restaure l'enveloppe de lancement après rechargement ;
- `moovx_workout_draft` restaure les séries du même nom si le JSON contient un
  tableau `exos` et si son âge calculable ne dépasse pas 24 heures ;
- un cache absent, illisible, incomplet, d'un autre nom ou expiré est isolé et
  renvoie `null` sans exception ;
- un `savedAt` invalide reste actuellement accepté parce que la comparaison
  avec `NaN` ne dépasse jamais la limite ;
- aucun des deux caches ne contient d'owner : un changement d'utilisateur ne
  peut donc pas être distingué par la frontière actuelle ;
- pendant un passage `hidden`, le scheduler navigateur peut être suspendu, mais
  le retour visible recalcule le repos depuis `restEndsAtMs` et l'horloge
  absolue, sans soustraire un nombre supposé de ticks ;
- un retour avant échéance émet le temps réellement restant ; un retour après
  échéance termine le repos une seule fois et ne duplique ni son, ni vibration,
  ni callback ;
- le contrôleur ne libère pas explicitement le wake lock à l'événement
  `hidden`. Il caractérise la perte comme relevant du navigateur, puis tente une
  nouvelle acquisition au retour visible ; `stop()` et `unmount()` libèrent la
  ressource ;
- indisponibilité ou refus audio/wake lock sont absorbés sans interrompre la
  séance ;
- abandon, arrêt et démontage annulent les timers et sons, nettoient le listener
  de visibilité et libèrent le wake lock ; le double setup/cleanup Strict Mode
  reste idempotent ;
- après reprise, la préparation de finalisation reste possible à partir des
  séries complétées, puis les deux caches sont nettoyés selon le contrat legacy.

Ces tests documentent, sans les corriger, les caches non owner-scoped, le
`savedAt` invalide, l'absence de persistance du repos, la finalisation non
idempotente et la chaîne SQL non transactionnelle. Aucun test navigateur mobile
n'est nécessaire tant que ces frontières pures représentent fidèlement les
événements de visibilité et la suspension du scheduler.
