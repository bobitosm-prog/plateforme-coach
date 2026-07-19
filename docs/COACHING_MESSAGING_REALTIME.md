# Audit du module messaging et realtime

## Statut

Le prérequis schéma/RLS est sécurisé. L'extraction reste ouverte : aucun
consommateur n'a encore été migré et les compteurs realtime restent inchangés.

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

Les formes UI sont non typées (`any[]`) et la déduplication n'est pas uniforme :
le dashboard coach déduplique les inserts realtime par `id`, tandis que
`useMessages` et `useClientDetail` peuvent ajouter un événement déjà relu.

## Inventaire des accès avant extraction

| Mesure applicative | Nombre | Emplacements |
|---|---:|---|
| accès directs `messages` | 12 | 3 hooks |
| créations de channel | 5 | 3 hooks |
| appels `.subscribe()` messaging | 5 | 3 hooks |
| nettoyages `removeChannel` | 5 | 3 hooks |
| handlers `postgres_changes` | 7 | 3 hooks |

La tranche n'ayant migré aucun consommateur, les compteurs après audit restent
identiques. Ce choix évite de modifier le contrat visible avant résolution des
blocages.

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

Chaque effet appelle `removeChannel` au nettoyage. L'idempotence Strict Mode,
la reconnexion et les channels orphelins doivent être testés dans la tâche
roadmap suivante, après extraction effective.

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

Le module `lib/coaching/messaging` peut maintenant centraliser
modèle, schéma Zod, repository, service, port realtime et hook React sans
inventer de contrat ni affaiblir la sécurité.

## Périmètre préservé

- aucune route, donnée distante ou E2E modifiée ;
- aucun appel réseau externe ;
- calendrier Coaching et chat Athena inchangés ;
- notifications push inchangées ;
- changements concurrents hors périmètre.
