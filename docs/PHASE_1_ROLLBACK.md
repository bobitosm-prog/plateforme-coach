# Rollback applicatif — Phase 1

> Périmètre : Phase 1 « Stabilisation et sécurité » de MoovX.  
> Baseline documentaire : commit `aa53a6e`.  
> État de référence sécurisé : commit `2d8dae0`.  
> Documents liés : [contrat des invitations coach](./COACH_INVITATION_CONTRACT.md), [stratégie de baseline Supabase](./SUPABASE_BASELINE_STRATEGY.md), [roadmap Codex](../ROADMAP_CODEX.md).

## 1. Objet et règle de sécurité

Ce document décrit comment réduire l'impact d'un incident introduit par la Phase 1 sans réintroduire les vulnérabilités corrigées. Un rollback n'autorise jamais :

- une identité ou une relation fournie uniquement par le navigateur ;
- le retour à `/join?coach=<UUID>` ou à `/api/assign-coach` ;
- la suppression d'une migration déjà appliquée ;
- la suppression ou la réécriture d'événements Stripe, d'invitations ou de paiements pour « nettoyer » un incident ;
- l'exposition d'un secret, jeton, hash, signature, e-mail ou payload dans les notes d'incident.

Un retour global au commit `aa53a6e` est interdit : il rouvrirait plusieurs frontières d'autorisation. Le rollback applicatif doit viser un artefact connu qui conserve les protections de sécurité, ou un correctif minimal dérivé de l'état sécurisé.

## 2. Vocabulaire opérationnel

| Action | Définition | Usage Phase 1 |
|---|---|---|
| Rollback applicatif | Redéployer un artefact applicatif connu, sans modifier le schéma ni les données. | Possible uniquement vers une version qui conserve les contrôles serveur du domaine. |
| Désactivation fonctionnelle | Rendre temporairement un flux indisponible ou le dégrader vers un comportement sûr. | Préférée pour push, invitations, checkout, Connect et chat lorsqu'aucun artefact antérieur sûr n'existe. |
| Rollback de configuration | Restaurer une valeur de configuration préalablement sauvegardée et validée. | Seulement pour une régression de configuration ; ne jamais copier la valeur sensible dans le journal d'incident. |
| Correction SQL vers l'avant | Ajouter une migration corrective compatible avec les données et versions applicatives coexistantes. | Seule stratégie admise après application d'une migration additive Phase 1. |
| Restauration de données | Restaurer un ensemble de données depuis une sauvegarde vérifiée après corruption ou perte démontrée. | Dernier recours ; jamais pour annuler une simple erreur applicative ou un statut métier valide. |

## 3. Préparation avant déploiement

### 3.1 Informations et sauvegardes requises

- Commit et artefact applicatif actuellement déployés.
- Commit et artefact de retour connus, construits depuis une version qui conserve les contrôles serveur.
- Liste des migrations déjà enregistrées dans l'environnement cible.
- Sauvegarde vérifiée des tables concernées par la tranche : `profiles`, `coach_clients`, `coach_invitations`, `stripe_webhook_events`, `payments` et `push_subscriptions`.
- Pour le seed historique, export ou comptage vérifié de `exercises_db`; aucune donnée utilisateur n'est contenue dans le seed versionné.
- Valeurs de configuration nécessaires vérifiées par présence et cohérence, sans les copier dans le compte rendu.
- Résultats des tests unitaires et d'intégration locaux pertinents.

Si l'environnement ne fournit pas de mécanisme de sauvegarde vérifiable, le déploiement d'une migration est **no-go**.

### 3.2 Ordre de déploiement

1. Confirmer la sauvegarde et l'état des migrations.
2. Appliquer d'abord les migrations additives nécessaires à la nouvelle application.
3. Vérifier les objets SQL et leurs droits avant de déployer le code consommateur.
4. Déployer l'application sécurisée.
5. Exécuter les validations ciblées, puis observer les journaux structurés et les statuts métier.
6. N'activer le trafic normal du flux qu'après validation.

Pour le webhook, `20260712143000_harden_stripe_webhook_claims.sql` doit précéder le code appelant les RPC de claim/finalisation. Pour les invitations, `20260711190500_add_coach_invitations.sql` doit précéder les routes `/api/coach/invitations/*`.

### 3.3 Go / no-go

Go uniquement si :

- l'artefact déployé et l'artefact de retour sont identifiés ;
- les sauvegardes requises sont vérifiées ;
- les migrations attendues et objets SQL existent ;
- aucun test ne pointe vers la production ;
- les matrices d'autorisation ciblées sont vertes ;
- la personne responsable et l'heure de début sont consignées.

No-go si une migration distante est inconnue, si la sauvegarde est absente, si une configuration critique est ambiguë ou si le rollback proposé réintroduit une autorité navigateur.

## 4. Procédure commune d'incident

1. Ouvrir un enregistrement d'incident avec heure, commit, domaine, symptômes et personne responsable.
2. Capturer les correlation IDs et codes de raison des journaux structurés, sans contenu sensible.
3. Déterminer si l'incident concerne le code, la configuration, le schéma ou les données.
4. Stopper l'élargissement de l'incident par désactivation fonctionnelle sûre lorsque possible.
5. Choisir une seule stratégie : rollback applicatif sûr, rollback de configuration ou correction vers l'avant.
6. Préserver les lignes et statuts existants avant toute action sur les données.
7. Exécuter la checklist du domaine puis la validation commune.
8. Consigner résultat, durée, écarts, données affectées et décision de retour vers la version sécurisée.

## 5. Procédures par domaine

### 5.1 Stripe Connect

**Déclencheurs.** Hausse des refus `STRIPE_CONNECT_REJECTED`, erreurs d'onboarding, création répétée de comptes Connect, ou impossibilité pour un coach authentifié d'obtenir un lien.

**À surveiller.** Statuts HTTP de `/api/stripe/connect`, raisons `AUTH_REQUIRED`, `IDENTITY_MISMATCH`, `PROFILE_UNAVAILABLE`, `ROLE_FORBIDDEN`, et état de `profiles.stripe_account_id` / `profiles.stripe_onboarding_complete`.

**Portée.** Onboarding Stripe des coachs ; aucun checkout client ne doit être modifié pendant ce rollback.

**Action sûre.** Désactiver temporairement l'accès au déclencheur Connect ou déployer un correctif minimal qui refuse la création tout en laissant les comptes existants intacts. Un rollback applicatif ne peut pas précéder le commit sécurisé `75bb6b0`.

**Données.** Aucune migration Phase 1 propre à Connect. Ne jamais effacer `stripe_account_id` pour tenter de recréer un compte. Une incohérence doit être corrigée vers l'avant après vérification auprès des données déjà enregistrées.

**Compatibilité.** Les versions antérieures qui acceptent un `coachId` étranger sont incompatibles et interdites.

**Vérification.** Anonyme refusé, coach étranger refusé, rôle non-coach refusé, coach légitime dirigé uniquement vers son propre compte existant ou créé de façon idempotente.

**Retour sécurisé.** Corriger sur la branche sécurisée, rejouer les tests Connect, puis réactiver le déclencheur pour un coach de test avant généralisation.

### 5.2 Checkouts plateforme et coach

**Déclencheurs.** Augmentation de `PLATFORM_CHECKOUT_REJECTED`, `COACH_CHECKOUT_REJECTED`, `CHECKOUT_FAILED`, paiements associés au mauvais compte, relation coach/client ignorée ou métadonnées incohérentes.

**À surveiller.** Codes `AUTH_REQUIRED`, `ROLE_FORBIDDEN`, `RELATION_FORBIDDEN`, `PRICE_NOT_CONFIGURED`, statuts de `payments`, et présence des métadonnées serveur attendues.

**Portée.** Création de nouvelles sessions uniquement ; les paiements et abonnements existants ne doivent pas être altérés.

**Action sûre.** Désactiver temporairement le bouton ou retourner une indisponibilité contrôlée avant tout appel Stripe. Pour le checkout coach, conserver l'exigence d'une relation `coach_clients.status = 'active'`. Pour le checkout plateforme, conserver l'identité issue de la session serveur.

**Interdit.** Aucun rollback ne peut réintroduire `clientId`, `coachId`, rôle ou relation comme autorité fournie par le navigateur. Ne pas revenir avant le commit sécurisé `c41e5c1`.

**Données.** `payments`, `profiles.stripe_customer_id`, `profiles.stripe_account_id`. Ne pas supprimer une ligne `pending` ou un identifiant Stripe sans preuve de corruption ; réconcilier vers l'avant.

**Vérification.** Matrices anonyme/client/coach/admin, identité étrangère refusée, relation active obligatoire, métadonnées `clientId`, `coachId`, `subType`, `type` conformes, aucune mutation avant un refus.

**Retour sécurisé.** Corriger la cause, tester avec Stripe mocké, puis réactiver un seul checkout dans l'environnement de test identifié.

### 5.3 Webhook Stripe et claim durable

**Déclencheurs.** Accumulation de `processing`, hausse de `failed`, réponses `409 WEBHOOK_ALREADY_PROCESSING`, `INVALID_METADATA`, finalisations impossibles ou doubles mutations dans `payments`.

**À surveiller.** Dans `stripe_webhook_events` : `event_id`, `event_type`, `processing_status`, `processing_started_at`, `completed_at`, `attempt_count`, `error_message`. Dans `payments` : `stripe_event_id`. Statuts valides : `processing`, `success`, `failed`, `skipped`.

**Portée.** Traitement asynchrone Stripe et mutations de profils/paiements. Les événements Stripe eux-mêmes ne doivent jamais être supprimés.

**Action applicative.** Si le handler est défaillant, désactiver son traitement métier tout en conservant la vérification de signature et les lignes de claim, ou déployer un correctif minimal compatible avec les RPC existantes. Ne pas redéployer l'ancien insert de déduplication après la migration durable.

**Migration.** `20260712143000_harden_stripe_webhook_claims.sql` ajoute des colonnes, l'index unique partiel `payments_stripe_event_id_key`, puis remplace `claim_stripe_webhook_event(text,text,jsonb)` et ajoute `finalize_stripe_webhook_event(text,text,text)`. Après application, ne jamais retirer colonnes, contrainte, index ou RPC. Toute évolution est une migration corrective vers l'avant.

**Compatibilité.** Le schéma additif accepte les lignes historiques avec leur statut existant, mais un handler antérieur qui n'utilise pas la machine de claim/finalisation n'est pas un artefact de rollback acceptable.

**Préservation des états.** `success` et `skipped` sont terminaux ; ne pas les remettre à `processing`. `failed` est récupérable par `claimed_retry`. Un `processing` de moins de cinq minutes doit rester verrouillé ; un état plus ancien peut être repris par la RPC. `stripe_event_id` doit rester associé à la mutation de paiement afin que l'upsert `ignoreDuplicates` conserve l'idempotence.

**Restauration de données.** Uniquement si une corruption est démontrée et après sauvegarde des tables complètes. Ne jamais restaurer `payments` sans restaurer ou réconcilier les `stripe_event_id` correspondants.

**Vérification.** Tester `claimed`, `already_processing`, `claimed_retry`, `already_success`, `already_skipped`, finalisation tardive refusée et absence de double mutation.

**Retour sécurisé.** Déployer le handler corrigé contre les RPC existantes, traiter d'abord les lignes `failed`/`processing` éligibles, puis vérifier les états terminaux et les paiements avant trafic normal.

### 5.4 Invitations coach vérifiées

**Déclencheurs.** Invitations non livrées, hausse des codes `INVITATION_*`, consommation multiple, relation incorrecte, ou incohérence entre `coach_invitations`, `profiles` et `coach_clients`.

**À surveiller.** `coach_invitations.status` (`pending`, `consumed`, `revoked`), `delivery_status` (`pending`, `sent`, `failed`, `skipped`), `expires_at`, `consumed_at`, `consumed_by`, `revoked_at`, `revoked_by`; relation `coach_clients.status = 'active'` et `coach_clients.invited_by_coach = true` après consommation.

**Portée.** Création, validation, consommation et révocation des invitations ; profil du destinataire et relation coach/client lors de la consommation atomique.

**Action sûre.** Désactiver temporairement la création de nouvelles invitations tout en laissant validation, consommation et révocation disponibles si elles sont saines. Si la consommation est suspecte, désactiver également cette opération et conserver les lignes `pending` jusqu'au correctif.

**Interdit.** Le retour à `/join?coach=<UUID>` et à `/api/assign-coach` est interdit : un UUID de coach n'est pas une preuve, ne lie pas l'e-mail du destinataire et réintroduit l'autorité du navigateur. Le tombstone legacy ne doit pas redevenir actif.

**Migration.** `20260711190500_add_coach_invitations.sql` est additive : table, index, triggers, RLS, grants, colonne `coach_clients.status` et RPC `consume_coach_invitation(bytea)`. Après application, ne rien supprimer. Corriger vers l'avant en préservant `token_hash`, l'historique et les états terminaux.

**Compatibilité.** Une application antérieure ignorant la table peut coexister techniquement avec le schéma, mais elle n'est pas acceptable si elle réactive l'ancien flux. La version de retour doit conserver `/join?token=...` et les contrôles serveur.

**Vérification.** Token brut absent de la base, hash de 32 octets, e-mail vérifié et correspondant, coach valide, destinataire éligible, consommation atomique unique, relation active créée une seule fois, révocation limitée au coach propriétaire.

**Retour sécurisé.** Corriger routes/RPC par extension compatible, tester concurrence et matrices, puis réactiver création avant consommation générale.

### 5.5 Notifications push et destinations

**Déclencheurs.** Hausse de `PUSH_REJECTED`, notifications vers un compte étranger, destination externe, échecs répétés Web Push ou clic ouvrant une origine externe.

**À surveiller.** Raisons `AUTH_REQUIRED`, `ROLE_FORBIDDEN`, `RELATION_FORBIDDEN`, résultats de livraison agrégés, lectures de `push_subscriptions` après autorisation uniquement, et comportement `notificationclick` du service worker.

**Portée.** Envoi push navigateur et producteurs serveur ; aucune relation coach/client ne doit être modifiée.

**Dégradation sûre.** Désactiver temporairement l'envoi push en amont de Web Push, sans desserrer l'autorisation. Les notifications déjà reçues restent confinées par le service worker. Une destination invalide doit continuer à être refusée ; ne jamais revenir à l'ouverture d'une URL absolue.

**Données.** `push_subscriptions` reste intacte. Ne pas supprimer les abonnements pour résoudre un bug de livraison sauf demande explicite de l'utilisateur ou invalidation confirmée par le fournisseur déjà gérée par le transport.

**Compatibilité.** La version de retour doit conserver la relation active coach/client et le contrat de chemin interne commençant par un seul `/`.

**Vérification.** Aucun abonnement lu avant autorisation, aucun push sur refus, destinations hostiles refusées, clic ancien confiné à `/`, producteurs serveur toujours internes.

**Retour sécurisé.** Corriger le transport ou le producteur, valider sans service externe réel, puis réactiver progressivement l'envoi.

### 5.6 Autorisation admin de `setup-products`

**Déclencheurs.** Refus `ADMIN_REQUIRED` pour l'administrateur attendu, accès d'un non-admin, ou créations répétées de produits/prix.

**À surveiller.** `ADMIN_OPERATION_REJECTED`, statuts `401/403`, et nombre de créations Stripe lors d'une invocation manuelle.

**Portée.** Endpoint manuel `POST /api/stripe/setup-products`; aucun producteur applicatif n'a été identifié.

**Action sûre.** Désactiver entièrement l'endpoint si nécessaire. Ne jamais restaurer l'autorisation `profiles.subscription_type = 'lifetime'`. La version de retour doit continuer à utiliser `verifyAdmin(req)` et le Bearer token serveur.

**Configuration.** En cas d'erreur de configuration admin, restaurer uniquement une valeur préalablement validée ; ne pas consigner sa valeur. Le repli codé en dur et la variable `NEXT_PUBLIC_*` restent une dette connue.

**Données.** Aucune migration. Les produits/prix déjà créés ne sont pas supprimés automatiquement ; la non-idempotence est hors Phase 1 et nécessite une réconciliation séparée.

**Vérification et retour.** Non-admin refusé avant instanciation Stripe, admin autorisé indépendamment de l'abonnement, puis invocation unique contrôlée après correctif.

### 5.7 Rendu Markdown du chat

**Déclencheurs.** Crash sur message malformé, régression visuelle importante, consommation excessive sur texte long, ou création d'un élément HTML inattendu.

**À surveiller.** Erreurs de rendu côté application et reproduction avec la matrice hostile locale ; aucun contenu de message ne doit être copié dans un journal d'incident.

**Portée.** Présentation des messages uniquement ; génération IA, stockage et API restent indépendants.

**Dégradation sûre.** Remplacer temporairement `ChatMarkdown` par `ChatPlainText`. Ne jamais restaurer `dangerouslySetInnerHTML` ni la construction d'HTML par remplacement de chaînes.

**Données.** Aucune migration et aucune transformation des messages stockés.

**Compatibilité.** `ChatPlainText` accepte le même contenu que le parseur et constitue le chemin de retour compatible; une version qui réintroduit une chaîne HTML ne l'est pas.

**Vérification.** Texte visible, aucun `script`, `img`, `svg`, `iframe`, lien ou attribut événementiel créé ; messages utilisateur toujours en texte brut.

**Retour sécurisé.** Corriger le parseur déterministe, rejouer les tests légitimes/hostiles, puis réactiver le sous-ensemble `##`, `###`, `-` et `**...**`.

### 5.8 Journaux structurés de sécurité

**Déclencheurs.** Volume excessif, erreur de sérialisation, absence de correlation ID, exposition d'une donnée sensible ou perturbation d'une réponse métier.

**À surveiller.** Format JSON, événements stables, `x-request-id`, volume par code de raison et absence de clés bloquées.

**Portée.** Observabilité seulement ; les contrôles d'autorisation ne doivent jamais dépendre du logger.

**Dégradation sûre.** Réduire temporairement l'émission à un événement minimal ou neutraliser la sortie console dans `createSecurityAudit`, tout en conservant `audit.reject` comme passage transparent des réponses et surtout sans supprimer les contrôles métier des routes.

**Données.** Aucune table ni migration. Ne pas basculer vers `lib/admin/logger.ts`, dont le contrat historique contient des e-mails.

**Compatibilité.** Les routes restent fonctionnelles si l'émission est réduite, car le logger n'est pas une autorité métier; conserver toutefois la signature de `audit.reject` et la propagation transparente des réponses.

**Vérification.** Statuts et corps inchangés, un log maximum par requête, contexte filtré, correlation ID valide.

**Retour sécurisé.** Corriger le contrat central, valider les tests de non-fuite, puis rétablir la sortie structurée.

### 5.9 Baseline et seed Supabase historiques

**Déclencheurs.** Échec de reconstruction locale, divergence entre historique enregistré et schéma existant, conflit du catalogue `exercises_db`, ou création inattendue d'un objet historique.

**À surveiller.** Résultats de `tests/integration/reset-migrations.sh`, assertions de baseline, présence des tables listées dans [la stratégie de baseline](./SUPABASE_BASELINE_STRATEGY.md), et nombre/cohérence des exercices.

**Portée.** Reconstruction d'une base vide et historique de migrations. `20260317000000_initial_schema_baseline.sql` utilise des créations additives ; `20260317010000_seed_exercises_catalog.sql` ne contient pas de données utilisateur et ne modifie pas un catalogue existant non vide.

**Action sûre.** Avant déploiement distant, retirer le lot si l'audit n'est pas terminé. Après enregistrement distant, ne supprimer aucune table et ne rejouer aucun seed à l'aveugle. Corriger l'historique ou le schéma vers l'avant selon la stratégie documentée.

**Compatibilité et retour sécurisé.** Les `CREATE ... IF NOT EXISTS` visent la coexistence avec un schéma historique. Revenir à l'application précédente ne justifie aucune modification de ces objets; le retour vers la version sécurisée exige d'abord un reset local et les assertions de baseline verts.

**Restauration.** Sur une base locale jetable, reconstruire depuis zéro. Sur une base contenant des données, utiliser uniquement une sauvegarde vérifiée si une perte est démontrée ; ne jamais restaurer globalement pour une simple divergence d'historique.

**Vérification.** Reset local déterministe, assertions SQL vertes, migrations ultérieures applicables, données utilisateur intactes et seed sans duplication.

## 6. Checklist après rollback ou désactivation

- [ ] Commit/artefact actif et heure consignés.
- [ ] Statuts HTTP des flux concernés conformes.
- [ ] Matrices anonyme/client/coach/admin concernées vertes.
- [ ] Aucune identité critique acceptée depuis le navigateur.
- [ ] Aucun secret ou contenu utilisateur dans les journaux.
- [ ] États `stripe_webhook_events` et `payments.stripe_event_id` préservés.
- [ ] États et hashes de `coach_invitations` préservés.
- [ ] Aucune suppression de migration ou table exécutée.
- [ ] Dégradation sûre vérifiée pour push ou chat si utilisée.
- [ ] Prochaine action, responsable et condition de réactivation consignés.

## 7. Responsabilités et compte rendu

Dans le contexte actuel d'un développeur assisté, la personne qui déclenche le déploiement est responsable de la décision go/no-go, de l'exécution du rollback et de la validation finale. L'assistance IA peut préparer les vérifications, mais ne remplace ni l'accès autorisé à l'environnement ni la décision humaine.

Le compte rendu doit contenir : domaine, heure de détection, commit avant/après, symptômes, correlation IDs non sensibles, portée, stratégie choisie, migrations présentes, sauvegarde vérifiée, résultats de validation, durée, dette restante et condition précise de retour vers la version sécurisée.

## 8. État de clôture Phase 1

Ce runbook satisfait le critère « rollback applicatif documenté ». La Phase 1 reste toutefois non terminée tant que les parcours E2E invitation, checkout, push et chat ne sont pas intégrés et verts.
