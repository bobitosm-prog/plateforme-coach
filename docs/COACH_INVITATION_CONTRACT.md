# Contrat d'invitation coach à usage unique — MoovX

> Statut : spécification normative prête à implémenter.  
> Version : 1.0 — 11 juillet 2026.  
> Portée : invitations permettant à un coach de rattacher un client et de lui accorder l'accès `invited`.  
> Hors portée : assignation automatique au coach par défaut, facturation, migration SQL et modification des routes existantes.

## 1. Problème actuel

Les tests de caractérisation de `POST /api/assign-coach` démontrent qu'un utilisateur authentifié peut fournir un `coachId` sans qu'aucune invitation enregistrée ne soit exigée. La route utilise correctement `user.id` comme identité du client, mais considère le `coachId` du navigateur comme autorisé, crée la relation `coach_clients` avec `service_role` et active :

```text
subscription_status = active
subscription_type = invited
trial_ends_at = null
```

La mise à jour du profil et l'upsert de la relation sont séparés. Une erreur de profil peut être ignorée et une erreur de relation peut laisser le profil déjà modifié. Le contrat doit remplacer le `coachId` comme preuve par une invitation serveur vérifiable et consommable atomiquement.

## 2. Objectifs métier et invariants

Le système doit garantir les invariants suivants :

1. Seul un utilisateur authentifié dont le profil serveur a le rôle exact `coach` peut créer une invitation.
2. Chaque invitation cible une adresse email normalisée déterminée à la création.
3. Une invitation expire sept jours après sa création.
4. Un jeton ne peut réussir qu'une fois, y compris sous requêtes concurrentes.
5. Le coach provient exclusivement de `coach_invitations.coach_id`.
6. Le client provient exclusivement de `auth.uid()`.
7. L'email vérifié du compte doit correspondre à l'email de l'invitation.
8. L'accès `invited` n'est accordé qu'après toutes les validations.
9. Consommation, profil et relation coach/client appartiennent à une seule transaction PostgreSQL.
10. Tout échec annule toutes les mutations.
11. Une invitation révoquée, expirée ou consommée est refusée.
12. Le jeton brut n'est ni stocké, ni journalisé, ni renvoyé après la réponse de création.
13. Un UUID de coach, `clientId`, `autoAssign` ou une valeur d'abonnement envoyée par le navigateur ne constitue jamais une autorité.

## 3. Acteurs et permissions

`Administrateur` désigne ici le rôle serveur `super_admin`. Aucun droit ne doit être dérivé de métadonnées fournies par le navigateur.

| Acteur | Créer | Lire | Révoquer | Consommer | Voir l'email destinataire | Créer la relation / activer `invited` |
|---|---|---|---|---|---|---|
| Anonyme | Non | Validation publique minimale seulement | Non | Non | Non | Non |
| Utilisateur standard | Non | Sa validation minimale via jeton | Oui, seulement consommer si bénéficiaire | Oui si bénéficiaire vérifié | Non | Uniquement via la RPC |
| Client déjà `invited` | Non | Validation minimale | Non | Non : ne pas déplacer silencieusement le coach | Non | Non |
| Compte lifetime | Non | Validation minimale | Non | Non : ne pas dégrader son accès | Non | Non |
| Coach | Oui pour lui-même | Ses invitations | Ses invitations `pending` | Non | Oui pour ses invitations | Non directement |
| Coach propriétaire | Oui | Oui | Oui tant que `pending` | Non | Oui | Non directement |
| Autre coach | Non sur l'invitation | Non | Non | Uniquement s'il est lui-même le bénéficiaire, ce qui est refusé par la règle de profil | Non | Non |
| Administrateur | Non par défaut | Oui via interface explicitement auditée | Oui avec motif audité | Non | Oui si nécessaire au support | Non directement |
| Destinataire non inscrit | Non | Validation publique minimale | Non | Non avant création et vérification du compte | Non | Non |
| Destinataire déjà inscrit | Selon son rôle, sans rapport avec l'invitation | Validation minimale | Non | Oui si email vérifié correspondant et profil éligible | Sa propre adresse seulement | Uniquement via la RPC |

Principes supplémentaires :

- Un coach ne peut agir que sur les invitations dont `coach_id = auth.uid()`.
- L'administrateur n'est pas un coach implicite et ne peut pas créer une invitation au nom d'un coach dans la version 1.
- Le destinataire ne lit jamais la ligne complète. Il obtient une réponse minimale calculée à partir du jeton.
- Aucun acteur ne modifie directement `subscription_type`, `subscription_status`, `trial_ends_at` ou `coach_clients` dans ce flux.

## 4. Modèle de données proposé

Table : `public.coach_invitations`.

| Colonne | Type PostgreSQL | Null / défaut | Index et contraintes | Raison métier |
|---|---|---|---|---|
| `id` | `uuid` | `NOT NULL DEFAULT gen_random_uuid()` | `PRIMARY KEY` | Identifiant interne et référence de révocation ; jamais une preuve. |
| `coach_id` | `uuid` | `NOT NULL` | FK `profiles(id)` ou `auth.users(id)`, `ON DELETE RESTRICT`; index | Coach propriétaire déterminé à la création. `RESTRICT` préserve l'audit et force une révocation avant suppression. |
| `recipient_email` | `text` | `NOT NULL` | `CHECK (recipient_email = lower(btrim(recipient_email)))`; index `(coach_id, recipient_email)` | Adresse normalisée utilisée pour l'autorisation. |
| `token_hash` | `bytea` | `NOT NULL` | `UNIQUE`; longueur contrôlée à 32 octets | Empreinte SHA-256 du secret ; recherche sans stocker le jeton brut. |
| `status` | `text` | `NOT NULL DEFAULT 'pending'` | `CHECK (status IN ('pending','consumed','revoked'))`; index partiel sur `pending` | État persistant minimal. L'expiration est calculée. |
| `invitation_type` | `text` | `NOT NULL DEFAULT 'coach_client'` | `CHECK (invitation_type = 'coach_client')` en V1 | Évite d'interpréter ultérieurement un autre type avec les mêmes privilèges. |
| `expires_at` | `timestamptz` | `NOT NULL` | index partiel sur les lignes `pending`; `CHECK (expires_at > created_at)` | Borne d'utilisation fixée à la création. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | index `(coach_id, created_at DESC)` | Audit et affichage coach. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | trigger ou mise à jour explicite | Audit de dernière transition. |
| `consumed_at` | `timestamptz` | nullable | cohérence avec `status` | Date de consommation réussie. |
| `consumed_by` | `uuid` | nullable | FK `auth.users(id) ON DELETE SET NULL`; index | Compte bénéficiaire issu de `auth.uid()`. |
| `revoked_at` | `timestamptz` | nullable | cohérence avec `status` | Date de révocation. |
| `revoked_by` | `uuid` | nullable | FK `auth.users(id) ON DELETE SET NULL` | Coach propriétaire ou administrateur ayant révoqué. |
| `metadata` | `jsonb` | `NOT NULL DEFAULT '{}'::jsonb` | `CHECK (jsonb_typeof(metadata) = 'object')` | Contexte non autoritatif : locale, campagne, source UI. Jamais rôle, coach, client ou abonnement. |
| `delivery_status` | `text` | `NOT NULL DEFAULT 'pending'` | `CHECK (delivery_status IN ('pending','sent','failed','skipped'))` | Distingue validité de l'invitation et résultat SMTP. |
| `delivery_attempted_at` | `timestamptz` | nullable | — | Diagnostic d'envoi sans modifier le cycle de vie. |

Contraintes de cohérence recommandées :

- `pending` implique `consumed_at`, `consumed_by`, `revoked_at` et `revoked_by` nuls.
- `consumed` implique `consumed_at` et `consumed_by` non nuls, révocation nulle.
- `revoked` implique `revoked_at` et `revoked_by` non nuls, consommation nulle.
- Une seule invitation `pending` non expirée par couple `(coach_id, recipient_email, invitation_type)` est imposée par la logique transactionnelle de création. Une contrainte d'exclusion temporelle serait disproportionnée ; les tests de concurrence restent obligatoires.
- Une relation active unique est déjà soutenue par l'unicité `(coach_id, client_id)` de `coach_clients`.

`recipient_email` reste du `text` normalisé plutôt que `citext`, afin de ne pas ajouter une extension uniquement pour ce contrat.

## 5. Statuts et cycle de vie

États persistés :

```text
pending ──consume──> consumed
pending ──revoke───> revoked
```

`expired` est un état effectif calculé par `status = 'pending' AND expires_at <= now()`. Il n'est pas persisté : cela évite un cron obligatoire et un état périmé. Les API peuvent retourner `effectiveStatus: 'expired'`, mais aucune transition `pending → expired` n'est nécessaire.

Transitions autorisées :

| Transition | Auteur | Conditions |
|---|---|---|
| création → `pending` | Coach authentifié | rôle coach, email valide, rate limit respecté |
| `pending` → `consumed` | Bénéficiaire via RPC | token, email vérifié, expiration, coach et profil éligibles |
| `pending` → `revoked` | Coach propriétaire | invitation non expirée ou expirée mais encore `pending` |
| `pending` → `revoked` | Administrateur | endpoint dédié, motif d'audit obligatoire |

Toutes les autres transitions sont interdites. `consumed` et `revoked` sont terminaux. Une invitation expirée peut être révoquée pour l'audit, mais jamais consommée. Une nouvelle invitation crée une nouvelle ligne et un nouveau jeton ; elle ne réactive jamais une ancienne ligne.

Une seconde consommation renvoie `INVITATION_ALREADY_USED`. Elle n'est pas considérée comme un succès idempotent, afin de signaler clairement la réutilisation du secret ; la base reste néanmoins inchangée.

## 6. Jeton

- Génération : `crypto.randomBytes(32)` côté serveur.
- Entropie : 256 bits.
- Encodage transport : Base64 URL-safe sans padding, soit 43 caractères.
- Durée par défaut : 7 jours exactement, calculée côté serveur.
- Stockage : `SHA-256(token_bytes)` dans `token_hash bytea` ; jamais le jeton encodé.
- Recherche : calcul SHA-256 côté serveur puis égalité sur l'index unique `token_hash`.
- Comparaison : égalité binaire en base. Si une comparaison applicative intervient, utiliser `timingSafeEqual` sur deux buffers de même longueur.
- URL : `/join?invitation=<base64url-token>`. Ajouter `Referrer-Policy: no-referrer`, retirer immédiatement le jeton de l'historique visible avec `history.replaceState`, et interdire sa journalisation dans les logs ou outils analytics.
- Exposition : le secret n'est renvoyé qu'une fois par la route de création, uniquement pour construire/envoyer le lien. Les endpoints de liste ne renvoient jamais `token_hash` ni le jeton.
- Rotation : pas de rotation in-place. Révoquer l'ancienne invitation et en créer une nouvelle.
- Fuite suspectée : révocation immédiate ; un nouveau jeton est nécessaire.

Le hash seul ne permet pas de reconstituer le jeton. SHA-256 convient car l'entrée possède une forte entropie ; un hash lent de mot de passe n'apporterait pas de protection utile ici.

## 7. Association au destinataire

### Choix : Option A, email strictement lié au compte authentifié

MoovX doit réserver le bénéfice à la personne invitée, pas au détenteur transféré du lien. Les options B et C permettraient le transfert du droit `invited` et ne satisfont pas l'objectif de contrôle coach/client.

Règles :

1. À la création, appliquer `trim`, normalisation Unicode NFKC et minuscules. Rejeter les caractères de contrôle et les adresses de plus de 254 caractères.
2. Ne pas appliquer de transformations spécifiques à un fournisseur (`+tag`, points Gmail) : elles peuvent fusionner des adresses distinctes.
3. À la consommation, utiliser uniquement l'email serveur de `auth.users`, jamais le profil ni le body.
4. Exiger `email_confirmed_at IS NOT NULL`. Pour OAuth, l'email doit être présent et confirmé par Supabase/provider.
5. Comparer les deux emails après la même normalisation.
6. Un utilisateur déjà inscrit peut consommer après connexion si son email vérifié correspond.
7. Un nouvel utilisateur conserve le jeton pendant inscription/OAuth puis le soumet après établissement de la session.
8. Si le destinataire change officiellement d'adresse avant consommation, le coach révoque et recrée l'invitation. Aucune réaffectation silencieuse.
9. Une absence d'email vérifié renvoie `INVITATION_EMAIL_UNVERIFIED`.

Cette règle protège contre le transfert du lien. Le lien reste un secret nécessaire, mais non suffisant sans le compte bénéficiaire.

## 8. Flux de création

Endpoint : `POST /api/coach/invitations`.

```text
Coach authentifié
→ createSupabaseRouteClient + auth.getUser()
→ lecture serveur profiles.role
→ validation Zod de recipientEmail et locale optionnelle
→ rate limit coach + IP
→ normalisation email
→ révocation/remplacement contrôlé du doublon pending
→ génération token 256 bits et hash SHA-256
→ insertion coach_invitations
→ construction du lien serveur
→ envoi via lib/email.ts
→ mise à jour delivery_status
→ réponse minimale
```

Entrée autorisée :

```ts
{
  recipientEmail: string
  locale?: 'fr' | 'en' | 'de' | 'it'
}
```

Le navigateur ne fournit pas `coachId`, `coachName`, `inviteLink`, statut ou durée. Le nom vient du profil serveur, l'URL de la configuration serveur et la durée d'une constante serveur.

Règles opérationnelles :

- Limite initiale : 10 créations par coach et par heure, 3 par destinataire et par 24 heures, avec `429` et `Retry-After`.
- Le rate limiting de sécurité doit être persistant avant ouverture large ; le helper mémoire actuel peut servir uniquement en défense locale complémentaire.
- Si une invitation `pending` non expirée existe pour le même coach/email, renvoyer `409 INVITATION_ALREADY_PENDING` sans révéler un nouveau jeton. Une action explicite « Renvoyer » révoque puis recrée avec rate limit.
- Une invitation expirée reste dans l'audit et une nouvelle ligne est créée.
- L'insertion précède SMTP. Si SMTP échoue, conserver l'invitation `pending`, poser `delivery_status='failed'`, renvoyer `502 INVITATION_DELIVERY_FAILED` avec `invitationId`, et permettre un renvoi contrôlé. Ne jamais supprimer l'invitation ni envoyer le jeton brut dans les logs.
- Si SMTP est non configuré hors production, `delivery_status='skipped'` est acceptable uniquement dans un environnement explicitement identifié ; en production, traiter cela comme un échec.
- Le template échappe toutes les valeurs avec une fonction commune ; la route actuelle `invite-client` ne doit pas être réutilisée telle quelle.

## 9. Flux de consommation

Endpoint : `POST /api/coach/invitations/consume`.

```text
Lien ouvert
→ validation minimale du format
→ authentification/inscription si nécessaire
→ token envoyé au serveur
→ auth.getUser()
→ SHA-256 du token
→ RPC consume_coach_invitation(token_hash)
→ verrouillage et validation de l'invitation
→ validation email et profil/coach
→ UPDATE profiles
→ UPSERT coach_clients
→ UPDATE invitation consumed
→ commit
→ réponse
```

Entrée unique :

```ts
{ token: string }
```

Les champs suivants sont interdits par le schéma strict et ignorés comme autorité à tous les niveaux : `coachId`, `clientId`, `autoAssign`, `subscription_type`, `subscription_status`, `trial_ends_at`.

Effets atomiques attendus :

- profil de `auth.uid()` : `role='client'`, `subscription_status='active'`, `subscription_type='invited'`, `trial_ends_at=NULL` ;
- relation : upsert `(coach_id de l'invitation, client_id=auth.uid(), status='active', invited_by_coach=true)` ;
- invitation : `status='consumed'`, `consumed_at=now()`, `consumed_by=auth.uid()`, `updated_at=now()`.

Éligibilité du profil :

- rôle absent ou `client` : autorisé ;
- rôle `coach` ou `super_admin` : refusé ;
- abonnement `lifetime`, `beta` actif ou abonnement Stripe actif : refusé pour éviter une dégradation ou ambiguïté commerciale ;
- déjà `invited` : refusé, même si le coach est identique ; une future fonction de rattachement doit être explicite ;
- relation déjà active avec ce coach sans statut invited : renvoyer `INVITATION_ALREADY_LINKED` et ne rien muter.

Après succès, le frontend retire le jeton de l'URL et poursuit vers l'onboarding invité. Une réponse échouée ne déclenche aucun fallback vers `coachId`.

## 10. Atomicité

### Comparaison

| Option | Avantages | Limites | Décision |
|---|---|---|---|
| Requêtes route + compensation | Simple en TypeScript | Fenêtres de panne, compensation faillible, concurrence difficile | Rejetée |
| RPC PostgreSQL transactionnelle | Transaction unique, verrouillage, `auth.uid()`, compatible avec la garde actuelle | SQL plus exigeant et tests DB nécessaires | **Recommandée** |
| Trigger à la consommation | Automatique | Effets implicites, erreurs moins lisibles, autorisation plus difficile à auditer | Rejetée |

La future fonction `public.consume_coach_invitation(p_token_hash bytea)` doit être `SECURITY DEFINER`, fixer explicitement `search_path` à `pg_catalog, public`, ne prendre aucun identifiant utilisateur/coach, et lire `auth.uid()`.

Algorithme transactionnel normatif :

1. Refuser si `auth.uid()` est nul.
2. Sélectionner l'invitation par `token_hash` avec `FOR UPDATE`.
3. Si absente, renvoyer une erreur générique invalide.
4. Vérifier `status`, `expires_at > clock_timestamp()` et `invitation_type`.
5. Lire l'email vérifié depuis l'identité Auth et le normaliser.
6. Comparer au destinataire.
7. Verrouiller les profils client et coach ; vérifier rôle coach exact et éligibilité client.
8. Mettre à jour le profil et vérifier qu'exactement une ligne est affectée.
9. Upsert la relation et vérifier le résultat.
10. Mettre l'invitation à `consumed` avec une condition supplémentaire `status='pending' AND expires_at > clock_timestamp()` ; vérifier une ligne affectée.
11. Retourner un résultat typé. Toute exception non métier annule la transaction.

Le `FOR UPDATE` sérialise deux consommations du même jeton. La seconde attend, puis observe `consumed` et échoue. La contrainte unique de `token_hash` protège les collisions et l'unicité de `coach_clients` protège les relations concurrentes. Aucun `EXCEPTION WHEN OTHERS` ne doit convertir une erreur après mutation en succès ; soit la fonction lève une exception contrôlée, soit elle retourne avant toute mutation.

## 11. RLS et privilèges futurs

Principes :

- RLS activée sur `coach_invitations` dès sa création.
- Le jeton brut n'existe pas en base ; `token_hash` n'est jamais exposé par une vue ou réponse API.
- `service_role` n'est pas nécessaire à la consommation. La RPC contrôlée contourne uniquement ce qui est nécessaire.
- La garde `guard_profile_sensitive_columns` reste en place ; la RPC `SECURITY DEFINER` est l'unique chemin d'écriture de ces colonnes pour ce flux.

| Opération | Coach | Client/destinataire | Administrateur | Anonyme |
|---|---|---|---|---|
| `SELECT` | Ses lignes, via projection excluant `token_hash` | Aucun accès direct | Vue/route auditée | Aucun |
| `INSERT` | Ses invitations uniquement, `coach_id=auth.uid()`, rôle coach | Non | Non par défaut | Non |
| `UPDATE` | Aucun UPDATE libre ; RPC de révocation limitée à ses lignes | Aucun ; consommation par RPC | RPC admin auditée | Non |
| `DELETE` | Non ; conservation d'audit | Non | Purge réglementaire contrôlée seulement | Non |

Recommandation : ne pas accorder `SELECT` direct sur la table aux rôles applicatifs si cela expose `token_hash`. Utiliser une vue `coach_invitations_public` sans hash, avec `security_invoker`, ou sélectionner une liste explicite côté route soumise aux RLS. `EXECUTE` sur la RPC de consommation est accordé uniquement à `authenticated`, jamais à `anon` ou `public`.

## 12. Contrat API futur

Format commun :

```ts
type ApiSuccess<T> = { success: true; data: T }
type ApiFailure = { success: false; error: { code: string; message: string } }
```

### `POST /api/coach/invitations`

- Authentification : session serveur obligatoire.
- Autorisation : profil `role === 'coach'`.
- Entrée Zod stricte : `{ recipientEmail: z.string().email().max(254), locale?: enum }`.
- Sortie `201` : `{ success: true, data: { invitationId, expiresAt, deliveryStatus } }`.
- Erreurs : `400`, `401`, `403`, `409`, `429`, `502`, `500`.
- Rate limit : coach + destinataire + IP.
- Ne retourne jamais : jeton après la phase interne d'envoi, hash, existence d'un compte, rôle ou abonnement du destinataire.

### `GET /api/coach/invitations/validate?token=...`

- Authentification : facultative ; aucune consommation.
- Entrée : token Base64URL strict, longueur 43.
- Sortie `200` générique : `{ success: true, data: { valid: boolean, requiresAuthentication: boolean, expiresAt?: string } }`.
- Pour invalide, expirée, révoquée ou consommée : même forme `{ valid: false }`, sans raison publique.
- Rate limit : IP + empreinte du token, agressif (`20/10 min` par IP par défaut).
- Ne retourne jamais : email, coachId, token hash, statut interne, existence d'un compte. Le nom public du coach peut être ajouté ultérieurement seulement après revue anti-énumération.

### `POST /api/coach/invitations/consume`

- Authentification : session serveur et email vérifié.
- Entrée Zod stricte : `{ token }` uniquement.
- Sortie `200` : `{ success: true, data: { coachId, onboarding: 'invited' } }` ; `coachId` est une information de résultat, jamais une entrée.
- Erreurs : `400`, `401`, `403`, `409`, `410`, `422`, `500` selon la table d'erreurs.
- Rate limit : utilisateur + IP, `10/10 min` par défaut.
- Ne retourne jamais : email destinataire, hash, données d'un autre compte, détails SQL.

### `POST /api/coach/invitations/:id/revoke`

- Authentification : session serveur.
- Autorisation : coach propriétaire ; admin via endpoint/admin séparé et audité.
- Entrée Zod : `{ reason?: string.max(200) }` ; l'ID vient du chemin et n'accorde aucun droit.
- Sortie `200` : statut `revoked`; second appel : `409` terminal.
- Rate limit : coach, `30/h` par défaut.
- Ne retourne jamais : token hash ou email si l'appelant n'est pas propriétaire.

### Sort de `POST /api/assign-coach`

La route est conservée temporairement comme adaptateur uniquement pour l'assignation au coach par défaut, sous un contrat séparé ne donnant jamais `invited`. Elle ne doit plus accepter le mode invitation. Le nouveau frontend appelle `/consume`.

Pendant la coexistence :

- payload avec `token` : peut être redirigé serveur vers le nouveau service si nécessaire ;
- payload avec `coachId` et `autoAssign !== true` : `410 LEGACY_INVITATION_DISABLED` après activation du flag ;
- `autoAssign: true` : migré vers un endpoint/RPC distinct dérivant le coach par défaut côté serveur ;
- après absence de trafic legacy vérifiée, supprimer l'adaptateur.

## 13. Codes d'erreur métier

Les messages utilisateur restent génériques. Les logs structurés contiennent `requestId`, `invitationId` interne si connu, `actorId`, code et état, mais jamais token/hash/email brut. L'email peut être journalisé uniquement sous empreinte HMAC dédiée.

| Code | HTTP | Message utilisateur | Journal interne autorisé |
|---|---:|---|---|
| `INVITATION_INVALID` | 400 | L'invitation n'est pas valide. | Format invalide ou hash absent, sans secret |
| `INVITATION_EXPIRED` | 410 | Cette invitation a expiré. | ID, coach, date d'expiration |
| `INVITATION_ALREADY_USED` | 409 | Cette invitation a déjà été utilisée. | ID, `consumed_by`, date |
| `INVITATION_REVOKED` | 410 | Cette invitation n'est plus disponible. | ID, auteur/date de révocation |
| `INVITATION_EMAIL_MISMATCH` | 403 | Ce compte ne peut pas utiliser cette invitation. | ID, IDs acteurs, HMAC des emails |
| `INVITATION_EMAIL_UNVERIFIED` | 403 | Vérifiez votre adresse email avant de continuer. | userId |
| `INVITATION_COACH_INVALID` | 422 | Cette invitation n'est plus disponible. | ID, coachId, rôle/absence |
| `INVITATION_RECIPIENT_INELIGIBLE` | 409 | Ce compte possède déjà un accès incompatible. | userId, type d'accès |
| `INVITATION_ALREADY_LINKED` | 409 | Ce compte est déjà lié à ce coach. | coachId, userId |
| `INVITATION_ALREADY_PENDING` | 409 | Une invitation est déjà en attente. | invitationId, coachId |
| `INVITATION_RATE_LIMITED` | 429 | Trop de tentatives. Réessayez plus tard. | clé HMAC, fenêtre, compteur |
| `INVITATION_DELIVERY_FAILED` | 502 | L'invitation a été créée mais l'email n'a pas pu être envoyé. | invitationId, erreur SMTP assainie |
| `INVITATION_CONSUMPTION_FAILED` | 500 | L'invitation n'a pas pu être appliquée. | requestId et erreur DB assainie |
| `LEGACY_INVITATION_DISABLED` | 410 | Ce lien doit être renouvelé par votre coach. | route/source legacy |

Pour la validation publique, toutes les causes terminales se réduisent à `valid: false`. Les codes détaillés ne sont exposés qu'après authentification et tentative de consommation afin de limiter l'énumération.

## 14. Compatibilité avec les parcours actuels

| Parcours actuel | Transition définie |
|---|---|
| `/join?coach=<UUID>` | Remplacé par `/join?invitation=<token>`. Un UUID seul n'est jamais converti en preuve. |
| Email d'invitation | La nouvelle route crée la ligne puis envoie son lien unique ; `invite-client` est dépréciée. |
| Utilisateur déjà connecté | `/join` conserve le token, appelle validation minimale puis consommation avec sa session. |
| Nouvel utilisateur | Token conservé à travers inscription et callback ; consommation uniquement après email vérifié. |
| Callback OAuth/email | Transporte `invitation` ou un identifiant opaque côté cookie sécurisé court ; ne transmet plus `coach`. |
| Onboarding client | Après consommation réussie, `subscription_type='invited'` sélectionne le flux actuel. |
| Coach par défaut | Reste un flux solo séparé, sans invitation et sans accès `invited`. |
| `autoAssign` | Supprimé du contrat invitation ; futur endpoint explicite d'assignation par défaut. |
| Anciens liens envoyés | Non sécurisables car ils ne contiennent qu'un UUID. Afficher « lien expiré, demander un nouveau lien ». Aucun délai ne peut rendre un UUID sûr. |
| Utilisateurs déjà `invited` | Aucun backfill d'invitation fictive. Conserver profil/relation existants et les auditer séparément. |

Stratégie de transition :

1. Activer la création de nouveaux liens tokenisés derrière `coach_invitations_v1` pour un petit périmètre coach.
2. Continuer à afficher les liens UUID existants uniquement jusqu'à disponibilité du nouvel écran, mais ne pas les présenter comme sûrs.
3. Dès que les nouvelles routes et le frontend sont déployés, désactiver l'octroi `invited` par UUID avec un flag serveur indépendant.
4. Les anciens liens renvoient `410` et proposent au destinataire de contacter son coach.
5. Ne jamais créer automatiquement des invitations à partir d'anciens liens : le destinataire n'est pas connu.

## 15. Séquence de migration future

Approche expand → migrate → contract :

1. **Expand DB** : table, contraintes, index, RLS et colonnes d'audit additives. Aucun appel applicatif.
2. **RPC** : fonction transactionnelle et tests DB ; pas encore exposée au frontend.
3. **API** : création, validation, consommation, révocation derrière `coach_invitations_v1` désactivé par défaut.
4. **Frontend** : génération email/lien tokenisé et `/join` compatible token ; ancien flux toujours disponible pour rollback, sans mélanger les payloads.
5. **Coexistence observée** : métriques création/envoi/validation/consommation/erreurs et trafic legacy.
6. **Bascule** : nouvelles invitations exclusivement tokenisées.
7. **Fermeture P0** : flag `legacy_invitation_grant_enabled=false`; `coachId` seul renvoie `410`.
8. **Contract** : retrait futur de l'ancien mode invitation de `assign-coach`, de `?coach=`, des métadonnées `invited_coach_id` et de `invite-client`.

Rétrocompatibilité et rollback :

- Les étapes 1 à 3 sont additives et rollbackables par désactivation du flag, sans suppression immédiate de DB.
- Le frontend tokenisé peut être rollbacké tant que l'API reste disponible.
- La désactivation legacy possède son propre flag et ne doit intervenir qu'après métriques et support préparé.
- Une invitation créée demeure valide même si l'envoi a échoué ; le support peut déclencher un renvoi, pas lire le token.
- Ne jamais déployer dans la même étape : table + bascule frontend ; nouvelle RPC + suppression legacy ; changement du callback + désactivation des anciens liens.

Métriques sans secrets : nombre de créations, doublons, échecs SMTP, validations invalides agrégées, consommations réussies, erreurs par code, concurrence refusée, trafic `assign-coach` legacy. Aucun token, hash ou email brut.

## 16. Plan de tests futur

Les tests sont écrits avant la migration et avant la correction des routes.

### Création API/service

- anonyme → 401, aucune insertion/SMTP ;
- utilisateur non-coach → 403 ;
- coach valide → ligne pending et email ;
- administrateur sans rôle coach → 403 ;
- email invalide/non normalisable → 400 ;
- coachId, durée, statut injectés → rejet Zod ;
- rate limit coach, email et IP → 429 ;
- doublon pending → 409 sans nouveau secret ;
- invitation expirée → nouvelle ligne ;
- collision de hash simulée → régénération bornée puis erreur ;
- échec insertion → aucun SMTP ;
- échec SMTP → invitation pending, delivery failed, 502 ;
- valeurs HTML du profil échappées dans l'email.

### Consommation unitaire et intégration RPC

- jeton valide → profil, relation et invitation modifiés ;
- jeton inexistant ou format invalide ;
- jeton expiré ;
- jeton révoqué ;
- jeton déjà consommé ;
- email différent ;
- email non vérifié ;
- utilisateur non authentifié ;
- coach supprimé, suspendu ou rôle invalide ;
- client coach/admin refusé ;
- client lifetime/beta/Stripe actif/déjà invited refusé ;
- relation déjà existante ;
- deux requêtes concurrentes : exactement un succès ;
- échec update profil : invitation et relation inchangées ;
- échec relation : profil et invitation inchangés ;
- échec update invitation : profil et relation rollbackés ;
- `coachId` falsifié rejeté/ignoré ;
- `clientId` falsifié rejeté/ignoré ;
- ancien `autoAssign` rejeté/ignoré ;
- seconde consommation refuse sans mutation ;
- hash stocké ne permet pas de produire un jeton accepté.

### RLS et privilèges

- coach A ne voit, ne révoque et ne modifie pas les invitations du coach B ;
- client et anonyme ne lisent aucune ligne/hash ;
- projection coach n'expose pas `token_hash` ;
- client ne consomme jamais pour un tiers, même avec un ID falsifié ;
- appel RPC anonyme refusé ;
- exécution directe UPDATE des abonnements toujours refusée ;
- exécution directe INSERT/UPDATE `coach_clients` hors règles toujours refusée ;
- fonction utilise un `search_path` sûr et n'accepte pas coach/client en paramètres.

### API de validation et révocation

- toutes les invitations invalides donnent la même réponse publique ;
- aucun email, coachId, hash ou statut interne n'est exposé ;
- révocation propriétaire réussie ;
- autre coach refusé ;
- révocation d'un état terminal refusée ;
- rate limits et `Retry-After` vérifiés.

### E2E

- coach crée une invitation ;
- email capturé par un SMTP de test ;
- nouveau client ouvre le lien et crée son compte ;
- OAuth et email/password conservent le token sans fuite ;
- invitation consommée après vérification email ;
- relation visible des deux côtés ;
- onboarding invité sélectionné ;
- réutilisation du lien refusée ;
- transfert du lien vers un autre email refusé ;
- ancien lien UUID affiche le renouvellement sans octroyer d'accès.

## 17. Décisions ouvertes et valeurs par défaut

Le contrat ne contient aucune décision critique bloquante. Les décisions produit suivantes peuvent évoluer sans redéfinir son socle :

| Question | Options | Recommandation / défaut | Impact d'un changement |
|---|---|---|---|
| Durée d'une invitation | 24 h, 7 j, 14 j | **7 jours** | Constante serveur et textes email uniquement |
| Un coach peut-il réinviter un client déjà invited ? | Refus, transfert immédiat, approbation | **Refus** | Un futur flux de transfert séparé serait nécessaire |
| Admin peut-il créer au nom d'un coach ? | Oui/non | **Non en V1** | Exigerait impersonation auditée et endpoint distinct |
| Réponse SMTP en cas d'échec | 201 avec warning, 502 | **502 avec invitation conservée** | Contrat UI de renvoi uniquement |
| Afficher le nom du coach avant connexion ? | Oui/non | **Non en V1** | Peut être ajouté après revue anti-énumération |
| Suppression des audits | Jamais, rétention limitée | **Conserver 24 mois puis anonymiser/purger** | Politique de rétention et job futur |

Valeurs normatives par défaut : Option A email strict, SHA-256, token 256 bits, expiration calculée, RPC transactionnelle, rôle exact coach, anciens liens UUID refusés.

## 18. Bascule applicative de `/join` — 12 juillet 2026

Le parcours public accepte désormais `token` comme paramètre principal et `invitation` comme alias de compatibilité. Le jeton brut est copié uniquement dans `sessionStorage`, sous la clé `moovx_coach_invitation`, puis retiré immédiatement de l'URL. Il n'est placé ni dans `localStorage`, ni dans les métadonnées Auth, ni dans les journaux. Ce stockage vit au plus pendant l'onglet courant : il est supprimé après consommation réussie ou erreur terminale et conservé uniquement lors d'une erreur temporaire afin de permettre une reprise.

La validation passe par `POST /api/coach/invitations/validate` afin de ne pas placer le secret dans une URL serveur. La route calcule le SHA-256 côté serveur, utilise une projection minimale et renvoie une réponse publique uniforme pour les invitations absentes ou terminales. La consommation passe par `POST /api/coach/invitations/consume` : l'identité client vient exclusivement de `auth.getUser()` et la mutation atomique reste déléguée à `consume_coach_invitation`.

Après email/password ou OAuth, le callback n'accepte qu'un chemin interne sûr et reprend `/join`; le jeton reste limité au stockage de session du navigateur. Les anciens liens `?coach=<UUID>` sont explicitement refusés et ne déclenchent jamais `/api/assign-coach`.

Les producteurs historiques de liens UUID dans l'onboarding et le dashboard coach ne sont pas modifiés dans cette tranche. Leurs liens sont désormais refusés par `/join`; leur remplacement appartient au futur flux borné de création et d'envoi d'invitations vérifiées.

Rollback applicatif : rétablir les composants `/join` et callback précédents ainsi que retirer les deux nouvelles routes. La table et la RPC additives peuvent rester déployées sans trafic. Ce rollback réouvre toutefois le risque d'autorité portée par `coachId` et ne doit être utilisé qu'en urgence, pour une durée limitée. Le flux distinct d'assignation automatique du coach par défaut reste inchangé.

## 19. Flux coach vérifié — 12 juillet 2026

`POST /api/coach/invitations` est l'unique producteur applicatif d'invitations coach. La route exige `auth.getUser()`, vérifie le rôle `coach` dans `profiles`, normalise et valide l'email, applique les limites persistantes coach/destinataire ainsi qu'une défense locale coach/IP, puis délègue au service serveur. Le service génère 32 octets aléatoires, ne persiste que leur SHA-256 et envoie exclusivement `/join?token=<token>`.

La réponse de création contient seulement `invitationId`, `expiresAt` et `deliveryStatus`. Un échec SMTP conserve la ligne `pending`, marque la livraison `failed` et renvoie `502` sans détail fournisseur. Les journaux génériques de `lib/email.ts` n'incluent plus l'adresse destinataire ni l'erreur SMTP brute.

`POST /api/coach/invitations/revoke` accepte un identifiant d'invitation et un motif non autoritatif optionnel. La session, la RLS et une vérification explicite de propriété bornent la révocation au coach propriétaire et à l'état `pending`; les états terminaux renvoient `409`.

Le dashboard coach conserve son design et envoie désormais uniquement `{ recipientEmail, locale }`. Il permet de révoquer l'invitation créée. Tous les blocs générant ou copiant `/join?coach=<UUID>` ont été retirés du dashboard, de son hook et de l'onboarding coach. L'ancien endpoint `/api/invite-client` est conservé comme tombstone `410 LEGACY_INVITATION_DISABLED` et n'envoie plus aucun email fourni par le navigateur.

Rollback applicatif : désactiver l'entrée UI et les deux routes nouvelles sans supprimer la table ni la RPC. Ne jamais réactiver l'envoi d'un lien UUID ou d'un `inviteLink` fourni par le navigateur.

## 20. Définition de terminé de l'implémentation future

La tâche d'implémentation ne sera terminée que lorsque :

- [ ] les tests du nouveau contrat existent avant la correction ;
- [ ] la migration de table est additive, idempotente et testée depuis une base vide ;
- [ ] RLS et privilèges empêchent la lecture du hash et les actions inter-coachs ;
- [ ] la RPC consomme atomiquement sous `auth.uid()` avec concurrence testée ;
- [ ] aucune mutation partielle n'est possible ;
- [ ] le coach et le client proviennent exclusivement du serveur ;
- [ ] le jeton brut n'est jamais stocké ou journalisé ;
- [ ] expiration, révocation et usage unique sont testés ;
- [ ] création, validation, consommation et révocation ont des schémas Zod stricts ;
- [ ] SMTP et rate limits sont testés sans service réel ;
- [ ] `/join` et le callback fonctionnent pour compte nouveau et existant ;
- [ ] les anciens liens suivent explicitement le comportement `410` ;
- [ ] le flux coach par défaut reste fonctionnel sans pouvoir accorder `invited` ;
- [ ] un E2E complet et la réutilisation refusée passent ;
- [ ] les métriques et logs ne contiennent aucun secret ;
- [ ] le rollback et les feature flags sont documentés et répétés ;
- [ ] `POST /api/assign-coach` ne peut plus accorder `invited` depuis un `coachId`.

## Décisions normatives résumées

```text
Preuve                 = jeton secret + compte à email vérifié correspondant
Jeton                  = 32 octets aléatoires, Base64URL, SHA-256 stocké
Durée                  = 7 jours
Coach                  = coach_invitations.coach_id
Client                 = auth.uid()
Statuts persistés      = pending | consumed | revoked
Expiration             = calculée depuis expires_at
Consommation           = RPC PostgreSQL transactionnelle SECURITY DEFINER
Anciens liens UUID     = jamais une preuve, réponse 410 après bascule
Assignation par défaut = flux séparé, sans accès invited
```
