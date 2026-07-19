# Module calendrier Coaching

## Périmètre

Le module `lib/coaching/calendar` centralise le calendrier partagé entre un
coach et ses clients autour de la table `coach_appointments`. Il ne représente
pas le calendrier d'entraînement : `scheduled_sessions` reste une frontière
Training distincte, avec ses propres colonnes, producteurs et politiques.

| Source | Autorité | Usage actuel |
|---|---|---|
| `coach_appointments` | coach propriétaire, lecture du client concerné | rendez-vous coach/client |
| `scheduled_sessions` | utilisateur Training selon les policies existantes | programmation et complétion des séances Training |
| état React des dashboards | non autoritaire | formulaire, semaine visible, rendez-vous sélectionné |
| `/api/send-notification` | effet secondaire après création réussie | notification du client |

Les deux tables ne sont ni fusionnées, ni dédupliquées, ni converties l'une
vers l'autre.

## Contrats

### Modèle

`CoachAppointment` est une projection explicite de `coach_appointments` :
`id`, `coach_id`, `client_id`, `scheduled_at`, `duration_minutes`,
`session_type`, `location`, `notes`, `status` et `created_at`.

Le seul état réellement produit et compris aujourd'hui est `scheduled`. Un
état persistant inconnu est refusé par le service au lieu d'être normalisé.
Le comportement historique de suppression reste un `DELETE` définitif : il
n'existe pas encore de transition `cancelled`, `completed` ou `rescheduled`.

Le modèle pur :

- convertit une date et une heure civiles avec un fuseau IANA explicite ;
- refuse les heures locales inexistantes ou ambiguës aux changements DST ;
- impose une durée entière strictement positive ;
- borne les périodes à 366 jours et les listes à 100 lignes ;
- trie par `scheduled_at`, puis par `id` pour les égalités ;
- ne détecte pas encore les chevauchements.

### Repository

`createCoachAppointmentRepository(client)` reçoit un `DatabaseClient` injecté.
Il n'instancie aucun client et expose :

- `listForCoach` et `listForClient`, avec période et limite explicites ;
- `findByIdForCoach`, borné par le coach ;
- `createForCoach`, avec retour de la projection complète ;
- `deleteForCoach`, borné par rendez-vous et coach.

Les erreurs passent par `RepositoryResult` et ne conservent aucun message SQL,
payload ou donnée personnelle.

### Service et autorité

`createCalendarService` reçoit les repositories rendez-vous et relation, une
horloge, un fuseau et un port de notification. L'acteur est dérivé par le
consommateur depuis la session active ; un `coachId` ou `clientId` de formulaire
n'est jamais une preuve d'autorité.

- un coach liste uniquement ses rendez-vous ;
- un client liste uniquement les rendez-vous dont il est le client ;
- la création requiert un acteur coach et une relation active avec le client ;
- la suppression relit le rendez-vous côté coach puis exige encore la relation
  active avant le `DELETE` ;
- la RLS reste la seconde barrière et n'est pas modifiée par cette extraction.

Le navigateur compose ce service via `createCalendarClientAdapter`. Le client
Supabase conserve donc les droits de la session et aucun `service_role` n'est
introduit.

## Notification et compatibilité UI

Après une insertion réussie, le port envoie sans bloquer la réussite :

```json
{
  "userId": "<client lié>",
  "title": "Nouvelle séance planifiée",
  "body": "<type> · <date> à <heure>",
  "url": "/"
}
```

L'endpoint reste `/api/send-notification`. Une panne de notification ne défait
pas le rendez-vous déjà créé, comme avant l'extraction. Les erreurs exposées par
les consommateurs sont expurgées.

Les consommateurs migrés sont :

- `useCoachDashboard` : semaine du coach, création et suppression ;
- `HomeTab` : dix prochains rendez-vous du client et nom du coach visible via
  `active_related_profiles`.

Le rendu, les textes, les callbacks, le rafraîchissement après mutation et le
payload de notification restent identiques. La lecture client est désormais
explicitement bornée à 366 jours ; cette borne évite une requête future sans
limite temporelle et peut exclure un rendez-vous situé au-delà d'un an.

## Accès directs avant/après

Avant l'extraction, deux fichiers applicatifs contenaient quatre appels directs
à `coach_appointments`. Après migration, aucun accès direct applicatif ne
subsiste ; les cinq opérations Supabase sont centralisées dans le repository.
Les cinq fichiers applicatifs/ports qui utilisent `scheduled_sessions` restent
inchangés.

## Limites et prochaines décisions

- pas de détection de chevauchement ou de contrainte d'unicité temporelle ;
- pas d'update, annulation logique, complétion ou historique de transition ;
- création puis notification non transactionnelles ;
- suppression définitive et non idempotente au niveau métier ;
- fuseau pris depuis le navigateur, avec repli `Europe/Zurich`, faute de fuseau
  de profil canonique dans ce contrat ;
- aucune pagination au-delà des limites actuelles ;
- les règles de rappel de `scheduled_sessions` ne s'appliquent pas aux
  rendez-vous Coaching.

La prochaine tranche doit extraire le module messaging/realtime sans étendre le
calendrier ni rapprocher artificiellement les deux domaines.
