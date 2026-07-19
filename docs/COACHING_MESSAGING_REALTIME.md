# Audit du module messaging et realtime

## Statut

Le module humain est extrait et les trois consommateurs sont migrés. Le chat
Athena reste séparé. Les cycles d'abonnement, reconnexion, changement de portée
et nettoyage sont maintenant caractérisés par une matrice déterministe.

## Sources d'autorité et formats observés

La seule table de messagerie humaine est `public.messages`. `chat_ai_messages`
appartient au chat Athena et reste hors périmètre.

Le schéma canonique local et `lib/supabase/database.types.ts` exposent :

| Colonne | Type | Usage |
|---|---|---|
| `id` | UUID | identité du message |
| `sender_id` | UUID | auteur |
| `receiver_id` | UUID | destinataire |
| `content` | texte non nul | corps du message |
| `read` | booléen non nul | accusé de lecture |
| `created_at` | timestamptz non nul | ordre temporel |
| `image_url` | texte nullable | chemin d'objet storage historique |

Les trois consommateurs UI utilisent en plus `image_url` :

- `useMessages` et `MessagesTab` côté client ;
- `useCoachDashboard` et les vues de conversation coach ;
- `useClientDetail` et `ClientMessages` côté détail client.

Ils ajoutent `image_url` aux inserts, le lisent depuis `select('*')`, construisent
des messages optimistes avec ce champ et affichent une image de message. Cette
colonne est désormais canonisée par la migration additive
`20260719160000_secure_messages.sql`, sans réécriture ni validation d'URL qui
casserait les chemins historiques. Son accès hérite de l'ownership du message.

## Contrats UI actuels

- messages ordonnés par `created_at` ascendant ;
- limites de 50 côté client et 100 dans les vues coach ;
- message optimiste identifié par le préfixe `opt-` ;
- texte vide accepté uniquement avec une image ;
- accusé de lecture borné à `receiver_id = utilisateur courant`,
  `sender_id = interlocuteur`, `read = false` ;
- notification push après l'insert, non transactionnelle ;
- échec de push ignoré ;
- polling client toutes les 30 secondes et coach toutes les 120 secondes ;
- aucun typing, presence, conversation ID, curseur ou suppression UI observé.

Les états messages sont désormais typés. La frontière pure valide, déduplique
par `id` et ordonne par `created_at`, puis `id`; les événements malformés ou
étrangers sont ignorés avant mutation de l'état.

## Inventaire des accès avant extraction

| Mesure applicative | Nombre | Emplacements |
|---|---:|---|
| accès directs `messages` | 12 | 3 hooks |
| créations de channel | 5 | 3 hooks |
| appels `.subscribe()` messaging | 5 | 3 hooks |
| nettoyages `removeChannel` | 5 | 3 hooks |
| handlers `postgres_changes` | 7 | 3 hooks |

Après extraction, ces compteurs sont tous à zéro dans les consommateurs. Les
six accès directs nécessaires vivent dans le repository; les cinq instances de
channel historiques sont créées par deux méthodes de l'adaptateur realtime.
Les cinq subscriptions et nettoyages sont donc conservés au runtime, tandis que
les trois handlers déclaratifs de l'adaptateur couvrent les sept handlers
instanciés historiques.

## Channels et filtres actuels

### Client

`messages-${userId}` écoute les inserts filtrés sur
`receiver_id = userId`. Un polling relit la paire client/coach.

### Détail client côté coach

`coach-msg-${clientId}` écoute les inserts reçus par le coach, puis filtre
l'auteur dans le callback.

### Dashboard coach

- `coach-chat-in-${coachId}-${clientId}` : insert et update reçus par le coach ;
- `coach-chat-out-${coachId}-${clientId}` : update des messages envoyés ;
- `coach-global-${coachId}` : insert et update reçus pour compteurs et aperçu.

Chaque effet appelle `removeChannel` au nettoyage. L'adaptateur désactive son
callback avant de demander la suppression du channel : un payload ou statut
tardif ne peut donc plus atteindre le consommateur après cleanup.

## Autorisation historique avant durcissement

Les migrations installent sept policies effectives, dont plusieurs doublons.
Elles vérifient uniquement que `auth.uid()` est auteur ou destinataire. Elles ne
consultent jamais `coach_clients`, ne requièrent pas `status = 'active'` et ne
refusent donc pas au niveau base :

- client vers client ;
- coach vers coach ;
- relation inactive, étrangère ou absente.

Le rôle `authenticated` possède en outre les grants complets de table ; la
policy `messages_coach_rw FOR ALL` autorise notamment une suppression par un
auteur ou destinataire, bien qu'aucune UI ne l'expose. Une vérification dans un
service client améliorerait les producteurs migrés, mais ne supprimerait pas
l'autorité directe existante ni ne satisferait la défense en profondeur
attendue.

## Correction préalable appliquée

Le contrat appliqué est :

1. trois policies séparées SELECT/INSERT/UPDATE, sans `FOR ALL`, exigent une
   paire coach/client activement liée ;
2. INSERT impose l'auteur authentifié et refuse les rôles incompatibles et les
   clients `invited` ;
3. UPDATE est limité au destinataire, à `read` et au passage `false → true` ;
4. `anon` n'a aucun grant, `authenticated` aucun DELETE, et `service_role`
   conserve ses opérations serveur ;
5. la matrice SQL dédiée et la preuve PostgREST JWT locale couvrent relations,
   rôles, colonnes immuables et grants.

## Architecture extraite

- `types.ts`, `schema.ts` et `model.ts` portent le message canonique, la
  validation stricte, l'appartenance à une paire, le tri et la déduplication ;
- `repository.ts` injecte le client typé, dérive l'auteur via `auth.getUser()`,
  emploie des projections explicites, borne les lectures et expurge les erreurs ;
- `service.ts` valide contenu/image, insère avant notification et conserve le
  message si la notification échoue ;
- `realtime-port.ts` et `supabase-realtime.ts` isolent channels, filtres,
  validation des payloads et arrêt idempotent ;
- `controller.ts` formalise un setup/cleanup idempotent compatible Strict Mode.

Les consommateurs migrés sont `useMessages`, `useCoachDashboard` et
`useClientDetail`. Polling 30 s/120 s, optimistic UI, images, scroll, compteurs,
read receipts, titres/corps/URLs de notification et contrats publics sont
préservés.

## Matrice de cycle de vie validée

Les suites `coaching-messaging-lifecycle`, `coaching-messaging-realtime` et
`coaching-messaging-consumer-lifecycle-static` couvrent :

- stop avant start, start/stop idempotents, cycles répétés et séquence Strict
  Mode setup/cleanup/setup/cleanup ;
- générations invalidées lors des changements rapides A → B → A ;
- un seul channel par appel actif, une seule destruction par channel et aucun
  callback message/statut après stop ;
- statuts `SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR`, `TIMED_OUT`, puis retour à
  `SUBSCRIBED`, sans recréer de channel dans l'adaptateur ;
- payloads absents, malformés, étrangers, dates invalides et images de type
  incompatible refusés sans throw ;
- déduplication par ID entre chargement, polling et realtime, update remplaçant
  insert, égalité de date ordonnée par ID et conservation de `image_url` ;
- invalidation des chargements obsolètes dans les trois consommateurs,
  nettoyage des pollings 30 s/120 s et déduplication des compteurs non lus.

Deux défauts démontrés ont reçu une correction minimale : l'adaptateur pouvait
encore livrer un callback capturé après `removeChannel`, et les chargements
asynchrones pouvaient appliquer une réponse d'une ancienne identité/relation.
Le compteur global pouvait aussi être incrémenté deux fois pour le même INSERT
rejoué ; les IDs realtime déjà comptés sont désormais bornés au cycle actif.

La reconnexion reste celle du client Supabase : le module observe les statuts
mais n'ajoute aucun scheduler ou protocole de retry parallèle. Cela évite les
channels multiples tout en laissant Supabase réabonner son channel existant.

## Limites reportées

Aucun protocole de retry applicatif, typing, presence ou conversation n'est
introduit. La validité d'une relation active demeure garantie par repository et
RLS ; le callback ne transporte pas à lui seul un snapshot de relation. Les
tests unitaires simulent les statuts Realtime ; l'E2E local vérifie le parcours
coach/client mais ne force pas une coupure WebSocket réseau reproductible.

## Périmètre préservé

- aucune route, migration, RLS, donnée distante ou E2E modifiée ;
- aucun appel réseau externe ;
- calendrier Coaching et chat Athena inchangés ;
- notifications push inchangées ;
- changements concurrents hors périmètre.
