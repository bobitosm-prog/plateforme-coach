# SESSION LOG CODEX — MoovX

Journal chronologique des sessions de développement réalisées avec Codex.

Ce fichier sert à reprendre le travail sans perdre le contexte entre deux sessions.

Règles :

- ne jamais modifier ou supprimer une ancienne entrée ;
- ajouter les nouvelles entrées à la fin ;
- consigner les faits, pas des suppositions ;
- masquer toute valeur de secret ;
- toujours terminer par une prochaine étape unique.

---

## Session 2026-07-11 — 05:53

### Contexte Git

- Branche : `main`
- Commit au début : `aa53a6e`
- Commit à la fin : `aa53a6e`
- État Git au début : `ROADMAP_CODEX.md` présent mais non suivi (`??`) ; `SESSION_LOG_CODEX.md` absent ; aucun fichier applicatif modifié.
- État Git à la fin : `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` non suivis (`??`) ; aucun fichier applicatif modifié.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Mettre en place le suivi obligatoire des sessions Codex.
- Statut au début : Non commencé ; aucun journal de session n'existait.
- Statut à la fin : Terminé ; le journal est initialisé et la roadmap référence le protocole obligatoire.

### Objectif de la session

Créer un journal chronologique distinct de la roadmap afin qu'une nouvelle session Codex puisse reprendre le travail depuis un état Git, une tâche et une prochaine étape explicitement documentés.

### Périmètre prévu

- fichiers ou modules concernés : `ROADMAP_CODEX.md`, `SESSION_LOG_CODEX.md` ;
- fichiers explicitement exclus : tous les fichiers applicatifs, tests, migrations et configurations ;
- services externes concernés : aucun ;
- migrations éventuelles : aucune.

### Travail effectué

1. Lecture de `ROADMAP_CODEX.md` et vérification de la première tâche P0.
2. Vérification de l'absence de `SESSION_LOG_CODEX.md`.
3. Vérification de la branche `main`, du commit `aa53a6e` et de l'état Git initial.
4. Création de `SESSION_LOG_CODEX.md` avec l'en-tête et les règles obligatoires.
5. Ajout de cette première entrée d'initialisation.
6. Mise à jour du mode d'emploi de la roadmap pour rendre le suivi de début et de fin de session obligatoire.
7. Désignation de la Phase 1 comme phase active et définition de la prochaine étape unique.

### Fichiers créés

- `SESSION_LOG_CODEX.md`
  - journal chronologique destiné à transmettre l'état exact du travail entre les sessions Codex.

### Fichiers modifiés

- `ROADMAP_CODEX.md`
  - ajout de la phase active, de la référence au journal et des règles obligatoires de début et de fin de session.

### Fichiers supprimés

Aucun.

### Migrations et base de données

- migration créée : Sans objet
- migration appliquée localement : Sans objet
- migration appliquée à distance : Sans objet
- tables ou fonctions concernées : Sans objet
- compatibilité : Sans objet
- rollback : supprimer le nouveau journal et retirer les mentions ajoutées à la roadmap ; aucune donnée applicative n'est concernée.

### Tests exécutés

| Commande | Résultat | Détails |
|---|---|---|
| `sed -n '1,220p' ROADMAP_CODEX.md` | Réussi | Roadmap lue avant modification. |
| `git status --short` | Réussi | État initial vérifié ; seule la roadmap non suivie était présente. |
| `git branch --show-current` | Réussi | Branche `main`. |
| `git rev-parse --short HEAD` | Réussi | Commit `aa53a6e`. |
| TypeScript | Non exécuté | Session exclusivement documentaire, aucun fichier TypeScript modifié. |
| Tests unitaires/intégration/E2E | Non exécuté | Aucun code applicatif ou test modifié. |
| Lint ciblé | Non exécuté | Les deux fichiers concernés sont Markdown et aucun lint Markdown n'est configuré. |
| Build | Non exécuté | Aucun changement susceptible d'affecter le build. |
| Vérification manuelle Markdown et diff | Réussi | Structure, liens de fichiers et contenu du journal vérifiés. |

### Résultats et mesures

- 1 fichier de suivi créé.
- 1 roadmap mise à jour.
- 0 fichier applicatif modifié.
- Phase active enregistrée : Phase 1 — Stabilisation et sécurité.
- Référence Git enregistrée : `aa53a6e`.

### Problèmes rencontrés

Aucun.

### Décisions prises

- décision : utiliser `ROADMAP_CODEX.md` pour la planification et `SESSION_LOG_CODEX.md` pour les faits chronologiques ;
- raison : séparer la vision durable du contexte opérationnel de chaque session ;
- alternatives écartées : ajouter toutes les entrées directement dans la roadmap, ce qui la rendrait rapidement difficile à lire ;
- impact futur : toute session commence et se termine par une synchronisation explicite entre Git, roadmap et journal.

### Risques et dette restante

- Les deux fichiers documentaires sont encore non suivis par Git.
- Aucune tâche P0 applicative de la Phase 1 n'est commencée.
- Aucun harness de tests de routes API n'est encore disponible.
- Aucun service production n'a été appelé et aucun état distant n'a été vérifié.

### Travail non terminé

- Les tests d'autorisation de `POST /api/stripe/connect` ne sont pas encore créés ; ils constituent la prochaine tâche.
- Aucun commit n'a été créé, conformément à la consigne.

### Checklist de fin de session

- [x] La tâche respecte son périmètre.
- [x] Aucun fichier utilisateur non lié n'a été écrasé.
- [ ] TypeScript a été vérifié — non requis : aucun fichier TypeScript modifié.
- [ ] Les tests pertinents ont été exécutés — non requis : session documentaire sans comportement applicatif modifié.
- [ ] Le lint ciblé a été exécuté — aucun lint Markdown configuré.
- [ ] Le build a été exécuté ou son absence est justifiée — non exécuté car seuls des fichiers Markdown ont changé.
- [x] `git status` a été vérifié.
- [x] `ROADMAP_CODEX.md` a été mis à jour.
- [x] Les risques restants sont documentés.
- [x] La prochaine étape est définie.

### Résumé de reprise

Le suivi officiel des sessions Codex est maintenant initialisé. `ROADMAP_CODEX.md` reste la source de planification et indique la Phase 1 comme active. `SESSION_LOG_CODEX.md` contient désormais l'état Git, les règles de reprise et cette première entrée. Aucun fichier applicatif, test ou migration n'a été modifié. Aucun test applicatif n'a été exécuté, car la session était exclusivement documentaire. Les deux documents sont non suivis par Git et aucun commit n'a été créé. La prochaine session doit commencer par relire ces deux fichiers et vérifier que le dépôt est toujours sur `main` au commit `aa53a6e` ou analyser toute divergence avant de poursuivre.

### Prochaine étape unique

**Action :**

Ajouter les tests d'autorisation de `POST /api/stripe/connect` pour les cas anonyme, client authentifié, coach non propriétaire et coach propriétaire, sans modifier encore l'implémentation de la route.

**Pourquoi maintenant :**

C'est la première tâche P0 de la Phase 1 et le filet de caractérisation obligatoire avant de lier Stripe Connect à l'identité coach côté serveur.

**Fichiers à ouvrir en premier :**

- `app/api/stripe/connect/route.ts`
- `app/onboarding-coach/OnboardingCoachContent.tsx`
- `app/coach/hooks/useCoachDashboard.ts`
- `tests/setup.ts`
- `vitest.config.ts`

**Tests à préparer ou exécuter :**

- `npm test`
- scénario anonyme : la route doit refuser avant tout appel Supabase ou Stripe ;
- scénario client : la route doit refuser ;
- scénario coach non propriétaire : la route doit refuser ;
- scénario coach propriétaire : la route peut atteindre le service Stripe mocké.

**Définition de terminé de la prochaine étape :**

- les quatre scénarios d'autorisation sont représentés par des tests isolés ;
- Stripe et Supabase sont mockés et aucun service externe n'est appelé ;
- les tests démontrent le comportement actuel, y compris les échecs attendus révélant la faille ;
- l'implémentation de `app/api/stripe/connect/route.ts` n'est pas modifiée pendant cette tâche de caractérisation.

**Ne pas faire pendant la prochaine session :**

- ne pas corriger encore la route Stripe Connect ;
- ne pas commencer `assign-coach` ou les checkouts ;
- ne pas appeler Stripe ou Supabase de production ;
- ne pas créer de migration.

### Temps

- Temps de session estimé : 20 à 30 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour la tâche : 1,5 jour concentré pour les tests d'autorisation Stripe Connect.

---

## Session 2026-07-11 — 18:30

### Contexte Git

- Branche : `main`
- Commit au début : `5b529db`
- Commit à la fin : `5b529db`
- État Git au début : propre ; le commit documentaire `5b529db` contient `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md`.
- État Git à la fin : `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` modifiés ; `tests/unit/stripe-connect-authorization.test.ts` créé et non suivi ; aucun autre fichier modifié.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Écrire les tests d'autorisation de `POST /api/stripe/connect` sans modifier la route.
- Statut au début : Non commencé.
- Statut à la fin : Terminé ; 10 tests de caractérisation passent et la route reste inchangée.

### Objectif de la session

Documenter avec des tests isolés le comportement d'autorisation actuel de Stripe Connect pour tous les profils demandés. Les tests doivent empêcher tout appel réel à Stripe ou Supabase et ne doivent apporter aucune correction à la route.

### Périmètre prévu

- fichiers ou modules concernés : route Stripe Connect en lecture seule, appels frontend en lecture seule, configuration Vitest, nouveau test unitaire, roadmap et journal ;
- fichiers explicitement exclus : implémentation de la route, autres routes Stripe, `assign-coach`, migrations et logique métier ;
- services externes concernés : Stripe et Supabase entièrement mockés ; aucun appel réseau ;
- migrations éventuelles : aucune.

### Travail effectué

1. Lecture de la roadmap, de la dernière entrée du journal et vérification Git.
2. Analyse de l'écart de commit : le commit attendu `aa53a6e` avait avancé vers `5b529db`, qui contient uniquement le suivi documentaire demandé.
3. Traçage du flux depuis `OnboardingCoachContent` et `useCoachDashboard` vers `/api/stripe/connect`.
4. Vérification que le proxy ignore les routes `/api/` et que la route ne lit aucune session, aucun rôle et aucune relation de propriété.
5. Analyse des appels Stripe et du client Supabase service-role.
6. Création d'un test avec mocks hoistés de Stripe et Supabase.
7. Ajout des scénarios anonyme, utilisateur standard, coach propriétaire, coach non propriétaire, administrateur, lifetime et invité.
8. Ajout d'un scénario démontrant qu'un appel anonyme atteint la création de compte Stripe et l'UPDATE de profil mockés.
9. Ajout des scénarios `coachId` absent et clé Stripe absente.
10. Exécution du test ciblé, de la suite complète, de TypeScript et du lint ciblé.
11. Vérification explicite que `app/api/stripe/connect/route.ts` n'a pas changé.

### Fichiers créés

- `tests/unit/stripe-connect-authorization.test.ts`
  - 10 tests de caractérisation de l'autorisation et des garde-fous actuels de Stripe Connect.

### Fichiers modifiés

- `ROADMAP_CODEX.md`
  - première tâche P0 cochée ; Phase 1 indiquée en cours ; compteurs P0 et tests mis à jour.
- `SESSION_LOG_CODEX.md`
  - ajout de la présente entrée chronologique.

### Fichiers supprimés

Aucun.

### Migrations et base de données

- migration créée : Sans objet
- migration appliquée localement : Sans objet
- migration appliquée à distance : Sans objet
- tables ou fonctions concernées : `profiles` uniquement simulée par le mock ; aucune base contactée
- compatibilité : Sans objet
- rollback : retirer le nouveau fichier de test et les mises à jour documentaires ; aucun état distant n'est concerné.

### Tests exécutés

| Commande | Résultat | Détails |
|---|---|---|
| `npx vitest run tests/unit/stripe-connect-authorization.test.ts` | Réussi | 1 fichier, 10 tests réussis. |
| `npm test` | Réussi | 7 fichiers, 103 tests réussis. |
| `npx tsc --noEmit` | Réussi | Aucune erreur TypeScript. |
| `npx eslint tests/unit/stripe-connect-authorization.test.ts` | Réussi | Aucune erreur ni avertissement. |
| `git diff --exit-code -- app/api/stripe/connect/route.ts` | Réussi | Route strictement inchangée. |
| Build | Non exécuté | Aucun code de production modifié ; tâche limitée aux tests de caractérisation. |
| Vérification manuelle | Réussi | Aucun appel réseau ; tous les clients externes sont mockés. |

### Résultats et mesures

- 10 nouveaux tests.
- Total : 103 tests réussis contre 93 à la baseline.
- 7 profils d'appelant couverts.
- 0 test échoué.
- 0 fichier de production modifié.
- 0 appel à Stripe, Supabase ou un autre service externe.
- Tâches P0 restantes : 14.

### Problèmes rencontrés

- problème : le commit au début différait du commit indiqué dans l'ancien journal ;
- cause identifiée : les deux fichiers documentaires avaient été commités dans `5b529db` avec le message attendu ;
- contournement temporaire éventuel : aucun ; l'état a été vérifié avec `git show` avant toute écriture ;
- état actuel : dépôt cohérent, changement expliqué et consigné.

### Décisions prises

- décision : faire passer les tests en affirmant explicitement le comportement vulnérable actuel plutôt que laisser volontairement la suite rouge ;
- raison : les tests de caractérisation doivent être exécutables en continu et signalent clairement dans leur nom que la route ne distingue aucun rôle ;
- alternatives écartées : tests de sécurité attendus en 401/403 mais laissés rouges, qui rendraient la CI inutilisable avant la session de correction ;
- impact futur : la prochaine correction devra inverser les attentes d'autorisation et mettre à jour ces tests dans la même tranche.

- décision : utiliser un `existingAccountId` contrôlé pour la matrice des rôles et un test séparé pour le flux complet de création ;
- raison : isoler la question d'autorisation tout en prouvant séparément que le chemin anonyme peut atteindre les mutations mockées ;
- alternatives écartées : répéter le flux Supabase complet dans chaque cas, sans valeur de caractérisation supplémentaire ;
- impact futur : les tests restent rapides et les responsabilités sont lisibles.

### Risques et dette restante

- La route n'effectue toujours aucune authentification ou autorisation.
- Tous les profils simulés, y compris anonyme et invité, obtiennent actuellement une réponse 200 lorsque les fournisseurs réussissent.
- Un `existingAccountId` fourni par le client est transmis directement à Stripe.
- Le test prouve le flux de code avec mocks, pas le comportement d'une configuration Stripe ou Supabase réelle.
- Les cookies et tokens des cas authentifiés sont intentionnellement factices : la route ne les lit jamais.
- Aucun test d'intégration avec Supabase local ou Stripe test n'a été exécuté.

### Travail non terminé

- La vulnérabilité Stripe Connect n'est pas corrigée, conformément au périmètre.
- Les tests attendent encore le comportement vulnérable actuel ; ils devront être adaptés lors de la prochaine tranche.
- Le build n'a pas été exécuté car aucun code de production n'a changé.
- Aucun commit n'a été créé.

### Checklist de fin de session

- [x] La tâche respecte son périmètre.
- [x] Aucun fichier utilisateur non lié n'a été écrasé.
- [x] TypeScript a été vérifié.
- [x] Les tests pertinents ont été exécutés.
- [x] Le lint ciblé a été exécuté.
- [ ] Le build a été exécuté ou son absence est justifiée — non exécuté car seul un test unitaire et la documentation ont changé.
- [x] `git status` a été vérifié.
- [x] `ROADMAP_CODEX.md` a été mis à jour.
- [x] Les risques restants sont documentés.
- [x] La prochaine étape est définie.

### Résumé de reprise

La première tâche P0 de la Phase 1 est terminée. Dix tests de caractérisation couvrent les sept profils demandés ainsi que le flux anonyme complet, l'absence de `coachId` et la configuration Stripe absente. Stripe et Supabase sont entièrement mockés ; aucun réseau n'est utilisé. Les 103 tests du projet passent, TypeScript passe et le nouveau fichier passe ESLint. La route `app/api/stripe/connect/route.ts` est strictement inchangée. Les tests documentent que tous les rôles, y compris anonyme, reçoivent actuellement 200 lorsque les fournisseurs réussissent. Le dépôt a commencé sur `5b529db`, commit documentaire cohérent avec la session précédente. Aucun commit n'a été créé pendant cette session.

### Prochaine étape unique

**Action :**

Lier `POST /api/stripe/connect` à la session serveur et au profil coach propriétaire, puis inverser les attentes des tests d'autorisation sans modifier les autres routes Stripe.

**Pourquoi maintenant :**

Les tests de caractérisation sont en place et la deuxième tâche P0 de la roadmap est précisément la correction de l'identité Stripe Connect.

**Fichiers à ouvrir en premier :**

- `app/api/stripe/connect/route.ts`
- `tests/unit/stripe-connect-authorization.test.ts`
- `lib/supabase/server.ts`
- `app/onboarding-coach/OnboardingCoachContent.tsx`
- `app/coach/hooks/useCoachDashboard.ts`

**Tests à préparer ou exécuter :**

- `npx vitest run tests/unit/stripe-connect-authorization.test.ts`
- `npm test`
- `npx tsc --noEmit`
- scénario attendu : anonyme, client, invité, lifetime et coach non propriétaire sont rejetés avant Stripe ; seul le coach propriétaire authentifié atteint le provider mocké.

**Définition de terminé de la prochaine étape :**

- l'identité provient exclusivement de la session serveur ;
- le rôle coach et la propriété du profil sont vérifiés côté serveur ;
- les identifiants du corps ne peuvent pas sélectionner un autre profil ;
- les 10 tests sont adaptés au comportement sécurisé et passent ;
- la suite complète, TypeScript et le lint ciblé passent ;
- aucun service externe réel n'est appelé.

**Ne pas faire pendant la prochaine session :**

- ne pas modifier `assign-coach`, checkout, webhook ou setup-products ;
- ne pas créer de migration ;
- ne pas refactorer l'architecture Billing ;
- ne pas appeler Stripe ou Supabase de production.

### Temps

- Temps de session estimé : 60 à 90 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour la prochaine tâche : 1,5 jour concentré selon les adaptations de mocks nécessaires.

---

## Session 2026-07-11 — 18:36

### Contexte Git

- Branche : `main`
- Commit au début : `d7972a6`
- Commit à la fin : `d7972a6`
- État Git au début : propre ; le commit `d7972a6` contient les tests de caractérisation Stripe Connect et les mises à jour documentaires de la session précédente.
- État Git à la fin : `app/api/stripe/connect/route.ts`, `tests/unit/stripe-connect-authorization.test.ts`, `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` modifiés ; aucun autre fichier modifié.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Sécuriser `POST /api/stripe/connect` pour le coach authentifié propriétaire.
- Statut au début : Tests de caractérisation terminés ; route vulnérable non corrigée.
- Statut à la fin : Terminé ; contrôles d'identité et de rôle en place, tests sécurisés réussis.

### Objectif de la session

Limiter Stripe Connect au coach authentifié propriétaire du profil ciblé, sans modifier une autre route Stripe, une migration ou l'architecture Billing. Retirer toute autorité aux champs `email` et `existingAccountId` fournis par le navigateur.

### Périmètre prévu

- fichiers ou modules concernés : route Stripe Connect, tests d'autorisation, roadmap et journal ;
- fichiers explicitement exclus : checkout plateforme, coach-checkout, webhook, setup-products, assign-coach et autres domaines ;
- services externes concernés : Stripe et Supabase uniquement via mocks pendant les tests ;
- migrations éventuelles : aucune.

### Travail effectué

1. Lecture de la roadmap, de la dernière entrée et vérification Git.
2. Analyse de l'écart de commit : `d7972a6` correspond au commit attendu des tests Stripe Connect de la session précédente.
3. Relecture de la route, des helpers Supabase serveur, des contrôles de rôle existants et des deux appels frontend.
4. Ajout de la récupération de session par `createSupabaseRouteClient()` et `auth.getUser()`.
5. Ajout du rejet anonyme en 401 avant toute construction Stripe ou service-role.
6. Validation de `coachId`, puis comparaison stricte avec `user.id`.
7. Lecture serveur du profil authentifié et vérification stricte de `role === 'coach'`.
8. Déplacement du contrôle de configuration et de la construction Stripe après tous les contrôles d'autorisation.
9. Suppression de l'autorité de `email` et `existingAccountId` issus du corps.
10. Utilisation de `profiles.email`, avec fallback sur l'email de session.
11. Réutilisation exclusive de `profiles.stripe_account_id` ; maintien de la vérification serveur anti-course existante.
12. Adaptation des 10 tests aux statuts et comportements sécurisés attendus.
13. Vérification des non-appels Stripe/service-role et des non-mutations pour chaque rejet.
14. Exécution du test ciblé, de la suite complète, de TypeScript et d'ESLint ciblé.

### Fichiers créés

Aucun.

### Fichiers modifiés

- `app/api/stripe/connect/route.ts`
  - authentification serveur, contrôle propriétaire, contrôle du rôle coach et sources serveur pour email/compte Stripe.
- `tests/unit/stripe-connect-authorization.test.ts`
  - adaptation des 10 tests de caractérisation en tests de sécurité attendus.
- `ROADMAP_CODEX.md`
  - deuxième tâche P0 cochée ; statut de phase et compteurs mis à jour.
- `SESSION_LOG_CODEX.md`
  - ajout de la présente entrée.

### Fichiers supprimés

Aucun.

### Migrations et base de données

- migration créée : Sans objet
- migration appliquée localement : Sans objet
- migration appliquée à distance : Sans objet
- tables ou fonctions concernées : lecture de `profiles.role`, `profiles.email` et `profiles.stripe_account_id` ; écriture existante de `profiles.stripe_account_id` après autorisation
- compatibilité : les payloads frontend existants restent acceptés ; `email` et `existingAccountId` sont simplement ignorés comme autorités
- rollback : rétablir la route et les attentes de tests au commit `d7972a6` ; aucune migration à annuler.

### Tests exécutés

| Commande | Résultat | Détails |
|---|---|---|
| `npm test -- tests/unit/stripe-connect-authorization.test.ts` | Réussi | 1 fichier, 10 tests réussis. |
| `npm test` | Réussi | 7 fichiers, 103 tests réussis. |
| `npx tsc --noEmit` | Réussi | Aucune erreur TypeScript. |
| `npx eslint app/api/stripe/connect/route.ts tests/unit/stripe-connect-authorization.test.ts` | Réussi | Aucune erreur ni avertissement. |
| `git diff --check` | Réussi | Aucune erreur de format détectée avant la mise à jour documentaire. |
| Build | Non exécuté | L'environnement restreint ne permet pas de garantir le téléchargement des Google Fonts ; les validations ciblées demandées passent. |
| Vérification manuelle du diff | Réussi | Aucun changement hors route, test et documentation de session. |

### Résultats et mesures

- 10 tests Stripe Connect réussis.
- 103 tests projet réussis.
- 401 pour anonyme.
- 403 pour client, invité, lifetime non coach, admin et coach non propriétaire.
- 400 pour `coachId` absent après authentification.
- 200 uniquement pour le coach propriétaire avec profil coach.
- 0 appel Stripe et 0 client service-role construit avant autorisation.
- 0 migration et 0 appel externe réel.
- Tâches P0 restantes : 13.

### Problèmes rencontrés

- problème : le commit initial différait du dernier commit mentionné dans le journal ;
- cause identifiée : la session précédente avait été commitée dans `d7972a6` avec le message `test(stripe): cover Connect authorization` ;
- contournement temporaire éventuel : aucun ; commit et diff vérifiés avant modification ;
- état actuel : cohérent et documenté.

### Décisions prises

- décision : accepter uniquement le rôle exact `coach`, sans exception admin/super-admin ;
- raison : l'objectif exige que seul le coach propriétaire accède à son onboarding Connect et aucune règle produit contraire n'a été trouvée ;
- alternatives écartées : exception administrateur, qui élargirait inutilement le périmètre ;
- impact futur : toute opération administrative Connect devra avoir un flux séparé et explicite.

- décision : ignorer `existingAccountId` du navigateur plutôt que le comparer ;
- raison : le profil serveur contient déjà la source autoritative et les deux frontends fonctionnent sans dépendre de ce champ ;
- alternatives écartées : compatibilité temporaire par comparaison, plus complexe sans bénéfice fonctionnel ;
- impact futur : le champ pourra être retiré des payloads frontend dans un nettoyage ultérieur sans urgence.

- décision : conserver le second contrôle serveur et l'UPDATE conditionnel service-role après autorisation ;
- raison : préserver l'idempotence et la protection anti-course existantes avec le changement minimal ;
- alternatives écartées : refactoriser maintenant le service Connect ou modifier les policies RLS ;
- impact futur : ce flux pourra être extrait lors de la Phase Billing.

### Risques et dette restante

- Le body n'utilise pas encore un schéma Zod ; cela relève de la phase de contrats API.
- Le profil est lu avec le client de session, puis revérifié avec service-role uniquement si aucun compte n'est stocké dans la première lecture.
- Les tests utilisent des mocks ; aucun test d'intégration Supabase local ou Stripe test n'a été exécuté.
- Les payloads frontend contiennent encore `email` et parfois `existingAccountId`, désormais ignorés.
- Les autres routes Stripe restent hors périmètre et conservent leur état actuel.

### Travail non terminé

- Le nettoyage des champs frontend ignorés n'est pas réalisé, car non nécessaire à la correction et hors objectif unique.
- Aucun build n'a été exécuté en raison de la dépendance réseau Google Fonts connue dans cet environnement.
- Aucun commit n'a été créé.

### Checklist de fin de session

- [x] La tâche respecte son périmètre.
- [x] Aucun fichier utilisateur non lié n'a été écrasé.
- [x] TypeScript a été vérifié.
- [x] Les tests pertinents ont été exécutés.
- [x] Le lint ciblé a été exécuté.
- [ ] Le build a été exécuté ou son absence est justifiée — environnement restreint et téléchargement Google Fonts non garanti.
- [x] `git status` a été vérifié.
- [x] `ROADMAP_CODEX.md` a été mis à jour.
- [x] Les risques restants sont documentés.
- [x] La prochaine étape est définie.

### Résumé de reprise

La deuxième tâche P0 de la Phase 1 est terminée. `POST /api/stripe/connect` exige maintenant une session serveur, l'égalité `coachId === user.id` et un profil de rôle coach avant toute construction Stripe ou service-role. L'email et l'identifiant de compte Stripe proviennent exclusivement du serveur ; les champs navigateur correspondants n'ont plus d'autorité. Les 10 tests sécurisés passent, ainsi que les 103 tests du projet, TypeScript et ESLint ciblé. Aucune migration, autre route Stripe ou logique frontend n'a été modifiée. Le build n'a pas été lancé à cause de la dépendance réseau Google Fonts connue. Le commit de départ est `d7972a6` et aucun commit n'a été créé pendant cette session.

### Prochaine étape unique

**Action :**

Ajouter les tests d'autorisation de `POST /api/assign-coach` pour documenter les comportements anonyme, auto-assign, invitation arbitraire et identité imposée par la session, sans corriger encore la route.

**Pourquoi maintenant :**

C'est la troisième tâche P0 de la Phase 1 et le filet de caractérisation requis avant de créer le contrat d'invitation coach à usage unique.

**Fichiers à ouvrir en premier :**

- `app/api/assign-coach/route.ts`
- `app/join/JoinPageContent.tsx`
- `app/auth/callback/route.ts`
- `app/register-client/RegisterClientContent.tsx`
- `tests/unit/stripe-connect-authorization.test.ts`

**Tests à préparer ou exécuter :**

- `npm test -- tests/unit/assign-coach-authorization.test.ts`
- scénario anonyme attendu : 401 ;
- scénario authentifié : l'identité client vient de `user.id`, jamais du corps ;
- scénario invitation arbitraire actuel : documenter précisément la mutation accordée ;
- scénario auto-assign : documenter le flux normal sans statut invited.

**Définition de terminé de la prochaine étape :**

- les principaux scénarios d'autorisation et de mutation sont couverts par des mocks isolés ;
- aucune base, notification ou service production n'est appelé ;
- la route `assign-coach` reste inchangée ;
- la suite ciblée, la suite complète, TypeScript et le lint ciblé passent ;
- les comportements vulnérables actuels sont nommés explicitement dans les tests.

**Ne pas faire pendant la prochaine session :**

- ne pas corriger `assign-coach` ;
- ne pas créer le contrat ou la migration d'invitation ;
- ne pas modifier les routes Stripe ;
- ne pas appeler Supabase de production.

### Temps

- Temps de session estimé : 75 à 120 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour la prochaine tâche : 1,5 jour concentré.

---

## Session 2026-07-11 — 18:45

### Contexte Git

- Branche : `main`
- Commit au début : `75bb6b0`
- Commit à la fin : `75bb6b0`
- État Git au début : propre ; la sécurisation Stripe Connect et son suivi avaient été commités avant cette session.
- État Git à la fin : nouveau test `tests/unit/assign-coach-authorization.test.ts`, roadmap et journal modifiés ; route `app/api/assign-coach/route.ts` inchangée.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Écrire les tests d'autorisation de `POST /api/assign-coach`.
- Statut au début : Non commencé ; comportement vulnérable connu mais non figé par des tests dédiés.
- Statut à la fin : Terminé ; 16 tests de caractérisation réussis et vulnérabilité explicitement démontrée.

### Objectif de la session

Figer le comportement actuel de `POST /api/assign-coach`, en particulier l'obtention arbitraire de l'abonnement `invited`, sans modifier ni corriger la route, les parcours d'inscription, les migrations ou les règles RLS.

### Périmètre prévu

- fichiers ou modules concernés : test unitaire dédié, roadmap et journal ;
- fichiers explicitement exclus : route `assign-coach`, `/join`, callback auth, inscription client, routes Stripe et migrations ;
- services externes concernés : Supabase uniquement par mocks isolés ;
- migrations éventuelles : aucune.

### Travail effectué

1. Lecture de la roadmap, de la dernière entrée du journal et de la demande jointe.
2. Vérification de la branche `main`, du commit `75bb6b0` et d'un arbre de travail propre.
3. Analyse de la route `assign-coach`, de `/join`, de l'inscription client, du callback auth et des helpers Supabase.
4. Analyse des migrations `profiles`, `coach_clients`, abonnements, contraintes uniques, RLS et garde des colonnes sensibles.
5. Recherche des tests existants ; aucun test dédié à `assign-coach` n'existait.
6. Création d'un mock du client session et d'un client service-role distincts.
7. Ajout de 16 tests couvrant authentification, rôles, cible, abonnements, résolution du coach, mutations ordonnées, échecs partiels et configuration.
8. Vérification explicite que `clientId` du corps est ignoré au profit de `user.id`.
9. Démonstration explicite qu'un simple `coachId` accorde actuellement `active/invited` sans invitation enregistrée.
10. Exécution des tests ciblés et complets, de TypeScript, d'ESLint et de `git diff --check`.

### Fichiers créés

- `tests/unit/assign-coach-authorization.test.ts`
  - 16 tests de caractérisation avec mocks Supabase sans réseau.

### Fichiers modifiés

- `ROADMAP_CODEX.md`
  - troisième tâche P0 cochée ; compteurs de phase, progression, tâches restantes et tests mis à jour.
- `SESSION_LOG_CODEX.md`
  - ajout de la présente entrée.

### Fichiers de production modifiés

Aucun. `app/api/assign-coach/route.ts` est strictement inchangé.

### Fichiers supprimés

Aucun.

### Migrations et base de données

- migration créée : Sans objet
- migration appliquée localement : Sans objet
- migration appliquée à distance : Sans objet
- tables simulées : `profiles` et `coach_clients`
- compatibilité : aucune modification de comportement ; tests de caractérisation uniquement
- rollback : supprimer le nouveau fichier de test et rétablir les deux documents ; aucune base à restaurer.

### Tests exécutés

| Commande | Résultat | Détails |
|---|---|---|
| `npm test -- tests/unit/assign-coach-authorization.test.ts` | Réussi | 1 fichier, 16 tests réussis. |
| `npm test` | Réussi | 8 fichiers, 119 tests réussis. |
| `npx tsc --noEmit` | Réussi | Aucune erreur TypeScript après ajustement du typage des mocks. |
| `npx eslint tests/unit/assign-coach-authorization.test.ts` | Réussi | Aucune erreur ni avertissement dans le fichier créé. |
| `npx eslint app/api/assign-coach/route.ts tests/unit/assign-coach-authorization.test.ts` | Échec préexistant documenté | Une erreur `@typescript-eslint/no-explicit-any` sur `app/api/assign-coach/route.ts:78`; la route devait rester inchangée. |
| `git diff --check` | Réussi | Aucune erreur de format. |
| Build | Non exécuté | Dépendance réseau Google Fonts connue ; aucun code de production n'a changé. |

### Scénarios caractérisés

- anonyme rejeté en 401 avant création du client service-role ;
- client standard, invité, lifetime, coach et administrateur authentifiés tous acceptés sans contrôle de rôle ;
- `clientId` falsifié ignoré, cible réelle égale à `user.id` ;
- `coachId` arbitraire accepté sans preuve d'invitation ;
- `coachId` syntaxiquement invalide transmis jusqu'à l'upsert ;
- `autoAssign: true` remplace même un `coachId` fourni par le coach par défaut et ne modifie que le rôle ;
- `coachId` absent avec `autoAssign: false` utilise le coach par défaut mais n'inscrit pas `invited_by_coach` ;
- absence de coach fourni et de coach par défaut renvoie 400 sans mutation ;
- erreur d'UPDATE `profiles` ignorée, puis upsert exécuté ;
- erreur d'upsert renvoie 500 après tentative de mutation du profil ;
- coach inexistant représenté par l'erreur de clé étrangère après mutation du profil ;
- clé service-role absente renvoie 500 avant le client admin et toute mutation.

### Vulnérabilités et comportements critiques démontrés

- Un utilisateur authentifié sans invitation enregistrée peut fournir un `coachId` et provoquer la mutation service-role suivante sur son propre profil : `subscription_status = 'active'`, `subscription_type = 'invited'`, `trial_ends_at = null`.
- Aucun contrôle ne vérifie que le `coachId` correspond à un profil coach avant la mutation d'abonnement.
- Aucun rôle appelant n'est vérifié : client, invited, lifetime, coach et admin suivent le même chemin.
- Les mutations ne sont pas transactionnelles : l'abonnement peut être modifié alors que la relation coach/client échoue.
- Une erreur de mise à jour du profil est ignorée et peut conduire à une réponse 200 si l'upsert réussit.

### Décisions prises

- décision : refléter les réponses et mutations actuelles, y compris lorsqu'elles sont vulnérables ;
- raison : la session est exclusivement un filet de caractérisation avant conception du contrat d'invitation ;
- alternatives écartées : attentes sécurisées rouges ou correction immédiate de la route ;
- impact futur : les tests devront être adaptés explicitement lors de l'introduction du contrat sécurisé.

- décision : modéliser le coach inexistant comme une erreur de contrainte lors de l'upsert ;
- raison : la route n'effectue aucune lecture préalable du profil coach et la base est l'unique validation actuelle ;
- alternatives écartées : inventer une validation applicative inexistante ;
- impact futur : le futur contrat devra valider invitation, coach et état avant toute mutation.

### Limitations des tests

- Les tests utilisent des mocks et ne valident pas réellement les contraintes PostgreSQL, les triggers ou les RLS.
- Le statut de rôle est simulé dans les métadonnées de session uniquement pour prouver que la route ne le consulte pas.
- Le test de coach inexistant simule le message de contrainte Supabase ; aucune base locale n'est appelée.
- La route transforme les erreurs JSON et fournisseurs en 500 génériques ; tous les cas de parsing malformé ne sont pas couverts.
- ESLint global ciblé reste rouge sur un `any` préexistant dans la route, laissé intact par contrainte.

### Travail non terminé

- Aucune correction de la vulnérabilité n'a été commencée.
- Aucun contrat d'invitation, schéma, token à usage unique ou migration n'a été créé.
- Aucun build n'a été exécuté à cause de la contrainte Google Fonts connue.
- Aucun commit n'a été créé.

### Checklist de fin de session

- [x] La tâche respecte son périmètre.
- [x] La route `assign-coach` est inchangée.
- [x] Aucun fichier utilisateur non lié n'a été écrasé.
- [x] TypeScript a été vérifié.
- [x] Les tests ciblés et complets ont été exécutés.
- [x] Le nouveau test passe ESLint.
- [ ] La commande ESLint incluant la route passe — erreur `no-explicit-any` préexistante documentée, correction interdite dans cette session.
- [ ] Le build a été exécuté — non exécuté, dépendance Google Fonts connue et aucun code de production modifié.
- [x] `git status` a été vérifié.
- [x] `ROADMAP_CODEX.md` a été mis à jour.
- [x] Les vulnérabilités et limitations sont documentées.
- [x] La prochaine étape est définie.

### Résumé de reprise

La troisième tâche P0 de la Phase 1 est terminée. Seize tests dédiés figent le comportement actuel de `POST /api/assign-coach`. Ils prouvent qu'un utilisateur authentifié, quel que soit son rôle, peut fournir un `coachId` arbitraire et obtenir `subscription_status='active'`, `subscription_type='invited'`, `trial_ends_at=null` sans invitation enregistrée. L'identité client reste correctement imposée par `user.id`, mais le flux présente des mutations partielles et ignore l'erreur de mise à jour du profil. Les 16 tests ciblés et les 119 tests du projet passent, TypeScript passe et le nouveau fichier passe ESLint. La route est inchangée. La commande ESLint incluant la route signale son `catch (error: any)` préexistant. Aucun réseau, migration ou service réel n'a été utilisé.

### Prochaine étape unique

**Action :**

Créer le contrat applicatif d'invitation coach à usage unique, sans encore créer ni appliquer la migration.

**Pourquoi maintenant :**

Les comportements vulnérables sont figés. La quatrième tâche P0 consiste à définir précisément l'autorité, le cycle de vie et les invariants nécessaires avant toute évolution rétrocompatible de la base.

**Fichiers à ouvrir en premier :**

- `app/api/assign-coach/route.ts`
- `app/join/JoinPageContent.tsx`
- `app/auth/callback/route.ts`
- migrations liées à `profiles` et `coach_clients`
- `tests/unit/assign-coach-authorization.test.ts`

**Livrable attendu :**

- contrat documenté des champs d'une invitation ;
- états `pending`, `accepted`, `expired`, `revoked` et règles de transition ;
- preuve que seul le bénéficiaire authentifié peut consommer une invitation valide ;
- définition de l'idempotence, de l'expiration, du hash/token et de l'audit ;
- stratégie expand/contract et compatibilité temporaire avec les liens actuels ;
- aucun SQL ni changement de route pendant cette étape de conception.

**Ne pas faire pendant la prochaine session :**

- ne pas créer ou appliquer de migration ;
- ne pas corriger immédiatement `assign-coach` ;
- ne pas modifier `/join`, Stripe, RLS ou un autre domaine ;
- ne pas appeler Supabase de production.

### Temps

- Temps de session estimé : 75 à 120 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour la prochaine tâche : 2 jours concentrés selon les décisions de compatibilité.

---

## Session 2026-07-11 — 18:55

### Contexte Git

- Branche : `main`
- Commit au début : `1072796`
- Commit à la fin : `1072796`
- État Git au début : propre ; les tests de caractérisation `assign-coach` étaient commités.
- État Git à la fin : spécification créée, roadmap et journal modifiés ; aucun fichier applicatif, test ou migration modifié.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Créer le contrat d'invitation coach à usage unique.
- Statut au début : Non commencé ; comportements vulnérables caractérisés.
- Statut à la fin : Terminé ; spécification normative exploitable sans redéfinition majeure.
- Compteur de corrections P0 : inchangé à 12 tâches restantes, car aucune vulnérabilité n'a été corrigée pendant cette session documentaire.

### Objectif de la session

Concevoir le contrat complet qui remplacera le `coachId` arbitraire de `POST /api/assign-coach`, sans écrire de SQL, modifier une route, changer une policy ou appeler un service externe.

### Périmètre prévu

- fichiers concernés : `docs/COACH_INVITATION_CONTRACT.md`, roadmap et journal ;
- fichiers explicitement exclus : toutes les routes, composants, tests, migrations et policies ;
- services externes concernés : aucun ;
- migrations éventuelles : aucune.

### Travail effectué

1. Lecture de la demande complète, de la roadmap et de la dernière entrée de session.
2. Vérification de la branche, du commit et d'un arbre de travail propre.
3. Relecture de `assign-coach`, de ses 16 tests, de `/join`, de l'inscription, du callback et de `invite-client`.
4. Analyse des migrations `profiles`, `coach_clients`, garde des colonnes sensibles et policies d'assignation.
5. Analyse des conventions existantes : `claim_beta_slot`, `set_initial_trial`, `set_role`, helpers Supabase, rate limiter et email.
6. Définition du modèle `coach_invitations`, de ses contraintes, index et champs d'audit.
7. Définition des acteurs, permissions, statuts, transitions et règles d'éligibilité.
8. Choix d'un jeton aléatoire 256 bits Base64URL stocké uniquement sous hash SHA-256.
9. Choix d'une invitation strictement liée à l'email vérifié du bénéficiaire.
10. Conception d'une consommation par RPC PostgreSQL transactionnelle avec verrou de ligne.
11. Définition des quatre contrats API, codes d'erreur, rate limits et protections anti-énumération.
12. Définition de la coexistence, des feature flags, du traitement des anciens liens et de la séquence expand/contract.
13. Définition du plan de tests unitaires, intégration/RPC, RLS et E2E à écrire avant implémentation.
14. Vérification de l'existence des chemins cités et de la présence des 18 sections obligatoires.

### Fichiers créés

- `docs/COACH_INVITATION_CONTRACT.md`
  - spécification normative de 18 sections couvrant modèle, sécurité, API, atomicité, migration et tests.

### Fichiers modifiés

- `ROADMAP_CODEX.md`
  - tâche documentaire cochée et liée ; phase à 4 tâches sur 15 ; progression documentaire globale à environ 4 %.
- `SESSION_LOG_CODEX.md`
  - ajout de la présente entrée.

### Fichiers applicatifs, tests et migrations

Aucun fichier applicatif, test, migration ou policy n'a été modifié. La vulnérabilité reste volontairement présente jusqu'aux prochaines étapes test-first.

### Décisions normatives

- invitation liée strictement à l'email normalisé et vérifié du compte ;
- jeton de 32 octets aléatoires, Base64URL sans padding, 256 bits d'entropie ;
- seul SHA-256 du jeton est stocké dans un `bytea` unique ;
- durée par défaut de 7 jours ;
- statuts persistés `pending`, `consumed`, `revoked`, expiration calculée ;
- rôle exact `coach` requis pour créer ; administrateur non assimilé à un coach ;
- coach dérivé de l'invitation et client dérivé de `auth.uid()` ;
- consommation atomique par RPC `SECURITY DEFINER` avec `FOR UPDATE` et `search_path` sûr ;
- compte lifetime, beta actif, Stripe actif, coach/admin ou déjà invited non éligible ;
- anciens liens UUID jamais acceptés comme preuve ; réponse `410` après bascule ;
- assignation au coach par défaut conservée dans un flux séparé sans accès `invited` ;
- échec SMTP conserve l'invitation pending avec état de livraison failed et réponse 502 ;
- conservation d'audit proposée à 24 mois avant anonymisation/purge.

### Décisions ouvertes non bloquantes

- La durée, la rétention et l'affichage public du nom du coach pourront évoluer via constantes ou politique produit.
- Un futur transfert entre coachs nécessitera un contrat séparé ; il est refusé en V1.
- Une éventuelle création administrative au nom d'un coach nécessitera un endpoint distinct et audité ; elle est refusée en V1.

### Validation effectuée

| Vérification | Résultat | Détails |
|---|---|---|
| Présence des 18 sections | Réussi | Sections 1 à 18 détectées. |
| Chemins cités | Réussi | Tous les fichiers principaux contrôlés existent dans le dépôt. |
| Cohérence avec le dépôt | Réussi | Contrat aligné sur les RPC, garde de profil, helper email et rate limit existants. |
| `git diff --check` | Réussi avant suivi final | Aucune erreur de format détectée. |
| Tests applicatifs | Non exécutés | Seuls des fichiers Markdown sont créés/modifiés ; aucun comportement exécutable n'a changé. |
| Build | Non exécuté | Documentation uniquement et contrainte Google Fonts connue. |

### Risques et limites restant à traiter

- Le rate limiter mémoire existant n'est pas suffisant seul pour une protection distribuée ; une persistance sera nécessaire avant ouverture large.
- La future RPC devra accéder à l'email Auth vérifié de manière contrôlée et être testée sur Supabase local.
- Les contraintes de cohérence et RLS ne sont encore que spécifiées, pas appliquées.
- Les anciens liens UUID ne peuvent pas être sécurisés rétroactivement faute d'identité destinataire.
- Les utilisateurs déjà `invited` nécessitent un audit séparé, sans création d'invitations fictives.
- Le transport du jeton à travers OAuth/callback devra empêcher les fuites dans logs, referer et analytics.

### Travail non terminé

- Aucun test du nouveau contrat n'a encore été écrit.
- Aucune table, RPC, route, adaptation frontend, migration ou feature flag n'a été créé.
- Aucune vulnérabilité n'a été corrigée.
- Aucun commit n'a été créé.

### Checklist de fin de session

- [x] Spécification complète et exploitable.
- [x] Aucune décision critique non résolue.
- [x] Modèle, cycle, jeton, acteurs, API et atomicité définis.
- [x] Compatibilité, migration et rollback décrits.
- [x] Plan de tests futur défini avant implémentation.
- [x] Aucun fichier applicatif, test ou migration modifié.
- [x] Aucun service externe appelé.
- [x] Roadmap mise à jour avec lien vers le contrat.
- [x] Compteur des corrections P0 laissé inchangé.
- [x] Prochaine étape unique définie.

### Résumé de reprise

Le contrat d'invitation coach à usage unique est défini dans `docs/COACH_INVITATION_CONTRACT.md`. Il impose un jeton aléatoire 256 bits hashé en SHA-256, un destinataire lié à un email vérifié, une expiration à 7 jours et une consommation transactionnelle sous `auth.uid()`. Le coach provient exclusivement de l'invitation. Les anciens UUID ne constituent jamais une preuve et devront renvoyer 410 après bascule. La spécification comprend le modèle de données, les statuts, les droits, quatre endpoints, les erreurs, RLS, atomicité, transition expand/contract et le plan complet de tests. Aucun fichier exécutable ou SQL n'a été modifié et aucune vulnérabilité n'a encore été corrigée.

### Prochaine étape unique

**Action :**

Écrire les tests du nouveau contrat d'invitation coach avant de créer la migration ou de modifier `POST /api/assign-coach`.

**Pourquoi maintenant :**

Le contrat est normatif et les comportements actuels sont déjà caractérisés. Les futurs tests peuvent désormais figer les règles sécurisées avant toute implémentation.

**Fichiers à ouvrir en premier :**

- `docs/COACH_INVITATION_CONTRACT.md`
- `tests/unit/assign-coach-authorization.test.ts`
- `app/api/assign-coach/route.ts`
- conventions de tests RPC/RLS disponibles dans le dépôt

**Tests à préparer :**

- services purs de normalisation, génération/hash et validation de token ;
- contrats API de création, validation, consommation et révocation avec fournisseurs mockés ;
- spécifications d'intégration de la RPC : atomicité, rollback et concurrence ;
- matrice RLS inter-coachs, destinataire et accès au hash ;
- attentes legacy `coachId`, `clientId` et `autoAssign` sans modifier encore la route.

**Définition de terminé de la prochaine étape :**

- tests sécurisés écrits avant SQL et correction ;
- scénarios création, consommation, révocation, expiration et double usage couverts ;
- tests RPC/RLS identifiés séparément des mocks unitaires ;
- aucune migration et aucune route de production modifiée ;
- suite existante toujours verte ou attentes rouges explicitement isolées comme spécification future.

**Ne pas faire pendant la prochaine session :**

- ne pas créer la migration ;
- ne pas modifier `assign-coach`, `/join`, callback ou `invite-client` ;
- ne pas appliquer de SQL local ou distant ;
- ne pas appeler Supabase, Stripe ou SMTP de production.

### Temps

- Temps de session estimé : 90 à 120 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour les tests du nouveau contrat : 1,5 à 2 jours concentrés.

---

## Session 2026-07-11 — 19:00

### Contexte Git

- Branche : `main`
- Commit au début : `0637f67`
- Commit à la fin : `0637f67`
- État Git au début : propre ; contrat documentaire d'invitation commitée.
- État Git à la fin : nouveau cahier de tests contractuels, roadmap et journal modifiés ; aucun fichier applicatif ou SQL modifié.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Écrire les tests du nouveau contrat d'invitation coach avant implémentation.
- Statut au début : Contrat normatif disponible, aucun test du futur comportement.
- Statut à la fin : Terminé ; 14 tests purs actifs et 79 scénarios futurs explicitement `todo`.
- Tâches Phase 1 cochées : inchangées à 4 sur 15 ; aucune migration ou correction n'a été réalisée.
- Compteur P0 restant : inchangé à 12.

### Objectif de la session

Transformer `docs/COACH_INVITATION_CONTRACT.md` en cahier de tests exécutable, sans implémenter la table, les routes, la RPC, les RLS ou le frontend.

### Périmètre prévu

- fichiers concernés : un test contractuel dédié, roadmap et journal ;
- fichiers exclus : routes `assign-coach` et `invite-client`, `/join`, callback, migrations, policies et code de production ;
- services externes : aucun ;
- migrations : aucune.

### Travail effectué

1. Lecture du contrat complet, des tests de caractérisation, des routes actuelles et de la configuration Vitest.
2. Définition d'une fixture normative strictement locale au test, signalée comme temporaire et non productive.
3. Ajout de tests actifs pour normalisation NFKC/lowercase, expiration à 7 jours, jeton Base64URL 256 bits et hash SHA-256.
4. Ajout de tests actifs pour les entrées autorisées, autorités interdites, statuts, transitions, état final du profil, URLs legacy/token et codes d'erreur.
5. Ajout de scénarios `todo` structurés par création, validation, consommation, atomicité, révocation, RLS et compatibilité.
6. Séparation explicite des dépendances d'activation : route de création, endpoint de validation, route/RPC de consommation, migration locale/RLS et frontend/callback.
7. Exécution des validations ciblées et globales.

### Fichiers créés

- `tests/unit/coach-invitation-contract.test.ts`
  - 14 tests actifs de cohérence pure ;
  - 79 tests `todo` décrivant les comportements futurs sans mocks vides ;
  - aucune importation de route ou de module de production inexistant.

### Fichiers modifiés

- `ROADMAP_CODEX.md`
  - indicateur de tests porté à 133 actifs et 79 contractuels `todo`.
- `SESSION_LOG_CODEX.md`
  - ajout de la présente entrée.

### Fichiers applicatifs, tests existants et SQL

- Routes applicatives modifiées : aucune.
- Tests existants modifiés ou affaiblis : aucun.
- Migration, table, RPC ou policy créée : aucune.
- Frontend et callback modifiés : aucun.

### Organisation et statut des tests

| Domaine | Tests actifs | Tests `todo` | Dépendance d'activation |
|---|---:|---:|---|
| Création | 6 | 16 | Service et `POST /api/coach/invitations` |
| Validation | 2 | 10 | Endpoint de validation |
| Consommation | 2 | 20 | Route de consommation et RPC |
| Atomicité | 2 | 8 | Migration et tests PostgreSQL locaux |
| Révocation | 0 | 7 | Route/RPC de révocation |
| RLS | 0 | 9 | Table, policies et Supabase local |
| Compatibilité | 1 | 9 | `/join`, callback et feature flags |
| Erreurs stables | 1 | 0 | Contrat pur |
| **Total** | **14** | **79** | — |

Il n'existe aucun `skip`. Les 79 scénarios futurs sont visibles comme `todo` dans Vitest et ne donnent pas une impression de couverture implémentée.

### Validations exécutées

| Commande | Résultat | Détails |
|---|---|---|
| `npm test -- tests/unit/coach-invitation-contract.test.ts` | Réussi | 14 actifs réussis, 79 `todo`, 93 cas recensés. |
| `npm test` | Réussi | 9 fichiers, 133 actifs réussis, 79 `todo`, 212 cas recensés. |
| `npx tsc --noEmit` | Réussi | Aucune erreur TypeScript. |
| `npx eslint tests/unit/coach-invitation-contract.test.ts` | Réussi | Aucune erreur ni avertissement. |
| `git diff --check` | Réussi avant suivi final | Aucun problème de format. |
| Build | Non exécuté | Aucun code de production modifié et contrainte Google Fonts connue. |

### Règles pures désormais exécutables

- email : trim, NFKC et lowercase sans transformation spécifique aux fournisseurs ;
- durée : 7 jours exactement ;
- jeton : 32 octets, 256 bits, Base64URL sans padding, 43 caractères ;
- hash : SHA-256 de 32 octets, différent du secret transporté ;
- création : seuls `recipientEmail` et `locale` sont autorisés comme données métier ;
- consommation : seul `token` est autorisé ; coach/client/autoAssign/abonnements ne sont jamais autorités ;
- profil final : `client`, `active`, `invited`, `trial_ends_at=null` ;
- états persistés : `pending`, `consumed`, `revoked` ;
- transitions : uniquement `pending→consumed` et `pending→revoked` ;
- expiration : état calculé, jamais persisté ;
- anciens liens UUID : classés legacy, jamais preuve ;
- vocabulaire : 14 codes d'erreur stables et non dupliqués.

### Limitations assumées

- Les tests actifs vérifient une fixture contractuelle locale et non une implémentation de production.
- La robustesse cryptographique de Node n'est pas auditée ; les tests figent format, longueur et algorithme attendus.
- Les 79 `todo` ne valident encore aucune route, transaction, contrainte ou policy réelle.
- Atomicité et concurrence nécessiteront PostgreSQL/Supabase local après la migration.
- Les compteurs de tests distinguent désormais les tests actifs des cas contractuels futurs.

### Travail non terminé

- Aucune migration additive n'a été créée.
- Aucune RPC transactionnelle n'a été implémentée.
- Aucun test `todo` dépendant de la base n'a été activé.
- Aucun comportement vulnérable n'a été corrigé.
- Aucun commit n'a été créé.

### Checklist de fin de session

- [x] Sections creation, validation, consumption, atomicity, revocation, rls et compatibility présentes.
- [x] Tests purs actifs et réussis.
- [x] Tests futurs explicitement `todo`.
- [x] Aucun test passant artificiellement avec des mocks vides.
- [x] Aucun test existant affaibli.
- [x] Suite complète, TypeScript et ESLint réussis.
- [x] Aucun fichier applicatif ou SQL modifié.
- [x] Aucun service externe appelé.
- [x] Roadmap et journal mis à jour.
- [x] Prochaine étape unique définie.

### Résumé de reprise

Le futur contrat d'invitation est désormais représenté par 93 cas dans `tests/unit/coach-invitation-contract.test.ts` : 14 règles pures actives et 79 scénarios futurs `todo`. La suite normale reste verte avec 133 tests actifs. Les cas futurs couvrent création, validation, consommation, atomicité, révocation, RLS et compatibilité, avec leur dépendance d'activation nommée. Aucun mock vide, aucun fichier de production, aucune route et aucune migration n'ont été ajoutés. La vulnérabilité actuelle reste inchangée.

### Prochaine étape unique

**Action :**

Créer la migration additive `coach_invitations` et la RPC transactionnelle de consommation, sans modifier encore le frontend ni supprimer l'ancien flux.

**Pourquoi maintenant :**

Le modèle, les invariants et tous les scénarios attendus sont figés avant SQL. La prochaine étape peut implémenter la persistance et activer les tests PostgreSQL/RLS correspondants sans redéfinir le métier.

**Fichiers à ouvrir en premier :**

- `docs/COACH_INVITATION_CONTRACT.md`
- `tests/unit/coach-invitation-contract.test.ts`
- migrations `guard_profile_sensitive_columns`, `claim_beta_slot`, `set_role` et `coach_clients`
- configuration Supabase locale et conventions de tests SQL du dépôt

**Définition de terminé de la prochaine étape :**

- migration additive et idempotente ;
- table, contraintes, index et RLS conformes au contrat ;
- RPC `SECURITY DEFINER` avec `auth.uid()`, `FOR UPDATE` et `search_path` sûr ;
- rollback transactionnel prouvé sur Supabase local ;
- concurrence : exactement une consommation réussie ;
- tests d'intégration/RLS concernés activés et verts ;
- aucune modification de `/join`, callback, `invite-client` ou suppression legacy.

**Ne pas faire pendant la prochaine session :**

- ne pas modifier encore le frontend ;
- ne pas supprimer ou transformer le flux legacy ;
- ne pas appeler Supabase de production ;
- ne pas mélanger migration, routes API et bascule produit dans un même chantier.

### Temps

- Temps de session estimé : 90 à 120 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour migration + RPC + tests locaux : 2 jours concentrés.

---

## Session 2026-07-11 — 19:09

### Contexte Git

- Branche : `main`
- Commit au début : `04253d5`
- Commit à la fin : `04253d5`
- État Git au début : propre ; contrat et cahier de tests commités.
- État Git à la fin : une nouvelle migration, un test statique SQL, roadmap et journal modifiés ; aucun frontend ni route applicative modifié.

### Roadmap

- Phase : Phase 1 — Stabilisation et sécurité
- Priorité : P0
- Tâche principale : Ajouter la migration rétrocompatible `coach_invitations` et la RPC transactionnelle.
- Statut au début : Contrat et tests futurs disponibles, aucune persistance.
- Statut à la fin : Terminé statiquement ; migration additive, RLS, privilèges et RPC écrits. Exécution PostgreSQL locale restant obligatoire avant déploiement.
- Phase 1 : 5 tâches sur 15 terminées.
- Tâches P0 restantes : 11.

### Objectif de la session

Créer exclusivement le schéma d'invitation, ses protections et la consommation atomique, sans route API, frontend, suppression legacy ni accès distant.

### Périmètre prévu

- fichiers concernés : nouvelle migration SQL, test statique, roadmap et journal ;
- fichiers exclus : `app/`, `/join`, callback, `invite-client`, `assign-coach` et anciennes migrations ;
- services externes : aucun ;
- application distante : aucune.

### Travail effectué

1. Analyse du schéma reconstructible de `profiles` et `coach_clients`, des RLS et fonctions `SECURITY DEFINER` existantes.
2. Vérification des outils locaux : `psql` disponible, mais Supabase CLI et Docker absents.
3. Création additive de `public.coach_invitations` avec champs d'audit et livraison.
4. Ajout de contraintes sur hash, email, statuts, type, expiration, metadata et cohérence du cycle de vie.
5. Ajout d'index ciblés sans dupliquer l'index unique de `token_hash`.
6. Ajout d'une prévention concurrente des doublons pending non expirés par verrou consultatif transactionnel.
7. Ajout d'un trigger dédié pour `updated_at`.
8. Ajout d'un trigger de défense empêchant toute transition directe autre que `pending → revoked` par le coach propriétaire.
9. Activation et forçage RLS ; policies coach exact pour SELECT, INSERT et révocation.
10. Remplacement des grants larges par des grants par colonne excluant `token_hash` de la lecture.
11. Création de `consume_coach_invitation(bytea)` en `SECURITY DEFINER`, `search_path` fixe et identité issue de `auth.uid()`.
12. Ajout du verrouillage de l'invitation et du profil client, des contrôles email/coach/abonnement/relation, puis des trois mutations atomiques.
13. Révocation de l'exécution publique et anonyme ; grant au seul rôle `authenticated`.
14. Ajout de neuf tests statiques actifs sur les propriétés de sécurité du SQL.
15. Exécution des tests applicatifs, TypeScript, ESLint et contrôle de format.

### Fichiers créés

- `supabase/migrations/20260711190500_add_coach_invitations.sql`
  - table, contraintes, index, triggers, RLS, grants et RPC atomique.
- `tests/unit/coach-invitation-migration-static.test.ts`
  - 9 validations statiques actives du contrat SQL.

### Fichiers modifiés

- `ROADMAP_CODEX.md`
  - migration cochée ; phase, progression, P0 restants et tests mis à jour.
- `SESSION_LOG_CODEX.md`
  - ajout de la présente entrée.

### Fichiers explicitement inchangés

- `app/api/assign-coach/route.ts`
- `app/api/invite-client/route.ts`
- `app/join/JoinPageContent.tsx`
- `app/auth/callback/route.ts`
- tous les autres fichiers frontend et routes
- toutes les anciennes migrations

### Modèle SQL créé

- `token_hash bytea UNIQUE`, exactement 32 octets ; aucun token brut.
- Statuts persistés : `pending`, `consumed`, `revoked`.
- Cycle cohérent imposé par CHECK sur les champs consumed/revoked.
- Email lowercase/trim, longueur, contrôle de caractères et forme minimale imposés en base ; NFKC reste la responsabilité de la future route.
- Expiration strictement postérieure à la création.
- Metadata obligatoirement objet JSON.
- Livraison séparée du cycle métier : pending/sent/failed/skipped.
- FKs coach, consumed_by et revoked_by conformes au contrat.

### RLS et privilèges

- RLS `ENABLE` et `FORCE`.
- Coach exact uniquement, jamais super_admin implicite.
- Lecture et insertion limitées aux lignes du coach authentifié.
- Révocation directe limitée au propriétaire et à l'état pending.
- Trigger invoker empêchant la modification des champs immuables ou le passage direct à consumed.
- Aucun DELETE accordé.
- `token_hash` absent du grant SELECT par colonne.
- Aucun droit table accordé à anon.

### RPC et atomicité

- Signature unique : `consume_coach_invitation(p_token_hash bytea)`.
- Aucun paramètre client, coach, abonnement ou auto-assign.
- Client : `auth.uid()` ; coach : ligne d'invitation verrouillée.
- Email : `auth.users.email` confirmé et normalisé lowercase/trim.
- Verrou `FOR UPDATE` sur invitation et profil client.
- Coach vérifié avec rôle exact `coach`.
- Refus des rôles coach/admin, comptes invited, lifetime, beta actif ou Stripe actif.
- Refus d'une relation existante.
- UPDATE profil, INSERT relation et UPDATE invitation dans la même transaction de fonction.
- Toute exception SQL annule l'appel complet ; aucun catch ne transforme une erreur après mutation en succès.
- Une seconde consommation observe l'état terminal après le verrou et renvoie `INVITATION_ALREADY_USED`.

### Dette de schéma réparée additivement

La route historique écrit `coach_clients.status`, mais cette colonne n'était pas reconstruite par les migrations versionnées. La nouvelle migration ajoute `status text NOT NULL DEFAULT 'active'` avec `IF NOT EXISTS`, sans modifier les lignes existantes ni imposer une nouvelle contrainte de valeurs.

### Validation exécutée

| Commande | Résultat | Détails |
|---|---|---|
| `npm test -- tests/unit/coach-invitation-contract.test.ts` | Réussi | 14 actifs, 79 `todo`. |
| `npm test -- tests/unit/coach-invitation-migration-static.test.ts` | Réussi | 9 tests statiques SQL réussis. |
| `npm test` | Réussi | 10 fichiers, 142 actifs réussis, 79 `todo`. |
| `npx tsc --noEmit` | Réussi | Aucune erreur TypeScript. |
| `npx eslint tests/unit/coach-invitation-migration-static.test.ts` | Réussi | Aucune erreur ni avertissement. |
| `git diff --check` | Réussi avant suivi final | Aucun défaut de format. |
| `supabase db reset` | Non exécuté | Supabase CLI absent. |
| `supabase test db` | Non exécuté | Supabase CLI absent. |
| Docker/Supabase local | Non disponible | Docker absent ; aucune base locale démarrable dans cet environnement. |
| Base distante | Non appelée | Interdiction respectée. |

### Validation SQL réellement obtenue

- Validation statique par 9 tests sur table, hash, cycle, doublons, RLS, grants, signature RPC, identité et verrous.
- Relecture des migrations antérieures pour compatibilité des colonnes utilisées.
- Aucune exécution ni analyse sémantique PostgreSQL complète n'a été possible sans base locale.
- La présence de `psql` seul ne suffit pas sans serveur PostgreSQL cible local autorisé.

### Tests contractuels restant `todo`

Les scénarios d'intégration table/RLS/RPC restent `todo` tant que la migration n'est pas appliquée localement : contraintes réelles, matrices inter-coachs, consommation anonyme, expiration, email différent, succès, seconde consommation, concurrence et rollback injecté.

### Types Supabase

- Aucun fichier de types générés Supabase versionné n'a été identifié.
- Aucun type n'a été édité manuellement.
- La génération devra intervenir depuis Supabase local après `db reset`, avant les routes API.

### Risques et limites

- La migration n'a pas encore été parsée ni exécutée par PostgreSQL.
- Atomicité et concurrence sont garanties par la structure PL/pgSQL mais pas encore prouvées empiriquement.
- La normalisation Unicode NFKC doit être faite par la future route de création ; PostgreSQL impose lowercase/trim et forme minimale.
- La prévention des doublons utilise un verrou consultatif hashé ; les collisions sont sans danger fonctionnel mais peuvent sérialiser exceptionnellement deux clés différentes.
- Les erreurs inattendues de relation ou contrainte remontent comme erreurs PostgreSQL et devront être mappées par la future route vers `INVITATION_CONSUMPTION_FAILED`.
- La vulnérabilité `assign-coach` reste accessible : cette session n'a ni basculé ni modifié le flux historique.

### Travail non terminé

- Migration non appliquée localement ou à distance.
- Tests d'intégration PostgreSQL/RLS/concurrence non exécutés.
- Routes de création, validation, consommation et révocation non créées.
- Frontend et flux legacy inchangés.
- Types Supabase non générés.
- Aucun commit créé.

### Checklist de fin de session

- [x] Migration additive créée sans modification historique.
- [x] Table, contraintes, index et doublons conformes au contrat.
- [x] RLS, grants par colonne et révocation contrôlée définis.
- [x] RPC atomique sans paramètres d'identité.
- [x] `SECURITY DEFINER`, `search_path`, revoke/grant sécurisés.
- [x] Aucun token brut ni secret SQL.
- [x] Aucun frontend ni route modifié.
- [x] Tests existants, TypeScript et lint ciblé réussis.
- [x] Impossibilité des tests locaux précisément documentée.
- [x] Roadmap et journal mis à jour.
- [x] Prochaine étape unique définie.

### Résumé de reprise

La migration `20260711190500_add_coach_invitations.sql` définit le schéma complet et la RPC atomique. Le hash SHA-256 est un `bytea` de 32 octets jamais lisible via l'API. RLS est forcée, les grants sont limités par colonne et seule la révocation directe pending→revoked est permise au coach propriétaire. La RPC dérive le client de `auth.uid()`, le coach de l'invitation, verrouille invitation et profil, puis modifie profil, relation et invitation dans une transaction unique. Neuf tests statiques SQL passent et la suite atteint 142 tests actifs. Supabase CLI et Docker sont absents : aucun test DB réel n'a encore prouvé parsing, RLS, rollback ou concurrence. Aucun frontend, route ou flux historique n'a changé.

### Prochaine étape unique

**Action :**

Créer les routes API de création, validation, consommation et révocation des invitations coach, sans modifier encore le frontend historique.

**Pourquoi maintenant :**

Le schéma et la RPC sont prêts statiquement. Les routes peuvent maintenant appliquer les schémas Zod, générer/hash les jetons, dériver les identités serveur, mapper les erreurs et préparer la bascule sans toucher `/join`.

**Prérequis impératif avant activation ou déploiement :**

Exécuter la migration sur Supabase local avec `db reset`, puis activer les tests PostgreSQL/RLS/concurrence. Si une future session dispose de Docker/CLI, cette validation passe avant toute utilisation de la RPC par une route activée.

**Fichiers à ouvrir en premier :**

- `docs/COACH_INVITATION_CONTRACT.md`
- `supabase/migrations/20260711190500_add_coach_invitations.sql`
- `tests/unit/coach-invitation-contract.test.ts`
- `lib/supabase/server.ts`
- `lib/email.ts`
- `lib/rate-limit.ts`

**Définition de terminé de la prochaine étape :**

- quatre routes minces avec validation Zod stricte ;
- aucune identité client/coach prise dans le body ;
- création avec token 256 bits et stockage hashé ;
- validation publique non énumérable ;
- consommation via RPC uniquement ;
- révocation propriétaire contrôlée ;
- SMTP et Supabase intégralement mockés en tests unitaires ;
- aucune modification de `/join`, callback ou suppression legacy.

**Ne pas faire pendant la prochaine session :**

- ne pas modifier encore le frontend ;
- ne pas désactiver `assign-coach` ;
- ne pas appliquer de migration distante ;
- ne pas appeler SMTP ou Supabase production.

### Temps

- Temps de session estimé : 90 à 120 minutes.
- Temps réellement consacré, si fourni par l'utilisateur : Non fourni.
- Estimation restante pour validation DB locale : 0,5 à 1 jour dès disponibilité de Docker/CLI.
- Estimation restante pour les quatre routes et tests unitaires : 2 à 3 jours concentrés.

---

## Entrée — 2026-07-11 — Validation PostgreSQL locale de `coach_invitations`

### Travail effectué

- Inventaire confirmé : PostgreSQL 16.14 et `psql` disponibles ; Supabase CLI et Docker absents.
- Démarrage d'un cluster PostgreSQL temporaire isolé dans `/tmp/moovx-pgdata`, uniquement sur `127.0.0.1:55432`.
- Tentative de reconstruction de toutes les migrations historiques dans `moovx_history`.
- Création d'un bootstrap local minimal reproduisant les rôles `anon`, `authenticated`, `service_role`, `auth.uid()`, `auth.users`, `profiles`, `coach_clients`, leurs RLS et le garde des colonnes d'abonnement.
- Application réelle de `20260711190500_add_coach_invitations.sql` sur une base propre dédiée.
- Ajout d'une suite SQL déterministe couvrant schéma, contraintes, RLS, privilèges, RPC, refus métier et rollback.
- Ajout d'un test à deux connexions PostgreSQL réellement concurrentes.
- Activation de 30 scénarios contractuels désormais couverts par les suites PostgreSQL ; 49 `todo` restent réservés aux routes, au frontend ou aux injections de panne non encore exercées.

### Défaut découvert et correction

L'exécution réelle a montré que `prevent_duplicate_pending_coach_invitation()` appliquait son contrôle à toute nouvelle ligne, y compris `revoked` et `consumed`. Une invitation pending existante empêchait donc l'insertion d'un historique terminal pour la même paire coach/email. La nouvelle migration, non déployée, a été corrigée avec un retour immédiat lorsque `NEW.status <> 'pending'`, puis la base a été reconstruite et toute la suite rejouée.

### Validation PostgreSQL réelle obtenue

- Table, colonnes, valeurs par défaut, clés étrangères, contraintes `CHECK`, unicité du hash, index et triggers vérifiés.
- RLS activée et forcée ; grants/revokes, propriétaire, signature, `search_path` et privilèges RPC vérifiés.
- Matrices coach A/coach B/utilisateur standard/anonyme exercées sans `service_role` pour les autorisations utilisateur.
- Consommation valide vérifiée : identité issue de `auth.uid()`, coach issu de l'invitation, profil `active/invited`, relation active et invitation consommée.
- Refus vérifiés : anonyme, token absent ou mal formé, expiration, révocation, seconde consommation, email différent/non vérifié, coach supprimé ou non-coach, profil invité/payant/lifetime.
- Rollback intégral démontré en provoquant localement l'échec de la dernière mutation : aucune modification partielle du profil, de la relation ou de l'invitation.
- Concurrence réelle démontrée : une réussite, un seul `INVITATION_ALREADY_USED`, une relation et une transition finale, sans deadlock.

### Blocage historique distinct

La reconstruction complète du dépôt depuis zéro échoue avant la nouvelle migration : `supabase/migrations/20260318_messages.sql:9` référence `public.profiles` alors qu'aucune migration antérieure versionnée ne crée cette table. Aucune ancienne migration n'a été modifiée. La migration ciblée est réellement validée sur PostgreSQL, mais le critère global « toutes les migrations depuis une base vide » reste donc incomplet.

### Tests et commandes exécutés

- `initdb`, `pg_ctl`, `createdb`, `dropdb` et `psql` sur le cluster local isolé.
- Application séquentielle de toutes les migrations dans `moovx_history` : échec historique exact consigné ci-dessus.
- `psql -v ON_ERROR_STOP=1 -f tests/integration/coach-invitations-bootstrap.sql` : réussi.
- `psql -v ON_ERROR_STOP=1 -f supabase/migrations/20260711190500_add_coach_invitations.sql` : réussi.
- `psql -v ON_ERROR_STOP=1 -f tests/integration/coach-invitations-rpc.sql` : 28 assertions réussies.
- `bash tests/integration/coach-invitations-concurrency.sh` : réussi.
- Tests unitaires ciblés : 23 réussis, alors 79 `todo` avant activation progressive.
- `npm test` avant mise à jour contractuelle : 142 réussis, 79 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint ciblé : réussi.
- `bash -n tests/integration/coach-invitations-concurrency.sh` : réussi.
- Build non exécuté : aucun code applicatif, route ou frontend n'a été modifié.

### Tâches cochées

Aucune nouvelle tâche de Phase 1 : la migration reste créée et validée, mais la reproductibilité complète de l'historique des migrations constitue une dette séparée.

### Risques ou dette restante

- La baseline initiale du schéma Supabase (`profiles` notamment) n'est pas entièrement versionnée ; un `db reset` complet reste impossible.
- Le bootstrap de test est fidèle au sous-ensemble nécessaire mais ne remplace pas une reconstruction Supabase intégrale.
- Les routes API, `/join`, les types Supabase générés et le flux legacy restent inchangés.
- Les deux injections de panne intermédiaires restantes (profil et upsert relation) demeurent contractuelles `todo` ; le rollback sur la mutation finale prouve néanmoins la transaction globale observée.

### Mesures avant/après

- Intégration PostgreSQL : 0 → 28 assertions SQL + 1 scénario concurrent.
- Scénarios contractuels `todo` : 79 → 49.
- Tests unitaires actifs : 142 (inchangé).
- Défauts réels corrigés dans la nouvelle migration : 1.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer et versionner la baseline de schéma Supabase manquante qui fournit `public.profiles` avant `20260318_messages.sql`, puis reconstruire toutes les migrations depuis une base vide et rejouer les suites d'invitation. Ne pas commencer les routes API avant ce reset complet vert.

---

## Entrée — 2026-07-11 — Baseline Supabase structurelle

### Travail effectué

- Audit de toutes les migrations, usages applicatifs, documents et historique Git liés à `profiles`, `auth.users`, `coach_clients`, rôles, abonnements et onboarding.
- Confirmation qu'aucune migration présente ou supprimée dans Git ne crée `profiles` et qu'aucun dump/types Supabase canonique n'est versionné.
- Création de `20260317000000_initial_schema_baseline.sql`, antérieure à la première migration incrémentale et strictement additive.
- Versionnement des objets initiaux réellement supposés avant leur création tardive : `profiles`, relations coach/client, photos, nutrition, exercices, séances, badges et check-ins.
- Consolidation compatible des deux schémas historiques divergents de `scheduled_sessions`.
- Correction syntaxique explicite de `20260521212741_fix_coach_clients_policy_with_security_definer.sql` (`AS $` vers `AS $$`) sans changement sémantique.
- Ajout d'un bootstrap PostgreSQL des seuls objets plateforme Supabase, d'un runner local protégé contre les URL distantes, de 9 assertions SQL et de 6 tests statiques.
- Documentation complète dans `docs/SUPABASE_BASELINE_STRATEGY.md` : chronologie, dépendances, stratégies, déploiement, rollback et risques.

### Chronologie des ruptures révélées

1. `20260318_messages.sql` : `profiles` absent.
2. `20260415_backfill_badge_id.sql` : `badge_id` et `celebrated` utilisés trop tôt.
3. `20260419_coach_rls_read.sql` : `daily_checkins` utilisé avant sa création.
4. `20260518180000_add_missing_parent_exercises.sql` : `ON CONFLICT(name)` sans unicité versionnée.
5. `20260521205152_drop_insecure_meal_rls_policies.sql` : `meal_logs` absent.
6. `20260521212741_fix_coach_clients_policy_with_security_definer.sql` : délimiteur SQL invalide.
7. `20260531043341_complete_variant_group.sql` : exige le seed historique non versionné de 178 exercices.

### Stratégie choisie

Une migration baseline historique additive, utilisant `CREATE TABLE IF NOT EXISTS`, est la seule source de vérité pour les nouvelles installations. Elle ne contient ni données, ni `DROP`, ni renommage, ni backfill. Pour une base existante, elle ne devra pas être poussée automatiquement : après comparaison en lecture seule et sauvegarde, sa version sera marquée appliquée via le mécanisme Supabase officiel si le schéma est compatible. Aucun état distant n'a été consulté ou muté pendant cette session.

### Résultat PostgreSQL réel

- Le reset part désormais d'une base vide et franchit toutes les migrations du 17 mars au 30 mai inclus.
- Les 9 assertions structurelles passent et la baseline peut être réappliquée sans erreur ni mutation de données.
- Le reset reste bloqué dans `20260531043341_complete_variant_group.sql` : le dépôt ne contient pas les 178 exercices et UUID canoniques exigés par son assertion. Seules les 25 lignes de la migration du 18 mai existent sur une base neuve.
- L'assertion n'a pas été affaiblie et aucun catalogue fictif n'a été inventé. La tâche reste donc partiellement terminée.
- Les 28 assertions PostgreSQL d'invitation et le test à deux sessions concurrentes restent verts après les changements.

### Tests exécutés

- Plusieurs reconstructions réelles avec `tests/integration/reset-migrations.sh` sur PostgreSQL 16.14 local, base jetable et `ON_ERROR_STOP=1`.
- `tests/integration/supabase-baseline-assertions.sql` : 9 assertions réussies.
- Réapplication de la baseline sur le schéma existant : réussie, uniquement des notices `already exists`.
- `tests/integration/coach-invitations-rpc.sql` : 28 assertions réussies.
- `tests/integration/coach-invitations-concurrency.sh` : réussi.

### Tâches cochées

Aucune : « Rendre le reset Supabase local déterministe » appartient à la Phase 2 et reste incomplète tant que le seed canonique n'est pas versionné et que toutes les migrations ne passent pas.

### Risques ou dette restante

- Catalogue initial `exercises_db` de 178 lignes absent du dépôt.
- État réel et historique de migration des environnements distants inconnus.
- Déploiement rétroactif de la baseline interdit sans audit de schéma et procédure `migration repair` contrôlée.
- La baseline reproduit le schéma démontré, pas les données de catalogue manquantes.
- Aucun frontend, route API ou comportement applicatif n'a été modifié.

### Mesures avant/après

- Première migration atteinte : `20260318_messages.sql` → `20260531043341_complete_variant_group.sql`.
- Assertions SQL d'intégration : 28 → 37, plus 1 scénario concurrent.
- Tests unitaires actifs attendus : 142 → 148.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Obtenir une source autorisée et sans données utilisateur du catalogue canonique `exercises_db` de 178 lignes avec ses UUID, la versionner comme seed historique, puis reprendre le reset complet depuis zéro. Ne pas commencer les routes API d'invitation avant un reset intégral vert.

---

## Entrée — 2026-07-12 — Reset Supabase intégral reproductible

### Travail effectué

- Reprise stricte de la prochaine action enregistrée depuis le commit `a1525c2`, sans commencer les routes API ni le parcours `/join`.
- Export REST en lecture seule de la table catalogue `exercises_db` : 176 lignes actuelles, 176 UUID uniques, aucune donnée utilisateur.
- Reconstruction du catalogue historique de 178 exercices avec les deux doublons et UUID explicitement documentés par `20260701200000_dedup_exercises_db.sql`.
- Versionnement de `20260317010000_seed_exercises_catalog.sql`, protégé par un garde qui ne touche jamais un catalogue existant non vide.
- Conservation des équipements historiques depuis `equipment_legacy` et des 46 groupes de variantes canoniques afin de satisfaire les migrations de normalisation sans affaiblir leurs assertions.
- Complément de la baseline pour les objets réels créés historiquement hors Git : `beta_campaigns`, `commissions`, `profiles.coach_speciality` et `profiles.coach_experience_years`.
- Contrat `commissions` obtenu depuis les seules métadonnées OpenAPI Supabase, sans lire de ligne financière.
- Alignement du bootstrap local sur les privilèges de tables/séquences accordés par défaut aux rôles API Supabase; accès au schéma d'assertions accordé au rôle `authenticated`.
- Mise à jour de la stratégie de baseline et du tableau de bord de tests.

### Tâches cochées

Aucune nouvelle case de Phase 1. La dette de reset déterministe qui bloquait la validation de la migration d'invitation est résolue; la prochaine tâche P0 reste la migration de `/join` vers l'invitation vérifiée.

### Décisions prises

- Le seed ne contient que des données de catalogue nécessaires à l'historique : UUID, nom, groupe musculaire, équipement legacy et groupe de variante.
- Les deux lignes absentes de l'état courant ne sont pas inventées : identité issue de la migration de déduplication et champs métier repris de leur paire canonique documentée.
- La baseline rétroactive demeure additive. Son déploiement distant reste interdit sans audit de schéma, sauvegarde et marquage contrôlé de la version.
- Les différences de privilèges du PostgreSQL brut sont corrigées dans le bootstrap de plateforme, pas en affaiblissant les RLS métier.

### Problèmes rencontrés

- Le premier export contient 176 lignes et non 178, expliqué par les deux suppressions case-only de juillet.
- Les premiers seeds incomplets ont révélé successivement les dépendances historiques `equipment` puis `variant_group`.
- Le reset a ensuite révélé trois objets hors historique : `beta_campaigns`, deux colonnes coach et `commissions`.
- Le harnais brut ne reproduisait pas les privilèges Supabase et n'exposait pas `test.assert` à `authenticated`; les deux écarts locaux ont été corrigés explicitement.

### Risques ou dette restante

- L'historique et la compatibilité générale du schéma distant restent à auditer avant toute adoption de la baseline rétroactive.
- Le seed restaure le minimum historique requis, pas tous les enrichissements descriptifs actuels; ceux-ci restent appliqués par les migrations suivantes.
- Les routes API, `/join`, les types Supabase générés et le flux legacy restent inchangés.
- Les 49 scénarios contractuels `todo` restent ouverts conformément à leur activation progressive.

### Tests exécutés

- Reconstruction depuis une base PostgreSQL locale vide avec toutes les migrations jusqu'à `20260711190500_add_coach_invitations.sql` : réussie.
- Normalisation équipement : 178/178 valides; variantes : 178/178, 0 NULL et 46 groupes distincts.
- `tests/integration/supabase-baseline-assertions.sql` : 9 assertions réussies.
- `tests/integration/coach-invitations-rpc.sql` : 28 assertions réussies.
- `tests/integration/coach-invitations-concurrency.sh` : réussi.
- `npm test` : 151 réussis, 49 `todo`.
- `npx tsc --noEmit` : réussi.
- `git diff --check` : réussi avant documentation finale.

### Mesures avant/après

- Première migration atteinte depuis zéro : `20260531043341_complete_variant_group.sql` → dernière migration versionnée.
- Catalogue historique versionné : 0 → 178 lignes/UUID uniques.
- Tests unitaires actifs : 148 → 151.
- Assertions d'intégration : 37 + 1 scénario concurrent, toutes vertes depuis une base vide.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Migrer le parcours `/join` vers l'invitation vérifiée en commençant par lire le flux et ses tests, conformément à la Phase 1. Ne commencer aucune autre tâche P0 ou de Phase 2 en parallèle.

---

## Entrée — 2026-07-12 — Bascule `/join` vers l'invitation vérifiée

### Travail effectué

- Remplacement de l'autorité `?coach=<UUID>` par un jeton opaque vérifié, avec `token` comme paramètre principal et `invitation` comme alias compatible.
- Ajout de routes serveur minces de validation et de consommation, d'un contrat Zod strict et du hash SHA-256 côté serveur.
- Liaison de la consommation à `auth.getUser()` puis à la RPC transactionnelle `consume_coach_invitation`, sans accepter d'identité coach ou client fournie par le navigateur.
- Conservation temporaire du jeton dans `sessionStorage`, retrait immédiat de l'URL et reprise de `/join` après email/password ou OAuth via un paramètre `next` interne contrôlé.
- Refus explicite des anciens liens UUID sans appel à `/api/assign-coach`.
- Ajout des tests de routes et de bascule statique, des textes français, anglais et allemands, et documentation du stockage temporaire et du rollback.

### Tâches cochées

- Phase 1 : « Migrer le parcours `/join` vers l'invitation vérifiée ».

### Décisions prises

- Le jeton brut ne quitte le navigateur que dans le corps d'une requête POST et n'est jamais ajouté aux métadonnées Auth ou aux journaux.
- La validation publique utilise une projection minimale et une réponse générique pour ne pas exposer le statut interne de l'invitation.
- Une erreur terminale supprime le jeton de session; une erreur temporaire le conserve pour permettre la reprise dans le même onglet.
- Le flux distinct `autoAssign` du coach par défaut reste inchangé.

### Problèmes rencontrés

- Le build de production ne peut pas terminer dans l'environnement réseau restreint : Next.js ne peut pas télécharger Anton, Barlow Condensed, Bebas Neue, DM Sans et Outfit depuis Google Fonts.

### Risques ou dette restante

- Les producteurs historiques de liens `?coach=<UUID>` dans l'onboarding et le dashboard coach restent à remplacer par un flux serveur de création et d'envoi d'invitations vérifiées; leurs liens sont maintenant refusés.
- Aucun E2E navigateur complet n'est encore intégré. La reprise Auth est protégée par les tests de contrat et de source, les tests unitaires et les tests RPC PostgreSQL.
- Le build doit être rejoué dans un environnement autorisant le téléchargement des polices ou après leur auto-hébergement.
- Aucun fichier Stripe, coach dashboard ou envoi SMTP n'a été modifié dans cette tranche.

### Tests exécutés

- Tests ciblés invitations : 61 réussis, 22 `todo`.
- `npm test` : 182 réussis, 22 `todo`.
- `npx tsc --noEmit` : réussi.
- `npm run i18n:check` : 2 188 clés alignées dans les trois locales.
- ESLint ciblé : aucune erreur; avertissements `@next/next/no-img-element` préexistants sur les images des écrans concernés.
- Reset PostgreSQL depuis une base vide : toutes les migrations réussies.
- `tests/integration/supabase-baseline-assertions.sql` : 9 assertions réussies.
- `tests/integration/coach-invitations-rpc.sql` : 28 assertions réussies.
- `tests/integration/coach-invitations-concurrency.sh` : réussi.
- `npm run build` : bloqué uniquement par le téléchargement réseau des polices Google.

### Mesures avant/après

- Tests unitaires actifs : 151 → 182.
- Scénarios contractuels `todo` : 49 → 22.
- Autorité navigateur sur `/join` : `coachId` accepté → aucun identifiant d'autorité accepté.

### Note de diagnostic — redirection onboarding

- L'incident signalé sur un compte existant n'a pas été reproduit en navigation privée.
- La comparaison avec son parent confirme que le commit `7174e68` n'a pas introduit la décision d'onboarding; celle-ci reste dans `useClientDashboard`.
- Une tâche P1 documente désormais la distinction future entre erreur de lecture du profil et absence réelle. La prochaine tâche P0 reste prioritaire.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer le flux coach de création et d'envoi des invitations vérifiées, en remplaçant les producteurs historiques de liens UUID et l'ancien endpoint SMTP insuffisamment autorisé. Ne commencer aucune autre tâche P0 ou de Phase 2 en parallèle.

---

## Entrée — 2026-07-12 — Flux coach d'invitations vérifiées

### Travail effectué

- Ajout de `POST /api/coach/invitations` avec identité serveur, rôle coach, schéma strict, normalisation email, limites persistantes coach/destinataire et défense locale coach/IP.
- Génération d'un jeton de 256 bits, persistance exclusive du SHA-256 et construction serveur de `/join?token=<token>`.
- Ajout d'un template email échappé et retrait des adresses et erreurs SMTP brutes des journaux génériques.
- Ajout de `POST /api/coach/invitations/revoke`, borné au propriétaire et aux invitations `pending`.
- Bascule des formulaires email du dashboard coach vers le nouvel endpoint et ajout de la révocation de l'invitation créée.
- Suppression de tous les producteurs et boutons de copie `/join?coach=<UUID>` dans le dashboard, son hook et l'onboarding coach.
- Transformation de `/api/invite-client` en tombstone `410 LEGACY_INVITATION_DISABLED` sans envoi SMTP.
- Conservation des ajouts documentaires P1 sur la robustesse du chargement de profil; aucune tâche de Phase 2 n'a été commencée.

### Tâches cochées

- Phase 1 : « Restreindre et limiter les invitations SMTP ».

### Décisions prises

- Une invitation coach exige toujours un email destinataire; aucun lien générique copiable n'est compatible avec le contrat strict.
- Le navigateur ne reçoit ni jeton ni hash et ne fournit ni coach, nom du coach, URL, expiration ou statut.
- L'échec SMTP conserve l'invitation pour audit et renvoi futur; il ne supprime jamais la ligne.
- La révocation d'une invitation appartenant à un autre coach répond comme une ressource introuvable afin de ne pas confirmer son existence.

### Problèmes rencontrés

- Le lint global reste rouge sur la dette historique du dépôt : 941 erreurs et 1 871 avertissements, principalement `no-explicit-any`, règles React et fichiers générés/temporaires. Le lint limité aux nouvelles routes, services et tests passe.

### Risques ou dette restante

- L'interface permet de révoquer l'invitation créée pendant la session courante; une liste complète et un renvoi contrôlé restent à réaliser ultérieurement.
- La limite IP utilise le helper mémoire existant comme défense complémentaire; les limites coach et destinataire sont calculées depuis les invitations persistées.
- L'ancien système `assign-coach` reste présent pour le coach par défaut et doit être nettoyé séparément après vérification de ses usages morts.
- Les deux injections de panne transactionnelle PostgreSQL et la révocation administrative auditée restent contractuellement `todo`.

### Tests exécutés

- Tests ciblés création/révocation/producteurs : 14 réussis.
- Tests ciblés invitation complets : 59 réussis avant activation des scénarios contractuels livrés.
- `npm test` : 196 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint nouvelles routes/services/tests : réussi.
- `npm run lint` : exécuté, échec sur la dette globale préexistante (941 erreurs, 1 871 avertissements).
- Reset PostgreSQL depuis une base vide : toutes les migrations réussies.
- Assertions baseline : 9 réussies.
- Tests RPC invitation : 28 réussis.
- Test de concurrence de consommation : réussi.
- `git diff --check` : réussi après documentation finale.

### Mesures avant/après

- Tests unitaires actifs : 182 → 196.
- Scénarios contractuels `todo` : 22 → 3.
- Producteurs applicatifs `/join?coach=` : 3 → 0.
- Endpoints SMTP acceptant un lien navigateur : 1 → 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Nettoyer définitivement l'ancien système `assign-coach` et supprimer les chemins morts lorsqu'ils ne sont plus utilisés. Ne commencer aucune autre tâche P0 ou de Phase 2 en parallèle.

---

## Entrée — 2026-07-12 — Suppression de l'ancien système `assign-coach`

### Travail effectué

- Inventaire exhaustif des usages de `assign-coach`, `/api/assign-coach`, `autoAssign`, `coachId` et des mécanismes historiques d'attribution.
- Distinction confirmée entre l'ancien mode invitation arbitraire et l'attribution encore active du coach par défaut via `get_default_coach_id`, `coach_clients` et la policy RLS `coach_clients_self_insert_safe`.
- Ajout préalable de tests de coupure; ils ont échoué sur la route et l'appel d'inscription encore présents, puis réussi après suppression.
- Suppression de `POST /api/assign-coach`, de son appel depuis l'inscription client et de ses anciens tests de caractérisation vulnérable.
- Conservation intacte du parcours vérifié `/join?token=<token>` et du mécanisme RLS du coach par défaut, qui ne modifie aucun abonnement.
- Mise à jour du contrat pour documenter la suppression effective de l'adaptateur.

### Tâches cochées

Aucune nouvelle tâche officielle : la tranche clôt une dette de transition enregistrée comme prochaine action, sans modifier le compteur de Phase 1.

### Décisions prises

- Aucun endpoint de remplacement n'est créé : l'attribution du coach par défaut existe déjà au premier chargement authentifié du dashboard.
- L'inscription ne transmet plus `clientId`, `coachId` ou `autoAssign`; l'identité reste imposée par `auth.uid()` dans la policy RLS.
- Les occurrences `coachId` propres aux invitations vérifiées et aux autres domaines restent légitimes lorsqu'elles sont dérivées côté serveur ou sans rapport avec l'ancien parcours.

### Problèmes rencontrés

- Après suppression de la route, `npx tsc --noEmit` a d'abord lu une référence périmée dans `.next/types`; `npx next typegen` a régénéré les types, puis TypeScript a réussi.
- ESLint ciblé sur `RegisterClientContent.tsx` reste rouge sur trois erreurs préexistantes hors des lignes modifiées (`set-state-in-effect` et deux liens internes en `<a>`) ainsi que quatre avertissements préexistants. Les nouveaux tests passent ESLint.

### Risques ou dette restante

- L'attribution du coach par défaut est déclenchée au chargement du dashboard et non pendant l'inscription; elle dépend donc d'une première session authentifiée et des migrations RPC/RLS déjà validées.
- Aucun E2E navigateur complet ne couvre encore inscription, premier dashboard et création de la relation par défaut.
- Les mentions historiques de `assign-coach` dans le journal et les décisions du contrat sont conservées pour la traçabilité; les occurrences restantes dans les tests sont des interdictions explicites, pas des producteurs.

### Tests exécutés

- Test de caractérisation avant suppression : 7 réussis, 2 échecs attendus prouvant la route et l'appel encore actifs.
- Tests ciblés après suppression : 48 réussis, 3 `todo`.
- `npm test` : 183 réussis, 3 `todo`.
- `npx next typegen` : réussi.
- `npx tsc --noEmit` : réussi après régénération des types Next.
- ESLint des deux tests modifiés/créés : réussi.
- ESLint de `RegisterClientContent.tsx` : échec sur 3 erreurs et 4 avertissements préexistants, sans nouvelle alerte sur la suppression.
- Recherche finale applicative : aucun producteur ni appel `/api/assign-coach`; `autoAssign` ne subsiste que dans les assertions qui l'interdisent.
- `git diff --check` : réussi.

### Mesures avant/après

- Routes applicatives `assign-coach` : 1 → 0.
- Appels applicatifs `/api/assign-coach` : 1 → 0.
- Tests actifs : 196 → 183, soit suppression des 16 caractérisations du code vulnérable et ajout de 3 protections de coupure.
- Producteurs `/join?coach=` : reste à 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Tester les checkouts plateforme et coach avec des identités étrangères, prochaine tâche P0 non terminée de la Phase 1, sans commencer leur correction dans la même tranche.

---

## Entrée — 2026-07-12 — Caractérisation des autorisations checkout

### Travail effectué

- Inventaire des deux producteurs de sessions Stripe Checkout : `POST /api/stripe/checkout` pour les offres plateforme et `POST /api/stripe/coach-checkout` pour l'abonnement à un coach.
- Traçage des identités provenant du navigateur (`clientId`, `coachId`, `planId`), de l'identité de session disponible et des lectures service-role.
- Ajout d'une matrice de quinze tests couvrant appel anonyme, client légitime, client étranger, coach propriétaire, coach étranger, rôles incorrects et identifiants étrangers injectés.
- Simulation intégrale de Stripe, Supabase service-role, Supabase Auth et cookies; aucun réseau ni service externe n'est accessible aux tests.
- Conservation stricte des routes de production, vérifiée par un diff Git ciblé vide.

### Tâches cochées

- Phase 1 : « Tester checkout plateforme et coach avec identités étrangères ».

### Décisions prises

- Les tests décrivent le comportement réel vulnérable comme un succès lorsque la route crée aujourd'hui une session pour une identité étrangère; ils ne formulent pas encore le comportement sécurisé attendu.
- Les offres plateforme et coach restent testées séparément car leurs modèles d'authentification divergent : aucune authentification pour la première, authentification sans autorisation métier pour la seconde.
- Aucune correction, validation Zod, vérification de rôle ou relation coach/client n'est introduite dans cette tranche.

### Problèmes rencontrés

Aucun. Les variables de Price ID sont initialisées dans le mock avant l'import de la route afin de respecter leur lecture statique au chargement du module.

### Risques ou dette restante

- `POST /api/stripe/checkout` n'appelle pas `auth.getUser()` : une requête anonyme peut créer un checkout et une ligne `payments` pour tout `clientId` UUID fourni.
- Cette route accepte également `coachId` et `planId`, y compris `coach_monthly`, sans vérifier l'identité ou le rôle de l'appelant ni une relation coach/client.
- `POST /api/stripe/coach-checkout` exige une session, mais ne vérifie ni le rôle, ni `clientId === user.id`, ni que le coach ciblé appartient à la relation du client.
- Un client, un coach étranger, un admin ou un autre rôle authentifié peut donc injecter des identités étrangères dans les métadonnées et l'idempotency key actuelles.
- Les insertions Supabase et créations Stripe restent susceptibles de mutations partielles; ce point relève des tranches de sécurisation et de replay ultérieures.

### Tests exécutés

- Tests checkout ciblés : 15 réussis.
- `npm test` : 198 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint des deux nouveaux fichiers de test : réussi.
- `git diff --exit-code -- app/api/stripe/checkout/route.ts app/api/stripe/coach-checkout/route.ts` : réussi, routes inchangées.
- `git diff --check` : réussi.

### Mesures avant/après

- Tests unitaires actifs : 183 → 198.
- Routes checkout couvertes par une matrice d'autorisation dédiée : 0/2 → 2/2.
- Scénarios checkout d'identités étrangères automatisés : 0 → 15 scénarios totaux de matrice.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Sécuriser les checkouts à partir des failles révélées : lier l'identité, le rôle et les relations exclusivement aux données serveur, avec les tests actuels comme filet de caractérisation.

---

## Entrée — 2026-07-12 — Sécurisation des identités checkout

### Travail effectué

- Authentification serveur ajoutée à `POST /api/stripe/checkout` via la session Supabase et `auth.getUser()`.
- Réduction du contrat plateforme à `{ planId }`, rejet strict des identités `clientId` et `coachId`, puis dérivation de `clientId`, métadonnées et clé d'idempotence depuis `user.id`.
- Vérification serveur du profil et de la compatibilité offre/rôle : offres client réservées au rôle client, offre coach réservée au rôle coach.
- Réduction du contrat de `POST /api/stripe/coach-checkout` à un objet vide; identité client dérivée exclusivement de la session.
- Résolution serveur du coach depuis une relation `coach_clients` active, puis validation du profil coach et de son compte Stripe.
- Retrait des identifiants devenus inutiles dans les corps POST de `Paywall` et `useClientDashboard`, sans modifier l'affichage de l'offre coach.
- Transformation des quinze caractérisations vulnérables en dix-neuf tests d'autorisation sécurisée.

### Tâches cochées

- Phase 1 : « Lier tous les checkouts à l'identité et aux relations serveur ».

### Décisions prises

- Toute présence de `clientId` ou `coachId` dans un corps checkout est désormais une entrée invalide (`400`) plutôt qu'une valeur silencieusement ignorée.
- Le checkout plateforme représente uniquement un achat auprès de la plateforme : `coachId` Stripe vaut `platform` et `payments.coach_id` vaut `null`.
- Le checkout coach est initié uniquement par le client authentifié pour son coach actif; un coach ne peut pas créer un paiement au nom d'un client.
- Les contrôles d'autorisation et de relation précèdent toute construction Stripe, création de customer/session ou mise à jour de profil.
- Les champs d'abonnement sont lus avec le profil plateforme pour conserver une frontière serveur prête aux règles d'éligibilité; dans cette tranche, aucune interdiction commerciale supplémentaire non documentée n'est inventée au-delà de la compatibilité rôle/offre.

### Problèmes rencontrés

- Le lint groupé initial incluait des fichiers consommateurs historiques et a signalé leur dette préexistante (`any`, règles React). Après conservation de leurs signatures publiques, le périmètre réellement modifié passe ESLint; aucune correction hors checkout n'a été engagée.

### Risques ou dette restante

- La création Stripe puis l'insertion `payments` du checkout plateforme ne sont pas transactionnelles; la réconciliation et le replay restent à traiter dans les tâches webhook/Billing.
- Plusieurs relations coach actives rendraient `maybeSingle()` ambigu; le modèle devrait garantir ou expliciter une relation facturable unique lors de la future centralisation Billing.
- Les métadonnées webhook existantes doivent encore être testées contre replay, événements désordonnés et divergences entre les deux familles de checkout.
- Aucun E2E navigateur réel Stripe test n'est intégré; la couverture actuelle est entièrement mockée et ne contacte aucun service externe.

### Tests exécutés

- Matrice checkout ciblée : 19 réussis.
- `npm test` : 202 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint des deux routes, de `Paywall` et des deux fichiers de test : réussi.
- Recherche des producteurs : aucun corps POST checkout ne transmet `clientId` ou `coachId`.
- `git diff --check` : réussi.
- `npm run build` : lancé deux fois mais n'a pas terminé; Next.js reste sur `Creating an optimized production build ...`, sans produire `.next/BUILD_ID` ni retourner de diagnostic exploitable dans l'environnement courant. Les tests et TypeScript restent verts.

### Mesures avant/après

- Routes checkout authentifiées : 1/2 → 2/2.
- Routes checkout acceptant une identité utilisateur navigateur : 2/2 → 0/2.
- Checkouts coach exigeant une relation active vérifiée : 0/1 → 1/1.
- Tests unitaires actifs : 198 → 202.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Tester les métadonnées et le replay du webhook Stripe avec des mocks complets, sans modifier encore sa logique métier.

---

## Entrée — 2026-07-12 — Caractérisation des métadonnées et replays webhook Stripe

### Travail effectué

- Lecture intégrale de `app/api/stripe/webhook/route.ts`, de la migration `20260517120000_stripe_webhook_dedup.sql` et du validateur `lib/stripe/metadata.ts`.
- Inventaire des cinq événements traités : `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_succeeded`, `customer.subscription.deleted` et `account.updated`.
- Comparaison des métadonnées consommées avec les producteurs sécurisés plateforme (`clientId`, `planId`, `coachId=platform`, `subType`) et coach (`clientId`, `coachId`, `type=coach_subscription`).
- Ajout d'une matrice de vingt-deux tests avec Stripe, Supabase et déduplication entièrement simulés, sans aucun appel externe.
- Couverture des signatures, métadonnées valides et invalides, identité étrangère, offre/rôle incompatible, événement non supporté, doublon, replay séquentiel, échec de réservation et échec après réservation.
- Vérification explicite du replay après traitement incomplet et après exception de traitement.

### Tâches cochées

- Phase 1 : « Tester les metadata et le replay du webhook Stripe ».

### Décisions prises

- Les tests nomment et attendent les comportements vulnérables actuels afin de rester verts sans corriger la production dans cette tranche.
- La réservation dans `stripe_webhook_events` est considérée séparément du succès métier : son défaut SQL `success` ne prouve pas que le traitement a abouti.
- Les cinq branches prises en charge et les événements inconnus sont couverts dans une même suite pour figer l'inventaire actuel.

### Problèmes rencontrés

Aucun. Les mocks reproduisent les chaînes Supabase utilisées par la route et contrôlent séparément réservation, mutations métier et marquage `failed`.

### Risques ou dette restante

- Une exception après insertion de l'événement marque la ligne `failed`, mais un replay du même `event.id` rencontre ensuite `23505` et est ignoré définitivement sans consulter `processing_status`.
- Des métadonnées absentes ou invalides sont acquittées `200` après réservation, sans passage à `failed`; la ligne conserve donc le statut SQL par défaut `success` alors qu'aucune mutation métier n'a eu lieu.
- Un échec non-duplicate de l'insertion de déduplication retourne `200`, empêchant Stripe de retenter alors qu'aucun traitement n'a eu lieu.
- Le validateur accepte tout `clientId` UUID bien formé sans vérifier que la session Stripe appartient à ce profil ou que l'offre correspond à son rôle.
- `coach_monthly` sans `type=coach_subscription` active l'offre coach du profil fourni sans vérifier son rôle; inversement le flux coach dépend uniquement des métadonnées Stripe refetchées.
- Les événements non pris en charge sont réservés avec le statut par défaut `success`, sans statut explicite `skipped`.

### Tests exécutés

- Tests webhook ciblés : 22 réussis.
- `npm test` : 224 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint du nouveau fichier de test : réussi.
- `git diff --exit-code -- app/api/stripe/webhook/route.ts supabase/migrations` : réussi; webhook et migrations inchangés.
- `git diff --check` : réussi.

### Mesures avant/après

- Tests unitaires actifs : 202 → 224.
- Types d'événements webhook caractérisés : 0/5 → 5/5.
- Scénarios explicites de replay/déduplication : 0 → 6.
- Contrats de métadonnées checkout comparés au webhook : 0/2 → 2/2.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Corriger le webhook Stripe pour rendre la réservation et le traitement rejouables : distinguer `processing`, `success`, `failed` et `skipped`, valider l'autorité des métadonnées côté serveur et retourner un statut retentable lorsque le traitement n'est pas durablement terminé.

---

## Entrée — 2026-07-12 — Sécurisation durable du webhook Stripe

### Travail effectué

- Remplacement de la réservation applicative en plusieurs étapes par les RPC atomiques `claim_stripe_webhook_event` et `finalize_stripe_webhook_event`.
- Ajout des états explicites `processing`, `success`, `failed` et `skipped`, avec compteur de tentatives et horodatages de début/fin.
- Reprise atomique des événements `failed` et des traitements `processing` abandonnés depuis plus de cinq minutes, sans contourner l'unicité de `event_id`.
- Distinction HTTP entre doublon terminé (`200`), traitement concurrent (`409`) et panne de réservation, traitement ou finalisation (`5xx`).
- Validation stricte des métadonnées checkout, relecture du profil et du rôle bénéficiaire, de la propriété du paiement plateforme et de la relation coach/client active.
- Ajout de `subType=coach_monthly` au checkout coach afin que les deux producteurs satisfassent le contrat strict du webhook.
- Ajout d'une clé d'idempotence `payments.stripe_event_id` et utilisation d'upserts pour empêcher qu'un replay après mutation partielle duplique un paiement créé par le webhook.
- Transformation de la matrice de caractérisation en vingt-quatre tests de comportements sécurisés et ajout d'assertions PostgreSQL réelles sur la machine d'états.

### Tâches cochées

Aucune tâche supplémentaire : cette correction consolide la tâche déjà cochée « Tester les metadata et le replay du webhook Stripe » sans satisfaire une autre ligne officielle de Phase 1.

### Décisions prises

- La clé primaire `stripe_webhook_events.event_id` reste le verrou de concurrence; la réclamation est effectuée par une seule instruction conditionnelle dans une fonction PostgreSQL `SECURITY DEFINER` accessible uniquement au `service_role`.
- Un événement non pris en charge est durablement classé `skipped`; il n'est ni assimilé à un succès métier ni retraité indéfiniment.
- Toute métadonnée absente, inconnue ou incohérente provoque un échec retentable avant mutation.
- Un checkout plateforme doit correspondre à un paiement serveur du même client sans coach; un checkout coach exige un client, l'offre `coach_monthly` et une relation active avec le coach annoncé.
- La migration est additive et compatible avec l'application précédente : les anciennes valeurs d'état restent admises et les nouvelles colonnes ont des valeurs par défaut. Le rollback applicatif peut précéder le retrait ultérieur des RPC, colonnes et index, après vérification qu'aucune ligne `processing` n'est active.

### Problèmes rencontrés

- Le premier appel `psql` par URL a été bloqué par le sandbox local; la même assertion a été exécutée avec l'accès local explicitement autorisé et a réussi.
- L'ajout du champ strict `subType` au checkout coach a nécessité l'alignement de son test d'autorisation existant.

### Risques ou dette restante

- Le délai de réclamation d'un traitement abandonné est fixé à cinq minutes; il devra être confronté à la durée réelle des webhooks en préproduction.
- Les mutations profil et paiement ne forment pas une transaction unique avec la finalisation de l'événement. Les créations de paiements sont maintenant idempotentes, mais une réconciliation Billing complète reste nécessaire.
- Les branches abonnement, facture et compte Stripe utilisent encore des identifiants d'objets Stripe relus pour retrouver les profils; leur couverture métier exhaustive et les événements désordonnés relèvent de la Phase 6.
- Aucun E2E Stripe test réel n'est encore intégré.

### Tests exécutés

- Tests webhook ciblés : 24 réussis.
- Reset complet des migrations sur `moovx_full_reset` : réussi, migration `20260712143000_harden_stripe_webhook_claims.sql` incluse.
- Assertions PostgreSQL `stripe-webhook-claims.sql` : réussies (claim, exclusion `processing`, `failed` → retry, `success`, `skipped`, écriture terminale tardive refusée).
- `npm test` : 226 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint ciblé des routes, du validateur et des tests modifiés : réussi.
- `git diff --check` : réussi.

### Mesures avant/après

- États webhook explicites : 3 implicites/incomplets → 4 explicites.
- Événements `failed` rejouables : 0 % → 100 % via réclamation atomique.
- Livraisons concurrentes autorisées à muter pour un même `event.id` : potentiellement plusieurs → 1.
- Tests unitaires actifs : 224 → 226.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Restreindre les notifications aux relations autorisées, en commençant par les tests d'autorisation des routes Web Push avant toute modification de production.

---

## Entrée — 2026-07-12 — Caractérisation des autorisations Web Push

### Travail effectué

- Lecture de la route `/api/send-notification`, du transport `lib/push-server.ts`, du push du diagnostic hebdomadaire et du cron de rappel de streak.
- Recherche exhaustive des producteurs de `/api/send-notification` et des appels directs à Web Push.
- Analyse des migrations de `push_subscriptions` et `coach_clients`, y compris la RLS propriétaire des abonnements et le statut actif ajouté aux relations coach/client.
- Ajout d'une matrice de seize tests de caractérisation avec session Supabase, client `service_role`, abonnements push et fournisseur Web Push entièrement simulés.
- Couverture de l'anonymat, de l'auto-notification, de toutes les combinaisons coach/client autorisées ou étrangères, de l'injection du destinataire, de l'absence d'abonnement, de l'erreur fournisseur et du passage inchangé des URLs internes, externes ou dangereuses.

### Tâches cochées

Aucune. « Restreindre les notifications aux relations autorisées » reste ouverte car cette tranche caractérise la production vulnérable sans la corriger.

### Décisions prises

- Les tests conservent explicitement les attentes vulnérables actuelles afin de fournir un filet vert avant la correction.
- La session authentifiée prouve seulement l'identité de l'appelant; elle ne prouve ni son rôle ni son droit de cibler le `userId` fourni dans le corps.
- La RLS `push_subscriptions_own` protège les accès directs du navigateur, mais ne constitue pas une autorisation pour la route car son client administratif la contourne volontairement.
- La validation des URLs est seulement caractérisée dans cette tranche; sa correction reste la tâche Phase 1 suivante dédiée.

### Inventaire des producteurs

- `app/client/[id]/hooks/useClientDetail.ts` : coach authentifié vers le client affiché; identifiant provenant du paramètre de page; relation attendue coach/client active; titre « Nouveau message », extrait du message ou photo, URL `/`.
- `app/coach/hooks/useCoachDashboard.ts` (message) : coach authentifié vers `selectedClient.client_id`; relation attendue active; titre « Nouveau message », extrait du message ou photo, URL `/`.
- `app/coach/hooks/useCoachDashboard.ts` (rendez-vous) : coach authentifié vers `nsClientId` choisi dans le dashboard; relation attendue active; titre « Nouvelle séance planifiée », type/date/heure, URL `/`.
- `app/hooks/useMessages.ts` : client authentifié vers `coachId` chargé par le dashboard; relation attendue active; titre « Nouveau message client », extrait du message ou photo, URL `/coach`.
- `lib/weekly-diagnostic/generator.ts` : producteur serveur vers le même `userId` que le diagnostic géné; autorité issue du job/session appelant; contenu fixe avec score, URL interne `/weekly-diagnostic/{id}`.
- `app/api/streak-reminder/cron/route.ts` : cron authentifié par secret vers chaque client éligible lu côté serveur; contenu localisé lié à la séance et au streak; transport via `sendPushToUser`.

### Problèmes rencontrés

- Le paquet sentinelle `server-only` n'est pas résolu dans Vitest; il a été neutralisé uniquement dans le test, sans modifier la production.
- Les rôles ne peuvent pas être paramétrés réellement dans la route actuelle puisqu'aucune lecture de profil n'existe; les cas de rôle documentent donc que tout utilisateur authentifié suit exactement le même chemin.

### Risques ou dette restante

- Tout utilisateur authentifié peut fournir l'UUID de n'importe quel tiers et faire lire ses abonnements par le client `service_role`, puis lui envoyer un push.
- Aucun rôle n'est lu et aucune relation `coach_clients` n'est vérifiée, active ou non, avant la lecture des abonnements ou l'appel Web Push.
- Client→client, coach→coach, client→coach étranger et coach→client étranger sont indistinguables des parcours légitimes.
- Le titre, le corps, le tag et l'URL sont contrôlés par le navigateur; les URLs externes et le schéma `javascript:` sont transmis tels quels dans le payload signé.
- Une panne Web Push est acquittée avec HTTP 200 et comptée dans `failed`; aucun retry durable n'existe.
- Le diagnostic hebdomadaire duplique le transport Web Push au lieu de réutiliser `sendPushToUser`; les deux producteurs serveur restent toutefois hors du vecteur d'injection navigateur de la route.

### Tests exécutés

- Tests ciblés `/api/send-notification` : 16 réussis.
- `npm test` : 242 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint du nouveau fichier de test : réussi.
- Preuve Git ciblée : aucun diff dans `app/api/send-notification/route.ts`, `lib/push-server.ts`, `lib/weekly-diagnostic/generator.ts`, leurs producteurs et les migrations analysées.
- `git diff --check` : réussi.

### Mesures avant/après

- Producteurs push inventoriés : 0 → 6 flux (4 appels route navigateur, 2 producteurs serveur).
- Scénarios d'autorisation push automatisés : 0 → 13, plus 3 variantes d'URL.
- Tests unitaires actifs : 226 → 242.
- Routes push vérifiant une relation métier : 0/1, inchangé volontairement.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Sécuriser l'identité, le rôle et les relations coach/client du flux `/api/send-notification` à partir de cette matrice, avant toute lecture d'abonnement ou livraison Web Push.

---

## Entrée — 2026-07-12 — Autorisation relationnelle des notifications Web Push

### Travail effectué

- Transformation de la matrice vulnérable en vingt-trois tests de comportement sécurisé.
- Validation stricte du corps avec Zod : UUID destinataire, titre et corps non vides et bornés, URL/tag typés et rejet des propriétés inconnues.
- Conservation de l'identité de l'appelant depuis `supabaseAuth.auth.getUser()` uniquement.
- Ajout d'un helper d'autorisation qui relit les rôles réels des deux profils puis exige une relation `coach_clients` avec `status = active` dans le bon sens.
- Refus de l'auto-notification, puisqu'aucun des quatre producteurs navigateur n'en dépend.
- Refus avant lecture de `push_subscriptions` de tous les rôles, couples ou relations non autorisés.
- Maintien sans modification des quatre producteurs navigateur et des deux producteurs serveur autonomes.
- Conservation volontaire du passage des URLs externes ou dangereuses pour la prochaine tâche dédiée.

### Tâches cochées

- Phase 1 : « Restreindre les notifications aux relations autorisées ».

### Décisions prises

- Seuls les couples `coach → client` et `client → coach` disposant de la même relation active sont autorisés.
- Les rôles `invited`, `admin` et toute valeur non reconnue sont refusés; client→client et coach→coach sont refusés sans requête relationnelle.
- Un destinataire absent retourne `403` comme un destinataire étranger afin de ne pas fournir d'oracle d'existence de compte.
- Le `userId` du navigateur reste une adresse demandée, jamais une autorité : il n'est utilisé pour lire les abonnements qu'après validation des profils et de la relation.
- Les producteurs existants transmettent déjà les identifiants correspondant à leurs relations actives; aucun changement frontend n'est requis.

### Problèmes rencontrés

- Les mocks Supabase historiques ne représentaient que `push_subscriptions`; ils ont été étendus aux lectures successives de profils et à la chaîne relationnelle active.
- Un premier passage global a signalé uniquement une incompatibilité de signature TypeScript dans un test paramétré; elle a été corrigée sans modification de production.

### Risques ou dette restante

- Le titre, le corps, le tag et surtout l'URL restent fournis par le navigateur; les URLs externes et schémas dangereux sont encore acceptés jusqu'à la prochaine tâche Phase 1.
- Les erreurs du fournisseur Web Push restent retournées dans un résultat HTTP 200 sans file de retry durable.
- `lib/weekly-diagnostic/generator.ts` conserve son transport Web Push dupliqué; il n'est pas exposé à la route publique et sa mutualisation n'était pas nécessaire pour fermer la faille d'autorisation.
- Aucun E2E navigateur Web Push n'est encore intégré.

### Tests exécutés

- Tests push ciblés : 23 réussis.
- `npm test` : 249 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi après correction du test paramétré.
- ESLint de la route, du helper et du test : réussi sans erreur ni avertissement.
- Recherche finale : exactement quatre appels navigateur à `/api/send-notification`, tous couverts par le test de compatibilité.
- `git diff --check` : réussi.

### Mesures avant/après

- Routes push lisant le rôle appelant côté serveur : 0/1 → 1/1.
- Routes push vérifiant une relation active avant les abonnements : 0/1 → 1/1.
- Couples de rôles inter-comptes autorisés : tous les utilisateurs authentifiés → uniquement coach/client reliés activement.
- Tests unitaires actifs : 242 → 249.
- Tâches Phase 1 terminées : 10/15 → 11/15.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Contraindre les URLs de notification à des chemins internes.

---

## Entrée — 2026-07-12 — Destinations internes des notifications

### Travail effectué

- Inventaire final des quatre producteurs navigateur, des deux producteurs serveur, du transport Web Push partagé, des notifications locales et du service worker.
- Ajout du contrat pur `parseNotificationDestination` et de sa variante stricte `requireNotificationDestination`.
- Application du contrat au schéma Zod de la route publique avant toute autorisation, lecture d'abonnement ou livraison.
- Application du contrat au transport `sendPushToUser`, couvrant la route publique et le cron streak avec une destination interne par défaut uniquement pour ce transport serveur contrôlé.
- Conservation du diagnostic hebdomadaire sur sa destination construite côté serveur `/weekly-diagnostic/{id}`, qui ne dépend d'aucune entrée navigateur.
- Ajout d'une défense autonome dans `notificationclick` : toute ancienne notification dont la destination est absente, non textuelle ou hostile ouvre `/`.
- Ajout de cinquante nouveaux tests actifs couvrant le contrat, la route, le transport serveur et le service worker.

### Tâches cochées

- Phase 1 : « Contraindre les URLs de notification à des chemins internes ».

### Décisions prises

- Une destination valide est une chaîne non vide commençant par exactement un `/`, sans espace, caractère de contrôle ni antislash, et restant interne après chaque niveau de décodage URI.
- Les chemins internes avec query string et fragment sont acceptés sans réécriture.
- Aucune normalisation ambiguë n'est tentée : une entrée navigateur invalide retourne `400` au lieu d'être remplacée par `/`.
- Le transport serveur partagé peut utiliser `/` lorsque son appelant interne omet volontairement l'URL; le service worker utilise aussi `/` comme confinement pour les anciennes notifications déjà reçues.
- Le diagnostic hebdomadaire reste un producteur serveur contrôlé avec un préfixe interne constant; son refactoring complet et sa dette TypeScript restent hors de cette tranche.

### Problèmes rencontrés

- Le premier lint incluant le générateur hebdomadaire a remonté sa dette `any` historique, sans lien avec les destinations. Le changement d'import initialement ajouté a été retiré : le fichier est revenu strictement à son état Git, tout en conservant sa destination interne construite côté serveur.
- Le transport push contenait un `catch (err: any)` historique dans la zone modifiée; il a été remplacé par une lecture typée de `statusCode` depuis `unknown`.

### Risques ou dette restante

- Le service worker embarque une petite défense équivalente au contrat TypeScript, car le fichier statique ne peut pas importer directement le module serveur; les deux matrices partagent les mêmes cas hostiles.
- Les anciennes notifications hostiles ne sont pas supprimées, mais leur clic est confiné vers `/`.
- Le diagnostic hebdomadaire conserve un transport Web Push dupliqué et des types `any` historiques.
- Les erreurs fournisseur restent sans file de retry durable et aucun E2E Web Push réel n'est encore intégré.

### Tests exécutés

- Tests ciblés contrat, route et service worker : 73 réussis.
- `npm test` : 299 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint de tous les fichiers effectivement modifiés : réussi sans erreur ni avertissement.
- Recherche finale de toutes les créations/livraisons de payload push et de `notificationclick` : effectuée; les six flux légitimes restent internes et le consommateur PWA est confiné.
- `git diff --check` : réussi.

### Mesures avant/après

- Producteurs navigateur rejetant une destination externe avant Supabase/Web Push : 0/4 → 4/4.
- Producteurs passant par un transport serveur validant la destination : 0/5 flux → 5/5 flux (quatre navigateur et streak).
- Producteur diagnostic à destination construite exclusivement côté serveur : 1/1, inchangé et couvert.
- Consommateurs PWA confinant les anciennes destinations : 0/1 → 1/1.
- Tests unitaires actifs : 249 → 299.
- Tâches Phase 1 terminées : 11/15 → 12/15.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Remplacer l'autorisation lifetime de `setup-products` par le contrat admin, en commençant par ses tests d'autorisation.

---

## Entrée — 2026-07-12 — Caractérisation de l'autorisation `setup-products`

### Travail effectué

- Lecture de la route `app/api/stripe/setup-products/route.ts`, de toutes les routes `app/api/admin`, du helper `lib/admin/auth.ts`, du client admin, des migrations de profils et des tests Stripe existants.
- Recherche exhaustive des usages de `subscription_type === "lifetime"` comme autorisation et des producteurs de `/api/stripe/setup-products`.
- Identification du contrat admin réellement partagé par les routes admin : Bearer token validé côté serveur par `supabaseAdmin.auth.getUser`, puis comparaison stricte de l'e-mail authentifié à `ADMIN_EMAIL`.
- Ajout d'une matrice de onze tests de caractérisation avec Stripe, Supabase SSR et cookies entièrement mockés.
- Vérification de la création répétée : deux appels autorisés créent quatre produits et huit prix, sans déduplication.
- Aucun fichier de production n'a été modifié et la tâche Phase 1 reste ouverte.

### Tâches cochées

- Aucune : « Remplacer l'autorisation lifetime de `setup-products` par le contrat admin » reste ouverte jusqu'à la correction de production.

### Décisions prises

- La source de vérité du contrat admin HTTP existant n'est actuellement ni `profiles.role`, ni `subscription_type`, mais l'e-mail du user Supabase authentifié comparé à `ADMIN_EMAIL` par `verifyAdmin`.
- Les valeurs `admin` et `super_admin` observées dans le schéma, les routes de gestion et les RPC/RLS constituent une divergence historique, mais elles ne sont pas consultées par les routes `app/api/admin`.
- La future correction devra réutiliser `verifyAdmin` côté serveur afin d'aligner `setup-products` sur les autres routes admin, sans faire confiance à des données navigateur.
- Aucun producteur applicatif de `/api/stripe/setup-products` n'existe : l'endpoint est appelé manuellement et ne reçoit aucun corps permettant d'injecter un rôle.

### Problèmes rencontrés

- Le commentaire « lifetime (admin) » de la route ne correspond pas au contrat admin central existant.
- Le dépôt conserve trois vocabulaires distincts : abonnement `lifetime`, rôle de profil `admin` dans la route de gestion, et rôle `super_admin` dans plusieurs migrations/RPC.

### Risques ou dette restante

- Tout utilisateur authentifié dont le profil porte `subscription_type = lifetime` peut encore créer les produits et prix Stripe, indépendamment de son rôle et de son e-mail.
- Un administrateur reconnu par `verifyAdmin` reste refusé si son profil n'est pas `lifetime`.
- Une erreur de lecture du profil est confondue avec une interdiction `403`.
- La route n'est pas idempotente : chaque nouvel appel autorisé crée de nouvelles ressources Stripe.
- La correction de production et ses nouveaux tests sécurisés restent à réaliser dans la tranche suivante.

### Tests exécutés

- Test ciblé `stripe-setup-products-authorization.test.ts` : 11 réussis.
- `npm test` : 310 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint du nouveau test : réussi sans erreur ni avertissement.
- Preuve Git : aucun diff dans `app/api/stripe/setup-products/route.ts` ni dans les autres fichiers de production.
- `git diff --check` : réussi.

### Mesures avant/après

- Scénarios automatisés de `setup-products` : 0 → 11.
- Tests unitaires actifs : 299 → 310.
- Producteurs applicatifs de `/api/stripe/setup-products` : 0 identifié.
- Tâches Phase 1 terminées : 12/15, inchangé.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Remplacer l'autorisation `lifetime` par le contrat admin côté serveur.

---

## Entrée — 2026-07-12 — Contrat admin de `setup-products`

### Travail effectué

- Remplacement de l'authentification Supabase SSR par le helper commun `verifyAdmin(req)` déjà utilisé sous `app/api/admin`.
- Adaptation de `POST` pour recevoir la requête et exiger un header `Authorization: Bearer ...`.
- Suppression complète de la lecture de `profiles` et du contrôle `subscription_type = lifetime`.
- Conservation inchangée des deux produits, des quatre prix, des montants et des réponses Stripe.
- Transformation de la matrice vulnérable en dix-sept scénarios sécurisés couvrant headers, token, Supabase, e-mail admin, utilisateurs non-admin et création répétée.
- Remplacement du `catch any` historique par une lecture typée de l'erreur Stripe.

### Tâches cochées

- Phase 1 : « Remplacer l'autorisation lifetime de `setup-products` par le contrat admin ».

### Décisions prises

- `setup-products` applique désormais exactement le contrat HTTP admin existant : Bearer token validé via `supabaseAdmin.auth.getUser`, puis comparaison stricte de l'e-mail authentifié à `ADMIN_EMAIL`.
- Les rôles de profil et les abonnements ne participent plus à l'autorisation de cette route.
- Les erreurs du contrat commun conservent leurs réponses : `401` pour header/token absent ou invalide, `403` pour un e-mail différent ou absent, `500` pour une erreur inattendue.
- L'absence d'idempotence est volontairement conservée hors périmètre.

### Problèmes rencontrés

- `ADMIN_EMAIL` provient toujours de `NEXT_PUBLIC_ADMIN_EMAIL` avec le repli codé en dur `bobitosm@gmail.com`; le helper commun ne valide ni la présence ni le format de cette configuration.
- La comparaison d'e-mail est stricte et sensible à la casse et aux espaces. Cette ambiguïté commune aux routes admin a été caractérisée sans refactorer le domaine admin.

### Risques ou dette restante

- Chaque appel administrateur réussi crée encore deux nouveaux produits et quatre nouveaux prix Stripe.
- Le contrat admin repose sur une adresse e-mail exposée via une variable `NEXT_PUBLIC_*` et un repli codé en dur; sa migration vers une configuration serveur obligatoire ou un rôle canonique reste à traiter séparément.
- Aucun producteur applicatif n'appelle cette route; son invocation manuelle doit désormais fournir le Bearer token administrateur.
- Aucun E2E Stripe réel n'a été exécuté; tous les accès Stripe et Supabase sont mockés.

### Tests exécutés

- Tests ciblés `setup-products` : 17 réussis.
- `npm test` : 316 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint de la route et du test modifiés : réussi sans erreur ni avertissement.
- Recherche finale : aucune occurrence de `subscription_type`, de lecture `profiles` ou de client Supabase SSR dans `setup-products`; les seules références lifetime restantes décrivent le prix produit conservé.
- `git diff --check` : réussi.

### Mesures avant/après

- Contrôles d'accès `setup-products` utilisant `verifyAdmin` : 0/1 → 1/1.
- Lectures de profil pour autoriser `setup-products` : 1 → 0.
- Utilisateurs `lifetime` non-admin pouvant atteindre Stripe : oui → non.
- Administrateurs sans abonnement `lifetime` pouvant atteindre Stripe : non → oui.
- Tests unitaires actifs : 310 → 316.
- Tâches Phase 1 terminées : 12/15 → 13/15.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Assainir le rendu Markdown du chat et ajouter les tests hostiles.

---

## Entrée — 2026-07-12 — Rendu Markdown sûr du chat

### Travail effectué

- Caractérisation du rendu historique de `ChatAI` : construction d'HTML par remplacements de chaînes puis injection avec `dangerouslySetInnerHTML`.
- Écriture préalable d'une matrice de vingt-deux tests couvrant le sous-ensemble Markdown légitime, les charges hostiles, les entrées malformées et les messages utilisateur.
- Ajout d'un petit parseur déterministe ligne par ligne produisant exclusivement des nœuds React et des chaînes automatiquement échappées.
- Conservation des titres `##`/`###`, listes simples `-`, segments gras `**...**`, texte normal, paragraphes et retours à la ligne.
- Suppression de `renderMarkdown`, de la construction d'HTML et de `dangerouslySetInnerHTML` dans le rendu des messages.
- Passage explicite des messages utilisateur par un composant texte pur sans interprétation Markdown.
- Correction locale des types, imports et ordres de hooks préexistants dans `ChatAI` afin que tous les fichiers modifiés passent ESLint.

### Tâches cochées

- Phase 1 : « Assainir le rendu Markdown du chat et ajouter les tests hostiles ».

### Décisions prises

- Seuls quatre marqueurs sont interprétés : `## ` et `### ` en début de ligne, `- ` en début de ligne et les paires `**...**`.
- Aucun lien, image, iframe, SVG, script, attribut HTML ou HTML brut n'est interprété.
- Les marqueurs mal fermés restent visibles comme texte; aucune tentative de réparation ambiguë n'est effectuée.
- Les entités HTML ne sont pas décodées par le parseur et restent du texte visible.
- Les styles des anciens titres, listes et segments gras sont conservés via des propriétés React typées.

### Problèmes rencontrés

- Une première assertion hostile interdisait les mots `onerror`, `onclick` ou `style` même dans le texte échappé; elle a été resserrée pour interdire uniquement leur création comme attribut DOM.
- ESLint a révélé un retour anticipé historique qui rendait les hooks conditionnels pour un compte invité ouvert, ainsi qu'une synchronisation d'état dans un effet. L'ouverture est désormais dérivée de l'état interne ou de `externalOpen`, sans changer l'API publique.

### Risques ou dette restante

- Le parseur est volontairement minimal et ne prend pas en charge l'échappement Markdown, les listes imbriquées, les liens ou d'autres dialectes.
- Une chaîne extrêmement longue reste rendue intégralement; le test à 100 000 caractères confirme l'absence de crash, mais aucune limite produit n'est ajoutée dans cette tranche.
- Les pages légales continuent d'utiliser `lib/markdown.ts` et leurs propres injections HTML; elles sont explicitement hors périmètre.
- Aucun E2E navigateur du chat n'est encore intégré.

### Tests exécutés

- Tests ciblés du rendu Markdown : 22 réussis.
- `npm test` : 338 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint de `ChatAI`, du parseur et des tests : réussi sans erreur ni avertissement.
- Recherche finale : aucune injection `dangerouslySetInnerHTML`, aucun `renderMarkdown` et aucun `__html` dans le code du chat; seule l'assertion négative du test nomme encore l'API dangereuse.
- `git diff --check` : réussi.

### Mesures avant/après

- Rendus de messages chat utilisant `dangerouslySetInnerHTML` : 1 → 0.
- Sous-ensembles HTML arbitraires interprétés dans le chat : illimités → aucun.
- Scénarios automatisés de rendu Markdown/chat : 0 → 22.
- Tests unitaires actifs : 316 → 338.
- Tâches Phase 1 terminées : 13/15 → 14/15.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Ajouter des journaux structurés aux rejets critiques.

---

## Entrée — 2026-07-12 — Journaux structurés des rejets critiques

### Travail effectué

- Inventaire des rejets `401`, `403`, conflits de relation, rate limits, métadonnées Stripe invalides, replay webhook et autorisation admin des flux Phase 1.
- Écartement de `lib/logger.ts`, transport navigateur, et de `lib/admin/logger.ts`, qui persiste des e-mails, pour ce contrat de sécurité sans donnée personnelle.
- Ajout d'un contrat serveur central JSON avec timestamp ISO, niveau, événement stable, domaine, opération, résultat, code de raison, correlation ID et contexte technique filtré.
- Validation stricte des correlation IDs entrants sur 8 à 64 caractères ASCII (`A-Z`, `a-z`, chiffres, `.`, `_`, `-`); génération UUID sinon.
- Propagation de `x-request-id` sur les réponses instrumentées et déduplication à un journal maximum par contexte de requête.
- Couverture de Stripe Connect, checkout plateforme, checkout coach, webhook Stripe, création/validation/consommation/révocation des invitations, push et `setup-products`.
- Suppression des anciens logs du périmètre contenant messages d'exception, identifiants Stripe/client ou objets d'erreur détaillés.

### Tâches cochées

- Phase 1 : « Ajouter des journaux structurés aux rejets critiques ».
- Checklist technique Phase 1 : 15/15 tâches cochées.

### Décisions prises

- Les journaux de sécurité sont émis sur la sortie serveur sous forme d'une seule ligne JSON; aucune table ou migration n'est ajoutée.
- Le contexte est fermé aux primitives bornées et supprime toute clé évoquant token, secret, signature, cookie, session, e-mail, body, payload, URL, abonnement, autorisation, hash ou clé.
- Aucun identifiant acteur brut ou pseudonymisé n'est nécessaire dans cette tranche; la corrélation repose uniquement sur l'identifiant de requête.
- Les refus attendus utilisent le niveau `warning` et ne sont pas transformés en exceptions bruyantes.
- Les statuts et corps HTTP existants restent identiques; seul le header `x-request-id` est ajouté aux réponses critiques instrumentées.

### Problèmes rencontrés

- La sentinelle `server-only` n'est pas installée dans l'environnement Vitest et faisait échouer sept suites à l'import. Le module reste exclusivement serveur par ses dépendances (`node:crypto`, `NextResponse`) et ses seuls consommateurs, tous des route handlers.
- Les anciens logs Stripe pouvaient inclure un message fournisseur ou des identifiants événement/client; ils ont été remplacés par des codes stables sans détails sensibles.

### Risques ou dette restante

- Les logs sont actuellement confiés à la collecte de la sortie serveur; aucune politique de rétention, alerte ou agrégation n'est encore définie.
- Le contrat couvre les principaux refus P0, pas toutes les erreurs `400/500` de l'application.
- `lib/admin/logger.ts` conserve son contrat historique avec e-mails pour les actions administratives réussies; il n'est pas utilisé pour les rejets de sécurité et devra être revu séparément.
- La checklist technique Phase 1 est complète, mais sa définition de terminé ne l'est pas : les parcours E2E invitation, checkout, push et chat sont absents, et le rollback applicatif Phase 1 n'est pas documenté.

### Tests exécutés

- Tests ciblés du logger et des routes critiques : 154 réussis.
- `npm test` : 347 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint de tous les fichiers techniques et tests modifiés : réussi sans erreur ni avertissement.
- Recherche des anciens logs sensibles : aucun message d'exception, identifiant événement/client ou détail de signature n'est encore journalisé dans les routes Phase 1 instrumentées.
- `git diff --check` : réussi.

### Mesures avant/après

- Route handlers P0 prioritaires avec rejets structurés : 0 → 10 (Connect, deux checkouts, webhook, quatre opérations invitation, push, admin).
- Réponses critiques propagant un correlation ID : 0 → toutes les branches instrumentées.
- Tests unitaires actifs : 338 → 347.
- Tâches Phase 1 terminées : 14/15 → 15/15.
- Critères E2E de Phase 1 satisfaits : non, 0 parcours E2E intégré.
- Rollback applicatif Phase 1 documenté : non.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Documenter le rollback applicatif de la Phase 1.

---

## Entrée — 2026-07-12 — Rollback applicatif de la Phase 1

### Travail effectué

- Inventaire documentaire et Git des vingt-cinq commits Phase 1 postérieurs à la baseline `aa53a6e`.
- Vérification des migrations additives de baseline/seed, invitations coach et réclamation durable du webhook.
- Création de `docs/PHASE_1_ROLLBACK.md` avec prérequis, sauvegardes, ordre de déploiement, critères go/no-go, procédure d'incident, responsabilités et validation.
- Documentation séparée de Connect, deux checkouts, webhook, invitations, push, admin, chat, logs structurés et baseline Supabase.
- Distinction explicite entre rollback applicatif, désactivation fonctionnelle, rollback de configuration, correction SQL vers l'avant et restauration de données.

### Tâches cochées

- Aucun nouvel item de la checklist technique : elle reste à 15/15.
- Critère de sortie Phase 1 « rollback applicatif documenté » satisfait.

### Décisions prises

- Aucun rollback global vers `aa53a6e` n'est acceptable, car il réintroduirait plusieurs autorités navigateur.
- Une migration additive déjà appliquée n'est jamais supprimée; toute correction de schéma se fait vers l'avant.
- Les événements Stripe et `payments.stripe_event_id` sont préservés; les états terminaux `success`/`skipped` ne sont jamais réouverts manuellement.
- Le flux d'invitation ne peut jamais revenir à `/join?coach=<UUID>` ou `/api/assign-coach`.
- Les dégradations sûres privilégiées sont l'arrêt temporaire du push et le texte brut pour le chat.

### Problèmes rencontrés

- Le dépôt ne documente aucun outil distant de monitoring ou de sauvegarde; le runbook exige donc un mécanisme approuvé et vérifiable sans en inventer un.
- Plusieurs commits Phase 1 ont versionné une baseline rétroactive; leur déploiement distant reste soumis à la stratégie de marquage contrôlée existante.

### Risques ou dette restante

- Le runbook n'a pas encore été répété sur un environnement de test dédié.
- Aucun mécanisme de désactivation fonctionnelle prêt à l'emploi n'existe pour tous les flux; certaines dégradations nécessitent un correctif applicatif minimal.
- La Phase 1 reste non terminée : les E2E invitation, checkout, push et chat sont toujours absents.

### Tests exécutés

- Vérification des noms exacts de tables, colonnes, index, RPC et statuts contre les migrations et le code.
- Vérification des liens internes vers les contrats et la stratégie de baseline.
- `git diff --check` : réussi.
- Preuve Git : seuls `docs/PHASE_1_ROLLBACK.md`, `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` sont modifiés.

### Mesures avant/après

- Rollback applicatif Phase 1 documenté : non → oui.
- Domaines Phase 1 avec procédure dédiée : 0 → 9.
- Parcours E2E intégrés : 0, inchangé.
- Checklist technique Phase 1 : 15/15, inchangée.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer le premier parcours E2E d'invitation coach vérifiée, de la création à la consommation unique.

---

## Entrée — 2026-07-12 — Socle E2E navigateur pour l'invitation coach

### Travail effectué

- Audit des dépendances, scripts, fixtures Auth/Supabase, environnements locaux et mécanismes SMTP.
- Confirmation que le harnais existant initialise seulement PostgreSQL avec `psql`; aucune stack locale Auth/PostgREST, configuration Supabase CLI ou capture SMTP n'est présente.
- Ajout de Playwright comme dépendance de développement directe et de commandes npm séparées de Vitest.
- Création d'une configuration Chromium déterministe sur le port dédié `3210`, avec répertoire Next.js isolé et refus des URLs applicatives non locales.
- Ajout d'un test navigateur traversant réellement `/join?coach=<UUID>`, vérifiant le nettoyage de l'URL et l'absence d'appel à `/api/assign-coach`.
- Documentation de l'architecture, de l'exécution locale et du blocage empêchant de revendiquer le parcours complet.

### Tâches cochées

- Aucune. Le parcours invitation E2E complet n'est pas couvert et la Phase 1 reste ouverte.

### Décisions prises

- Les frontières Supabase ne sont pas interceptées globalement dans Playwright : cela masquerait Auth, PostgREST, RLS et RPC et produirait un test d'interface simulé.
- Le socle utilise uniquement des valeurs locales synthétiques et neutralise SMTP; il ne contacte aucun service externe.
- Le test legacy est compté comme prérequis navigateur, pas comme parcours E2E métier.

### Problèmes rencontrés

- Les commandes `supabase` et `docker` sont absentes et le dépôt ne contient pas `supabase/config.toml`.
- Un serveur Next.js de développement existant utilise `.next`; le harnais emploie donc `.next-e2e` sans modifier le comportement du développement normal.
- La première exécution en sandbox n'a pas pu ouvrir le port local; les deux exécutions de validation ont ensuite été autorisées sur localhost.

### Risques ou dette restante

- Création, envoi/capture du lien, authentification client, consommation unique, relation coach/client et refus du réemploi ne sont pas encore traversés par navigateur.
- Il manque une stack locale Supabase complète et un transport SMTP capturable avec nettoyage robuste des données synthétiques.
- Les avertissements Next.js sur certaines qualités d'images préexistent et sont hors périmètre.
- Checkout, push et chat restent également sans E2E.

### Tests exécutés

- `npm run test:e2e:invitation` : 1 test Chromium réussi, exécuté deux fois consécutivement.
- `npm test` : 347 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint de la configuration Playwright, du test E2E et de la configuration Next.js : réussi sans erreur ni avertissement.
- `git diff --check` : réussi.

### Mesures avant/après

- Moteur E2E direct configuré : non → Playwright Chromium.
- Tests navigateur exécutables : 0 → 1 prérequis legacy.
- Parcours E2E invitation complet : 0, inchangé.
- Parcours E2E intégrés comptabilisés dans la roadmap : 0, inchangé.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Ajouter une stack Supabase locale reproductible avec Auth/PostgREST et un transport SMTP capturable, puis brancher le parcours invitation complet sur ce harnais.

---

## Entrée — 2026-07-12 — E2E complet de l'invitation coach vérifiée

### Travail effectué

- Ajout de la CLI Supabase `2.109.1` comme dépendance locale et création d'une stack Docker dédiée sur les ports `55320–55327`.
- Configuration d'Auth/PostgREST sur `55321`, PostgreSQL sur `55322` et Mailpit HTTP/SMTP sur `55324/55325`.
- Ajout de scripts gardés pour démarrer, contrôler, reconstruire et arrêter la stack sans projet distant.
- Diagnostic des collisions de versions courtes dans 23 groupes de migrations historiques; création d'un runner appliquant les 134 fichiers originaux dans l'ordre avec arrêt au premier échec.
- Ajout d'un transport Nodemailer local explicite, sans authentification SMTP et refusant tout hôte non local.
- Extension du test Playwright avec comptes Auth synthétiques, profils, formulaire coach, API réelle, persistance, capture Mailpit, validation, connexion client, consommation RPC, relation, refus du réemploi et nettoyage.
- Ajout d'un runner Next.js/Playwright déterministe qui filtre les jetons et arrête le groupe de processus serveur.

### Tâches cochées

- Critère Phase 1 : parcours E2E invitation coach vérifiée couvert.
- La Phase 1 reste ouverte : checkout, push et chat n'ont pas encore de parcours E2E.

### Décisions prises

- Aucun fichier de migration historique n'est renommé et aucun SQL n'est affaibli.
- Les clés locales générées restent dans `.env.e2e.local` en mode `0600`, hors Git.
- Les traces et captures Playwright sont désactivées pour empêcher la persistance du jeton; stdout/stderr sont redacted.
- Les trois identités et toutes les relations sont supprimées en `finally`, même en cas d'échec.

### Problèmes rencontrés

- La CLI Supabase refuse les migrations partageant un préfixe date; le runner local contourne uniquement l'enregistreur de versions courtes et applique chaque fichier complet.
- Le nouveau défaut de privilèges par défaut de la CLI cassait une assertion historique; `api.auto_expose_new_tables = true` aligne la stack locale sur le comportement historique, avec avertissement de dépréciation.
- Le premier scénario ouvrait le lien avec la session coach et a correctement reçu `INVITATION_EMAIL_MISMATCH`; les contextes coach/client sont désormais isolés.
- Le `webServer` Playwright laissait un enfant Next.js; un runner propriétaire du groupe de processus assure maintenant l'arrêt.

### Risques ou dette restante

- Docker publie les ports locaux sur `0.0.0.0`/`[::]`; la CLI ne propose pas d'option de bind, bien que toutes les URLs et gardes visent `127.0.0.1`.
- `api.auto_expose_new_tables` sera supprimé après 2026-10-30; les grants initiaux devront être explicités.
- Le dashboard déclenche des `GET /api/feedback/mine` en `500` et des avertissements Supabase `getSession()` hors périmètre.
- Checkout, push et chat restent sans E2E.

### Tests exécutés

- Reset Supabase local : 134/134 migrations appliquées.
- Assertions de baseline PostgreSQL : réussies.
- Assertions invitation/RLS/RPC : réussies.
- E2E invitation : deux exécutions consécutives, 2 tests réussis à chaque fois; parcours principal environ 21 s.
- `npm test` : 347 réussis, 3 `todo`.
- `npx tsc --noEmit` : réussi.
- ESLint ciblé du test, des runners, du transport SMTP et de la configuration Playwright : réussi sans erreur ni avertissement.
- `git diff --check` : réussi.

### Mesures avant/après

- Stack locale Auth/PostgREST/PostgreSQL/Mailpit : absente → opérationnelle.
- Parcours E2E intégrés : 0 → 1.
- Frontières réelles traversées par l'E2E invitation : navigateur, Next.js, Auth, PostgREST, PostgreSQL/RPC et SMTP local.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer le parcours E2E du checkout plateforme avec Stripe intégralement simulé et Supabase local.

## Entrée — 2026-07-12 — E2E checkout plateforme local

### Travail effectué

- Ajout d'une frontière Stripe HTTP locale sur `127.0.0.1:55326`, limitée à la création de session Checkout réellement utilisée.
- Ajout d'une redirection serveur du SDK Stripe active uniquement avec `MOOVX_E2E=1`, refusant toute origine non locale.
- Généralisation du runner E2E pour démarrer et arrêter Next.js, Playwright et le faux Stripe par groupes de processus.
- Ajout d'un parcours Chromium traversant Auth Supabase locale, le paywall réel et `POST /api/stripe/checkout`.
- Vérification des paramètres Stripe, de l'identité serveur, des refus avant Stripe et de l'absence d'écriture après panne.

### Tâches cochées

- Aucun item technique supplémentaire de Phase 1 : la checklist était déjà à 15/15.
- Critère E2E checkout partiellement satisfait : checkout plateforme couvert, checkout coach encore absent.

### Décisions prises

- Conserver le SDK Stripe réel et remplacer uniquement son hôte HTTP final.
- Ne rendre la destination locale configurable que dans l'environnement serveur E2E.
- Conserver les contrats HTTP et les montants de production inchangés.

### Problèmes rencontrés

- L'attente initiale de connexion du second contexte acceptait prématurément la valeur `next=/`; elle vérifie désormais le pathname réel.
- Le SDK Stripe retente une erreur `500`; le faux serveur maintient donc son état de panne jusqu'au reset explicite.
- Le garde réseau devait inclure Supabase local sur `55321` en plus de Next.js et Stripe local.

### Risques ou dette restante

- Le garde prouve les origines navigateur et la redirection explicite du SDK Stripe, mais ne constitue pas un bac à sable réseau système général.
- Le checkout coach, push et chat restent sans E2E.
- Les avertissements `getSession()` et qualités d'images observés durant le dashboard restent hors périmètre.

### Tests exécutés

- Reset Supabase local : 134/134 migrations appliquées.
- E2E checkout plateforme : deux exécutions consécutives réussies, environ 13,2 s chacune.
- Refus couverts : anonyme, `clientId`, `coachId`, plan inconnu, rôle incompatible et identité étrangère.
- Panne Stripe locale : `500` attendu, aucun paiement incohérent écrit.

### Mesures avant/après

- Parcours E2E intégrés : 1 → 2.
- Checkout plateforme E2E : absent → navigateur/Auth/Next.js/PostgreSQL/SDK Stripe local couverts.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer l'E2E local du checkout coach avec relation coach/client active et compte Connect synthétique.

## Entrée — 2026-07-12 — E2E checkout coach local

### Travail effectué

- Ajout du parcours Chromium du checkout coach via le `Paywall`, Auth locale, relation active, route réelle et faux Stripe.
- Extension du faux Stripe à la création de client, sans journaliser l'autorisation.
- Réutilisation des gardes locaux du transport Stripe dans la route coach.
- Ajout de la migration additive manquante pour `profiles.coach_monthly_rate`.

### Tâches cochées

- Critère E2E checkout satisfait pour les variantes plateforme et coach.
- Phase 1 maintenue ouverte pour push et chat.

### Décisions prises

- Les relations multiples échouent fermées via `maybeSingle()` et sont caractérisées en `403`.
- Aucune ligne `payments` n'est créée avant webhook dans le checkout coach ; le test conserve ce contrat réel.

### Problèmes rencontrés

- Le schéma versionné ne contenait pas `coach_monthly_rate` malgré son usage en production ; une migration additive était nécessaire à la reconstruction.

### Risques ou dette restante

- Le profil client conserve le customer Stripe créé avant une éventuelle panne ultérieure de session ; aucun paiement n'est toutefois écrit.
- Push et chat restent sans E2E.

### Tests exécutés

- Reset local : 135/135 migrations.
- Checkout coach : deux succès consécutifs, 12,3 s et 12,9 s.
- Checkout plateforme : vert, 13,0 s.
- Invitation : 2 tests verts, 19,8 s.

### Mesures avant/après

- Parcours E2E intégrés : 2 → 3.
- Migrations versionnées : 134 → 135.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer l'E2E local des notifications push, incluant livraison simulée et clic service worker.

## Entrée — 2026-07-12 — E2E notifications push local

### Travail effectué

- Ajout d'une terminaison Web Push HTTPS locale et de clés VAPID éphémères.
- Traversée du producteur réel de messagerie coach, de la route, de l'autorisation, de la lecture des souscriptions et de `web-push`.
- Exécution du véritable service worker et de son handler `notificationclick` dans le contexte Worker Chromium.
- Couverture des statuts succès, expiration `410` et panne `500`.

### Tâches cochées

- Critère E2E push satisfait selon les frontières documentées.
- Phase 1 maintenue ouverte pour le chat.

### Décisions prises

- Refuser tout endpoint Web Push non local en mode E2E.
- Ne pas prétendre automatiser le clic système : l'événement est dispatché dans le worker réel.

### Problèmes rencontrés

- Chromium headless refuse l'affichage système sans permission et refuse `focus()` sans activation utilisateur ; la navigation du vrai handler reste vérifiée.

### Risques ou dette restante

- La terminaison locale ne déchiffre pas le payload ; le contenu attendu est vérifié au contrat producteur, tandis que la livraison chiffrée est prouvée par les métadonnées réseau.
- Le chat reste le dernier E2E requis de Phase 1.

### Tests exécutés

- Push E2E : deux succès consécutifs, 12,1 s et 11,5 s.

### Mesures avant/après

- Parcours E2E intégrés : 3 → 4.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer l'E2E local du chat avec rendu Markdown sûr et charges hostiles.

## Entrée — 2026-07-12 — E2E chat local et clôture Phase 1

### Travail effectué

- Ajout d'une frontière Anthropic HTTP locale, déterministe et strictement limitée à `POST /v1/messages`.
- Ajout de la redirection serveur protégée par `MOOVX_E2E=1`, hôte local et chemin exact.
- Traversée Chromium mobile de l'interface Athena, Auth/PostgREST/PostgreSQL, route réelle et persistance réelle.
- Vérification du contexte profil serveur, de l'isolation d'historique et du bornage à 500 caractères.
- Vérification en navigateur du rendu Markdown autorisé et de charges HTML/Markdown hostiles inertes.
- Couverture locale de l'anonyme, invited, quota, erreurs Anthropic `429`/`500` et JSON malformé.

### Tâches cochées

- E2E chat couvert selon les frontières documentées.
- Définition de terminé de Phase 1 satisfaite avec invitation, deux checkouts, push, chat et rollback.

### Décisions prises

- Conserver l'URL Anthropic de production inchangée hors mode E2E.
- Ne pas simuler une panne PostgREST dans Playwright : l'ordre d'insertion reste contractuel et la limite est documentée.
- Utiliser le viewport mobile, seul chemin produit qui expose actuellement `ChatAI` dans le dashboard client.

### Problèmes rencontrés

- La fixture initiale utilisait un objectif non canonique ; elle a été alignée sur `cut`.
- Le premier passage Chromium utilisait le dashboard desktop sans Athena ; le viewport mobile a été rendu explicite.

### Risques ou dette restante

- Le garde réseau n'est pas un bac à sable réseau système général.
- Les pannes forcées d'insertion user/assistant ne sont pas injectées en E2E afin de préserver PostgREST et le schéma réels.
- Les avertissements `getSession()`, les `GET /api/feedback/mine 500` et les qualités d'images restent hors périmètre.

### Tests exécutés

- Reset Supabase local : 135/135 migrations.
- TypeScript, ESLint ciblé et 22 tests unitaires hostiles : verts.
- Chat E2E : deux passages complets verts, 2 tests en 16,7 s puis 15,5 s.
- Régression E2E : invitation 2 tests verts (22,2 s), checkout plateforme vert (12,6 s), checkout coach vert (12,9 s), push vert (11,7 s).
- Assertions PostgreSQL de baseline et invitation/RLS/RPC, puis concurrence invitation : vertes.
- Suite complète : 25 fichiers, 356 tests actifs verts et 3 tests contractuels `todo`.
- `npx tsc --noEmit`, ESLint ciblé et `git diff --check` : verts.

### Mesures avant/après

- Parcours E2E intégrés : 4 → 5.
- Phase 1 : dernier critère E2E manquant → définition de terminé satisfaite.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Phase 2 : documenter la pyramide de tests MoovX et les commandes unitaires, intégration et E2E distinctes.

## Entrée — 2026-07-12 — Phase 2, stratégie de tests

### Travail effectué

- Inventaire des tests Vitest, intégrations PostgreSQL/RPC, E2E Chromium et vérifications statiques réellement présents.
- Mesure des compteurs depuis Vitest et les fichiers du dépôt.
- Création de `docs/TESTING_STRATEGY.md` avec niveaux techniques, intentions de test, commandes, frontières, gardes, cadence et déterminisme.
- Définition de la matrice minimale de validation par type de changement et d'une pyramide cible réaliste.
- Recensement des lacunes Phase 2 : fixtures de rôles, matrices RLS, fournisseurs réutilisables, composants et parcours critiques.

### Tâches cochées

- Phase 2 : « Documenter la pyramide de tests MoovX » terminée.

### Décisions prises

- « Contrat », « caractérisation », « régression », « hostile » et « concurrence » décrivent l'objectif d'un test, pas un niveau technique autonome.
- Un E2E MoovX doit traverser navigateur, interface, route, identité et persistance; les fournisseurs externes sont simulés uniquement à leur frontière réseau.
- La pyramide cible est guidée par le coût et la fidélité, sans pourcentages arbitraires.

### Problèmes rencontrés

- `npm run test:e2e` n'orchestre pas toutes les frontières fournisseurs optionnelles; les cinq commandes dédiées restent la référence complète.
- Aucune commande npm dédiée n'existe encore pour l'intégration PostgreSQL, TypeScript ou le lint ciblé.

### Risques ou dette restante

- Les fixtures de rôles sont dupliquées dans les E2E.
- Les matrices RLS et les tests de composants interactifs sont encore très incomplets.
- Le lint global contient une dette historique et le build dépend encore du téléchargement de polices Google.

### Tests exécutés

- `npm test` : 25 fichiers, 356 tests actifs verts et 3 `todo`.
- Inventaire statique : 5 spécifications E2E, 7 cas techniques, 7 fichiers d'intégration, 53 assertions SQL et 1 scénario de concurrence.
- Commandes documentées vérifiées contre `package.json`, configurations et scripts réels.

### Mesures avant/après

- Documentation centrale de tests : absente → créée.
- Phase 2 : 0/18 → 1/18 tâche terminée.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les fixtures client, coach, invited, lifetime et admin.

## Entrée — 2026-07-12 — Phase 2, fixtures de personas

### Travail effectué

- Confirmation des contrats réels : rôles `client`/`coach`, abonnements `invited`/`lifetime`, autorisation admin par e-mail configuré.
- Création d'un manifeste JSON central pour sept personas synthétiques, avec API TypeScript typée.
- Ajout des helpers locaux Auth, profil, relation, abonnement, suffixe unique et nettoyage compensatoire.
- Génération d'une représentation SQL synchronisée avec fonctions de seed, relation active/inactive et nettoyage.
- Réutilisation dans un test unitaire existant, l'intégration de baseline et l'E2E checkout coach.
- Documentation des capacités, interdictions, catégories de données et règles de sécurité locale.

### Tâches cochées

- Phase 2 : « Créer les fixtures client, coach, invited, lifetime et admin » terminée.

### Décisions prises

- Le manifeste JSON est la source de vérité; le SQL versionné est généré et comparé octet par octet en test.
- Les UUID stables servent aux tests SQL; les E2E génèrent UUID et suffixes d'e-mail uniques.
- La création Auth est non idempotente et échoue explicitement; profils, relations et seed SQL sont idempotents.
- Le persona admin reste un profil client ordinaire et n'est admin que si son e-mail correspond exactement à la configuration du processus de test.

### Problèmes rencontrés

- Node ESM exigeait un attribut `type: json` pour charger le manifeste depuis Playwright; l'import a été rendu explicite.

### Risques ou dette restante

- Seul l'E2E checkout coach utilise actuellement l'API complète; les autres E2E migreront progressivement.
- Les fixtures ne remplacent pas encore une matrice RLS multi-domaines.
- Le mot de passe reste fourni par chaque scénario comme secret local éphémère jusqu'à centralisation du harnais.

### Tests exécutés

- Reset Supabase local : 135/135 migrations.
- Tests unitaires ciblés personas/admin : verts.
- Intégration baseline/personas : double seed, relations active/inactive et nettoyage verts.
- E2E checkout coach adapté : vert, 15,5 s.
- Nettoyage final lu en base : 0 compte Auth, 0 profil et 0 relation synthétique résiduelle.
- Suite complète : 26 fichiers, 366 tests actifs verts et 3 `todo`.
- TypeScript, ESLint ciblé, synchronisation JSON/SQL et `git diff --check` : verts.

### Mesures avant/après

- Fixtures partagées : absentes → 7 personas TypeScript/SQL.
- Phase 2 : 1/18 → 2/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Rendre le reset Supabase local déterministe.

## Entrée — 2026-07-12 — Phase 2, reset Supabase local déterministe

### Travail effectué

- Consolidation de `npm run supabase:local:reset` comme reconstruction canonique de la pile CLI locale Auth/PostgREST/PostgreSQL/Mailpit.
- Ajout des gardes localhost et contexte non lié, du verrou exclusif, du contrôle exact des migrations et d'un environnement E2E local en mode `0600`.
- Ajout des assertions de propreté, de l'empreinte structurelle stable et des commandes `verify`/`fingerprint`.
- Raccordement du lanceur E2E au contrat canonique par `ensure`, sans duplication du reset.
- Conservation du reset PostgreSQL brut pour les tests d'intégration ciblés uniquement.

### Tâches cochées

- Phase 2 : « Rendre le reset Supabase local déterministe » terminée.

### Décisions prises

- Les 135 migrations historiques restent appliquées en ordre lexical de nom complet, car plusieurs préfixes de version sont dupliqués.
- Le registre local conserve un ordinal et un nom de fichier; toute divergence de nombre ou d'ordre bloque les consommateurs.
- L'empreinte couvre le schéma et les migrations, mais exclut données volatiles, OID et horodatages.
- Un E2E vérifie le contrat actif; il ne déclenche pas silencieusement un reset destructif.

### Problèmes rencontrés

- Le socket Docker est inaccessible dans le bac à sable et a nécessité l'autorisation d'exécuter les validations locales.
- La première insertion psql du nom de migration utilisait une substitution incompatible avec `-c`; elle a été remplacée par un nom prévalidé strictement.

### Risques ou dette restante

- Les sorties des 135 migrations sont volumineuses et pourraient être rendues plus synthétiques ultérieurement sans masquer les erreurs.
- Le garde applicatif ne remplace pas un bac à sable réseau système général.
- L'avertissement Supabase `api.auto_expose_new_tables` reste à traiter dans une tranche de configuration distincte.

### Tests exécutés

- Reset depuis pile arrêtée puis démarrage automatique : vert.
- Reset actif après contamination par personas : vert; comptes, profils et relation supprimés.
- Trois reconstructions : 135/135 migrations et empreinte identique `b0f477c76cda936495e44c84d6d280a1`.
- Tentative de reset concurrente : refus immédiat; premier reset terminé et verrou nettoyé.
- Gardes URL distante, contexte lié, ordre/pending migrations et verrou : 4 tests unitaires verts.
- Baseline structurelle, RPC invitation et concurrence invitation : verts.
- E2E checkout coach raccordé au contrat canonique : 1 test Chromium vert en 13,2 s.
- Suite complète : 27 fichiers, 370 tests actifs verts et 3 `todo`; TypeScript et ESLint ciblé verts.
- Nettoyage final : 0 compte Auth, profil, relation, invitation et paiement.

### Mesures avant/après

- Reset canonique vérifiable : partiel → pile complète, assertions et empreinte reproductible.
- Phase 2 : 2/18 → 3/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les mocks Stripe, Anthropic, SMTP et Web Push réutilisables.

## Entrée — 2026-07-14 — Phase 2, mocks fournisseurs réutilisables

### Travail effectué

- Audit des imports et opérations Stripe, Anthropic SDK/fetch, Nodemailer et Web Push dans l'application, les scripts et les tests.
- Création de quatre contrats TypeScript sous `tests/mocks`, avec configuration explicite, historique inspectable et reset automatique Vitest.
- Migration de deux suites Stripe, de la suite de sécurité Push et ajout d'une suite SMTP au niveau `createTransport`/`sendMail`.
- Ajout de tests de contrat couvrant succès, erreurs, replay webhook, réponses Anthropic structurées/malformées, statuts Push et expurgation.
- Documentation de la séparation entre mocks Vitest, fixtures métier, adaptateurs de production et faux serveurs E2E.

### Tâches cochées

- Phase 2 : « Créer les mocks Stripe, Anthropic, SMTP et Web Push » terminée.

### Décisions prises

- Toute opération fournisseur non configurée échoue explicitement; aucun succès implicite ne peut masquer un appel nouveau.
- Les mocks enregistrent uniquement les surfaces réellement utilisées, sans reproduire les SDK complets.
- Le prompt système Anthropic et la clé VAPID privée sont expurgés; toutes les identités et destinations sont synthétiques.
- Les faux serveurs Stripe, Anthropic, Web Push et Mailpit restent inchangés afin que les E2E traversent les transports réels.

### Problèmes rencontrés

- Aucun test unitaire de route Anthropic existant n'était disponible à migrer; le nouveau contrat démontre séparément le SDK et le `fetch` direct.
- L'état module `vapidConfigured` de production impose de conserver la suite Push dans un seul module chargé, comme auparavant.

### Risques ou dette restante

- Trois suites Stripe utilisent encore leur ancien pseudo-SDK local et migreront seulement lors d'une prochaine modification de leur domaine.
- Les appels Anthropic directs restent dispersés dans le code de production; leur centralisation appartient à la Phase 7.
- Les mocks empêchent les appels réseau par construction dans leurs surfaces, mais ne constituent pas un bac à sable réseau général du processus Vitest.

### Tests exécutés

- Contrats fournisseurs et suites migrées : 5 fichiers, 81 tests verts lors de la validation ciblée.
- Suite complète : 29 fichiers, 382 tests actifs verts et 3 `todo`.
- TypeScript et ESLint ciblé : verts sans avertissement après correction.
- Reset Supabase canonique : 135/135 migrations, empreinte `b0f477c76cda936495e44c84d6d280a1`.
- E2E Push : 1 test Chromium vert en 14,0 s, avec le vrai SDK Web Push et la terminaison HTTPS locale.
- `git diff --check` : vert.

### Mesures avant/après

- Mocks fournisseurs partagés : 0 → 4.
- Pseudo-SDK Stripe ad hoc dans les suites : 5 → 3.
- Phase 2 : 3/18 → 4/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Ajouter les premières matrices RLS automatisées.

## Entrée — 2026-07-14 — Phase 2, premières matrices RLS automatisées

### Travail effectué

- Audit des politiques, grants, fonctions privilégiées et contrats réels de `profiles`, `coach_clients`, `coach_invitations`, `push_subscriptions` et `payments`.
- Création d'une matrice SQL transactionnelle utilisant les personas partagés, les rôles PostgreSQL `anon`/`authenticated` et des JWT locaux contrôlés.
- Ajout d'un lanceur local protégé qui exécute la matrice puis traverse réellement Supabase Auth et PostgREST avec un compte synthétique éphémère.
- Documentation des droits attendus, des limites de la matrice et des écarts de sécurité ou de contrat observés sans modifier les politiques de production.

### Tâches cochées

- Phase 2 : « Ajouter les premières matrices RLS automatisées » terminée.

### Décisions prises

- Les attentes de sécurité établies sont bloquantes; les vulnérabilités et incohérences déjà présentes sont émises comme `RLS_KNOWN_GAP` afin de rester visibles sans faire passer un comportement vulnérable pour une règle attendue.
- Les contrôles SQL s'exécutent sous `SECURITY INVOKER` avec les vrais rôles de la Data API; la service-role n'est utilisée que pour préparer et nettoyer le compte du contrôle PostgREST.
- Toute la matrice SQL reste dans une transaction annulée, et le compte PostgREST est supprimé dans un bloc `finally`.
- Aucun changement de policy, migration ou comportement applicatif n'est inclus dans cette tranche de caractérisation.

### Problèmes rencontrés

- Le trigger `guard_profile_sensitive_columns` référence la colonne inexistante `subscription_price`, ce qui empêche actuellement les mises à jour de profil authentifiées, y compris une mise à jour non sensible.
- Les grants de `coach_invitations` sont volontairement plus restrictifs que les grants génériques des autres tables; les assertions ont dû distinguer absence de ligne et refus SQL.

### Risques ou dette restante

- Critique : un coach peut insérer, modifier et supprimer un paiement portant son propre `coach_id`, même pour un client sans relation autorisée.
- Élevé : un coach peut créer une relation avec un client arbitraire, et un client peut s'auto-associer à n'importe quel profil coach réel.
- Élevé : un coach lié ne peut pas lire le profil client alors qu'une policy lui permet de le modifier; le contrat produit et la policy divergent.
- Moyen : une relation inactive permet encore au client de lire le profil du coach.
- La matrice initiale couvre cinq tables critiques; les autres tables RLS restent à intégrer progressivement.

### Tests exécutés

- Reset Supabase canonique avant et après validation : 135/135 migrations, empreinte `b0f477c76cda936495e44c84d6d280a1`.
- Matrice RLS exécutée deux fois de suite puis sur base fraîche : 42 attentes bloquantes vertes, 8 écarts connus signalés et 1 contrôle Auth/PostgREST vert.
- Tests RPC invitation et scénario de concurrence : verts.
- E2E invitation : 2 tests Chromium verts avec un worker.
- Suite complète : 29 fichiers, 382 tests actifs verts et 3 `todo`; TypeScript et ESLint ciblé verts.
- Nettoyage final : aucun compte, profil, relation, invitation, abonnement push ou paiement synthétique résiduel.
- `git diff --check` : vert.

### Mesures avant/après

- Tables critiques couvertes par une matrice RLS automatisée : 0 → 5.
- Assertions de sécurité RLS bloquantes : 0 → 42, complétées par 8 écarts connus non masqués.
- Phase 2 : 4/18 → 5/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Intégrer 5 parcours E2E critiques.

## Entrée — 2026-07-14 — Correctif P0, écritures RLS `payments`

### Travail effectué

- Interruption bornée de la Phase 2 après découverte par la matrice RLS d'une mutation arbitraire des paiements par un coach authentifié.
- Audit des policies, grants, fonctions privilégiées, producteurs serveur et lecteurs client, coach et admin de `payments`.
- Ajout de la migration additive `20260714211500_harden_payments_rls.sql` supprimant `payments_coach_all`, retirant les grants de mutation navigateur et créant deux policies SELECT descriptives.
- Conversion des trois écarts critiques `payments` en attentes bloquantes, avec couverture des relations actives/inactives, des champs d'autorité, du catalogue PostgreSQL et de la service-role.
- Extension de la preuve PostgREST aux lectures client/coach, au refus d'écriture authentifiée et à la révocation d'accès après désactivation de la relation.
- Documentation du contrat, de la compatibilité de déploiement et du rollback uniquement vers l'avant.

### Tâches cochées

- Aucune tâche Phase 2 supplémentaire : correctif de sécurité P0 hors séquence.

### Décisions prises

- Les paiements constituent un ledger serveur : aucun JWT `authenticated` ne peut INSERT, UPDATE ou DELETE directement.
- Le client conserve uniquement la lecture de ses lignes; le coach conserve uniquement la lecture des paiements dont le client possède avec lui une relation `active`.
- Les checkouts, le webhook Stripe et l'administration utilisent déjà la service-role; la suppression de compte utilise sa RPC privilégiée existante. Aucune nouvelle fonction `SECURITY DEFINER` n'est nécessaire.
- L'autorité admin reste le contrat serveur `ADMIN_EMAIL` suivi de la service-role; aucune valeur navigateur ni `profiles.role` n'élève les droits PostgreSQL.
- Une éventuelle écriture authentifiée future devra être ajoutée par migration vers l'avant via une RPC ou une policy strictement bornée; l'ancienne policy `payments_coach_all` ne doit pas être restaurée.

### Problèmes rencontrés

- Les grants historiques donnaient tous les privilèges de table à `anon` et `authenticated`; la migration révoque explicitement les droits inutiles au lieu de dépendre uniquement de la RLS.
- La première assertion anonyme attendait zéro ligne, mais l'absence désormais volontaire du grant SELECT produit un refus SQL; le test a été aligné sur ce contrat plus strict.
- Les helpers SQL de matrice n'accordaient pas l'usage du schéma `test` à `service_role`; ce privilège de test a été ajouté pour vérifier les mutations serveur légitimes.

### Risques ou dette restante

- Élevé : `guard_profile_sensitive_columns` référence toujours la colonne inexistante `subscription_price` et bloque les mises à jour de profil authentifiées.
- Élevé : un coach peut encore créer une relation vers un client arbitraire et un client peut s'auto-associer à n'importe quel coach réel.
- Élevé : un coach lié ne peut toujours pas lire le profil de son client malgré une policy UPDATE.
- Moyen : une relation inactive permet encore au client de lire le profil du coach.
- Les colonnes utilisées par certains producteurs Stripe mais absentes de la reconstruction locale historique restent une dette de schéma distincte, non modifiée dans ce correctif RLS.

### Tests exécutés

- Reset canonique final : 136/136 migrations appliquées; empreinte stable `68bdfc969a4728b9fda1c63f6dd7b67b` avant/après vérification et après reconstruction.
- Matrice RLS complète sur base fraîche : 62 attentes bloquantes vertes, 5 écarts connus restants et contrôle PostgREST `payments` vert.
- RPC PostgreSQL de claim/replay webhook : verte.
- Tests Stripe ciblés checkout plateforme, checkout coach et webhook : 3 fichiers, 52 tests verts.
- Suite complète : 29 fichiers, 382 tests actifs verts et 3 `todo`.
- E2E checkout plateforme : 1 test Chromium vert en 14,7 s.
- E2E checkout coach : 1 test Chromium vert en 14,8 s.
- TypeScript et ESLint ciblé : verts.
- Nettoyage final : zéro compte Auth, profil, relation, invitation, abonnement push et paiement synthétique.
- `git diff --check` : vert.

### Mesures avant/après

- Policies `payments` permissives de mutation : 1 → 0.
- Privilèges INSERT/UPDATE/DELETE pour `authenticated` : présents → révoqués.
- Écarts RLS connus : 8 → 5; les 3 écarts critiques `payments` sont devenus des refus bloquants.
- Empreinte canonique : `b0f477c76cda936495e44c84d6d280a1` sur 135 migrations → `68bdfc969a4728b9fda1c63f6dd7b67b` sur 136 migrations.
- Phase 2 : reste à 5/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Sécuriser la création de relations `coach_clients` pour imposer l'invitation vérifiée et empêcher les associations arbitraires (risque élevé).

## Entrée — 2026-07-14 — Correctif P0, création des relations `coach_clients`

### Travail effectué

- Audit des policies, grants, helpers privilégiés et producteurs de `coach_clients`, incluant invitation vérifiée, attribution automatique et déconnexion client.
- Ajout de la migration additive `20260714224500_harden_coach_clients_writes.sql` : suppression des policies INSERT, révocation des mutations `authenticated`, suppression de `is_coach_role` et `get_default_coach_id`, unicité d’une relation active par client et RPC service-role atomique pour le coach par défaut.
- Remplacement de l’upsert navigateur par `POST /api/coach/default-assignment`, sans body autoritatif, avec client issu de la session et coach issu de `DEFAULT_COACH_EMAIL` côté serveur.
- Passage de la déconnexion existante par une route serveur bodyless afin qu’aucun composant navigateur ne mute directement `coach_clients`.
- Conversion des deux écarts RLS de création arbitraire en attentes bloquantes, extension PostgREST et ajout d’un E2E dédié.

### Tâches cochées

- Aucune tâche Phase 2 supplémentaire : correctif de sécurité P0 hors séquence.

### Décisions prises

- Seules `consume_coach_invitation(bytea)` et `assign_default_coach(uuid, uuid)` créent désormais une relation hors service applicatif direct.
- L’invitation conserve son contrat token/email et ses mutations d’abonnement atomiques; l’attribution par défaut ne touche jamais l’abonnement.
- La configuration absente, ambiguë ou ne visant pas exactement un profil coach échoue fermée.
- Une relation existante n’est ni remplacée ni réactivée; les appels répétés sont idempotents et l’index partiel interdit plusieurs relations actives.
- Rollback uniquement vers l’avant : les anciennes policies et fonctions publiques ne doivent pas être restaurées.

### Problèmes rencontrés

- Révoquer SELECT à `anon` sur `coach_clients` cassait indirectement la policy anonyme de `profiles`; SELECT a donc été conservé avec RLS, tandis que toutes les mutations restent sans grant.
- Le checkout coach testait auparavant une ambiguïté par deux relations actives; ce scénario est devenu impossible grâce à la contrainte et a été retiré du E2E.
- Les autres E2E sans `DEFAULT_COACH_EMAIL` déclenchent volontairement un `503` non bloquant au chargement du dashboard; aucune relation n’est créée.

### Risques ou dette restante

- Élevé : `guard_profile_sensitive_columns` référence toujours `subscription_price` absent et bloque les mises à jour authentifiées de profil.
- Élevé : un coach lié ne peut toujours pas lire le profil de son client malgré le contrat produit.
- Moyen : une relation inactive permet encore au client de lire le profil du coach.
- La route de déconnexion serveur reste minimale et devra rejoindre le futur repository de relations coach/client.

### Tests exécutés

- Reset canonique : 137/137 migrations; empreinte stable `3357bbe75ad9dffd76891cb3302c72ce`.
- Matrice RLS : 80 attentes bloquantes, 3 écarts documentés, preuve PostgREST de refus client/coach et mutations service-role vertes.
- RPC invitation et concurrence : vertes.
- Tests unitaires complets : 31 fichiers, 390 tests actifs verts et 3 `todo`; TypeScript vert.
- E2E Chromium : attribution par défaut 1/1, invitation 2/2, checkout plateforme 1/1 et checkout coach 1/1 verts.
- ESLint des nouveaux modules, routes et tests : vert. Le lint des deux fichiers frontend historiques modifiés remonte leur dette `any`/hooks préexistante (36 erreurs, 6 avertissements), sans nouvelle catégorie introduite par cette tranche.
- Nettoyage E2E en `finally`; aucune mutation `coach_clients` directe restante dans les composants ou hooks navigateur.

### Mesures avant/après

- Policies de mutation `coach_clients` pour utilisateurs : 2 → 0.
- Helpers privilégiés exposés au navigateur : 2 → 0.
- Écarts RLS connus : 5 → 3.
- Migrations : 136 → 137; Phase 2 reste à 5/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Corriger `guard_profile_sensitive_columns` afin qu’une mise à jour sûre de profil ne référence plus la colonne inexistante `subscription_price` (risque élevé).

## Entrée — 2026-07-14 — Correctif P0, garde des colonnes sensibles `profiles`

### Travail effectué

- Audit des 68 colonnes canoniques de `profiles`, des migrations additives, des écritures navigateur, service-role, webhooks et RPC `SECURITY DEFINER`.
- Confirmation que `subscription_price` n’est créée par aucune migration canonique; elle subsiste seulement dans des lecteurs historiques et dans l’ancien bootstrap invitation.
- Ajout de `20260714233000_fix_profile_sensitive_columns_guard.sql`, qui remplace les références statiques OLD/NEW par une comparaison `to_jsonb` sur une liste d’autorités explicite.
- Alignement du bootstrap invitation sur le vrai schéma canonique, sans `subscription_price` artificielle.
- Extension de la matrice RLS et de PostgREST aux mises à jour normales, champs sensibles, combinaison atomique, compatibilité ancienne, service-role, RPC et isolation inter-profils.

### Tâches cochées

- Aucune tâche Phase 2 supplémentaire : correctif de sécurité P0 hors séquence.

### Décisions prises

- `subscription_price` reste absente du schéma canonique. Si une ancienne base la possède, le garde JSONB la protège sans code conditionnel ni SQL dynamique.
- Les champs protégés sont `role`, `status`, abonnements, essai, `beta_campaign_id`, références Stripe et les clés historiques optionnelles `subscription_price` et `stripe_onboarding_complete`.
- Le SQLSTATE `42501` et le message par colonne restent stables.
- Les utilisateurs peuvent modifier les champs de présentation autorisés; PostgreSQL, service-role et les RPC contrôlées conservent leur bypass.

### Problèmes rencontrés

- Le premier scénario `subscription_status` écrivait sa valeur déjà présente `active`; il a été corrigé vers une vraie tentative de changement `canceled`.
- La première exécution de l’empreinte sans élévation a été bloquée par les permissions du socket Docker; la commande autorisée a ensuite confirmé l’empreinte.
- Des lecteurs applicatifs demandent encore `subscription_price` et `stripe_onboarding_complete` alors que ces colonnes sont absentes du schéma local; cette incohérence de lecture reste une dette distincte, sans justification pour inventer les colonnes ici.

### Risques ou dette restante

- Élevé : un coach lié ne peut toujours pas lire le profil de son client malgré le contrat produit.
- Moyen : une relation inactive permet encore au client de lire le profil du coach.
- Les lecteurs historiques de colonnes absentes doivent être inventoriés lors d’une future tranche de contrat/types Supabase.

### Tests exécutés

- Reset canonique : 138/138 migrations; empreinte stable `2cef15199454c0d92df4b2b1f9811370`.
- Matrice RLS : 97 attentes bloquantes vertes, 2 écarts restants et contrôle PostgREST profil/paiements/relations vert.
- RPC invitation et concurrence : vertes; le bootstrap ne crée plus `subscription_price`.
- Tests ciblés garde, invitation, checkout et webhook : 5 fichiers, 80 tests verts.
- Suite complète : 32 fichiers, 393 tests actifs verts et 3 `todo`; TypeScript vert.
- E2E checkout plateforme 1/1 et checkout coach 1/1 verts.

### Mesures avant/après

- Mises à jour normales de profil sous `authenticated` : cassées → vertes.
- Références statiques à une colonne absente dans le garde effectif : 1 → 0.
- Attentes RLS bloquantes : 80 → 97; écarts connus : 3 → 2.
- Migrations : 137 → 138; Phase 2 reste à 5/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Autoriser un coach à lire uniquement le profil des clients auxquels il est activement lié, sans élargir l’accès aux relations inactives.

## Entrée — 2026-07-14 — Contrat symétrique de visibilité des profils

### Travail effectué

- Audit des 68 colonnes `profiles`, des policies `profiles`/`coach_clients` et des consommateurs dashboard, analytics, détail client, affichage coach et checkout.
- Ajout de la migration additive `20260715001000_secure_related_profile_visibility.sql` : suppression du SELECT client→coach trop large, projection symétrique `active_related_profiles`, UPDATE coach limité aux relations actives et RPC bornée `update_active_client_profile`.
- Migration des consommateurs coach et client vers la projection; le paywall ne lit plus `stripe_account_id` dans le navigateur.
- Conversion des deux derniers écarts connus en attentes bloquantes SQL et PostgREST.

### Tâches cochées

- Aucune tâche Phase 2 supplémentaire : correctif de sécurité P0/P1 hors séquence.

### Décisions prises

- Une policy RLS ne pouvant pas masquer des colonnes, aucun accès croisé direct à `profiles` n’est accordé.
- La vue projetée exige exclusivement une relation `coach_clients.status = 'active'` dans les deux sens et exclut rôle, autorités d’abonnement, essai, campagne bêta et références Stripe.
- `subscription_type` et `status` restent lisibles dans la projection pour les consommateurs existants, mais ne sont pas modifiables par la frontière coach.
- Les mises à jour coach passent par une RPC `SECURITY DEFINER` à `search_path` vide, relation active et liste fermée de dix champs; les clés inattendues échouent avec `42501`.
- Invited et lifetime ne tirent aucun droit de leur abonnement; seule une relation active réelle compte.

### Problèmes rencontrés

- PostgreSQL exige une visibilité SELECT de la ligne pour qu’un UPDATE direct puisse la cibler. Accorder cette visibilité aurait exposé les 68 colonnes; une RPC étroite a donc remplacé les écritures directes du détail client.
- Le lint ciblant les gros fichiers historiques remonte 102 erreurs et 54 avertissements préexistants (`any`, hooks et variables inutilisées). Les fichiers propres de la tranche passent le lint et TypeScript ne signale aucune erreur.
- Les E2E continuent d’émettre les avertissements Next Image historiques sur les qualités non configurées, sans échec.

### Risques ou dette restante

- La matrice initiale des cinq tables ne comporte plus d’écart connu, mais elle ne couvre pas encore Training, Nutrition, Messaging, Realtime ni toutes les tables Billing.
- La vue projetée et la RPC devront rejoindre les futurs repositories typés de profils et relations.
- Le champ `status` reste présenté comme éditable dans le détail client historique alors qu’il demeure une autorité serveur; cette dette UI n’a pas été élargie dans ce correctif de sécurité.

### Tests exécutés

- Reset canonique : 139/139 migrations; empreinte stable deux fois `96e08867f266a1a36fa8f2b94ef78fc6`.
- Matrice RLS : 114 attentes SQL bloquantes, aucun `RLS_KNOWN_GAP`, et PostgREST réel vert pour projection active symétrique, refus inactive, exclusion Stripe et RPC de mise à jour.
- Tests de contrat ciblés : 6/6 verts; suite complète : 33 fichiers, 396 tests actifs verts et 3 `todo`.
- TypeScript vert; ESLint vert sur analytics, paywall, runner PostgREST et nouveau test de contrat.
- E2E Chromium : checkout coach 1/1 et attribution coach par défaut 1/1 verts.
- `git diff --check` vert; nettoyage des scénarios assuré par rollback/finally.

### Mesures avant/après

- Colonnes de profil accessibles directement à une relation : 68 → 0; projection explicite : 29 colonnes.
- Écarts RLS connus dans la matrice initiale : 2 → 0.
- Attentes RLS bloquantes : 97 → 114.
- Migrations : 138 → 139; Phase 2 reste à 5/18 tâches terminées.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Intégrer canoniquement les cinq parcours E2E critiques existants dans la commande et le suivi de Phase 2.

## Entrée — 2026-07-15 — Suite canonique des cinq parcours E2E critiques

### Travail effectué

- Audit des cinq harnais Playwright, de leurs ports, frontières locales, prérequis et nettoyages.
- Ajout de `scripts/run-critical-e2e.mjs` et de `npm run test:e2e:critical` : verrou exclusif, Docker, reset/verify Supabase, ordre stable, un worker, fournisseurs isolés par scénario, résumé et classification des échecs.
- Centralisation des gardes localhost, de l’expurgation des sorties et du contrôle des ports temporaires dans `scripts/e2e-local-contract.mjs`.
- Ajout d’un audit final sur Auth, profils, relations, invitations, paiements, push, messages, historique Athena, Mailpit et ports temporaires; Supabase reste volontairement active.
- Conservation des traces/captures uniquement après échec via Playwright, dans un répertoire propre à chaque scénario.
- Alignement du parcours push sur la navigation Messagerie issue de la projection sécurisée des profils et ajout d’un `afterEach` de nettoyage indépendant du timeout du corps du test.
- Documentation de la commande, de l’ordre, de l’état final, des diagnostics et des usages dédiés/transverses dans `docs/TESTING_STRATEGY.md`.

### Tâches cochées

- Phase 2 : « Intégrer 5 parcours E2E critiques » — terminée.
- Progression Phase 2 : 5/18 → 6/18 tâches.

### Décisions prises

- Un reset canonique unique est exécuté au début; les scénarios restent responsables de leur isolation et de leur nettoyage.
- Les cinq scénarios sont séquentiels et utilisent explicitement `--workers=1`; une seconde suite simultanée est refusée par `.critical-e2e.lock`.
- Next.js et chaque faux fournisseur sont arrêtés après leur scénario; Stripe, Push et Anthropic ne coexistent pas inutilement.
- Les proxies externes sont neutralisés et seules les origines de boucle locale sont acceptées. Les frontières principales restent réelles; seuls SMTP, Stripe, Web Push et Anthropic se terminent sur leurs serveurs locaux documentés.
- Une suite verte supprime ses artefacts. Une suite en échec conserve uniquement les traces du scénario en échec, avec sorties expurgées.

### Problèmes rencontrés

- La première exécution depuis stack arrêtée a révélé un timeout push : le test cherchait l’ancien libellé `Sans nom` puis cliquait la carte client du tableau de bord après le changement de visibilité des profils. Le parcours ouvre désormais explicitement `MESSAGERIE` puis sélectionne le client projeté.
- Ce timeout avait interrompu le nettoyage du corps du test après deux suppressions Auth. Un `afterEach` autonome nettoie et vérifie maintenant toutes les fixtures push même après expiration du test.
- L’interruption manuelle du diagnostic a laissé temporairement Next et le faux serveur push actifs; ils ont été arrêtés, et les audits finaux confirment tous les ports temporaires fermés.
- `supabase/.temp/cli-latest` reste modifié uniquement par une différence de fin de ligne préexistante à cette session; il n’appartient pas à la tranche.

### Risques ou dette restante

- La suite utilise le serveur de développement Next.js et Chromium local; elle ne remplace pas un build de production ni un environnement de préproduction.
- Les avertissements historiques Next Image, Supabase `getSession()` et `/api/feedback/mine` restent visibles sans affecter les assertions.
- `npm run test:e2e` reste un lanceur générique sans toutes les frontières; la validation transverse doit utiliser `test:e2e:critical`.
- Les parcours séance/reprise, nutrition, messaging/realtime complet, onboarding, webhook d’abonnement et administration restent absents.

### Tests exécutés

- Suite canonique finale depuis stack arrêtée : invitation 35,6 s; checkout plateforme 27,0 s; checkout coach 25,1 s; push 24,1 s; chat 28,6 s; total 184,7 s — cinq verts, avec audit complet après chaque scénario.
- Seconde suite finale consécutive depuis stack active : invitation 35,1 s; checkout plateforme 25,0 s; checkout coach 24,5 s; push 24,0 s; chat 28,7 s; total 159,7 s — cinq verts, avec audit complet après chaque scénario.
- Commandes individuelles : invitation 2/2, checkout plateforme 1/1, checkout coach 1/1, push 1/1 et chat 2/2 vertes.
- Reset/verify : 139/139 migrations; empreinte stable deux fois `96e08867f266a1a36fa8f2b94ef78fc6`.
- Matrice RLS : 114 attentes SQL et contrôle PostgREST verts, aucun écart connu.
- Suite complète : 34 fichiers, 400 tests actifs verts et 3 `todo`; TypeScript et ESLint ciblé verts.
- `git diff --check` vert; audit PostgreSQL final à zéro sur neuf catégories, Mailpit vide et ports temporaires fermés.

### Mesures avant/après

- Commandes nécessaires pour valider les cinq parcours : 5 → 1 canonique.
- Exécutions canoniques consécutives validées : 0 → 2.
- Parcours couverts par le résumé unique : 0 → 5.
- Tâches Phase 2 terminées : 5/18 → 6/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Générer ou centraliser les types Supabase.

## Entrée — 2026-07-15 — Types Supabase générés et centralisés

### Travail effectué

- Audit complet des types existants, 82 créations de clients Supabase, 590 accès `.from()`/`.rpc()`, vues, fonctions exposées, types locaux et contournements `any`.
- Génération de `lib/supabase/database.types.ts` depuis le schéma `public` de la stack locale reconstruite par 139 migrations, avec en-tête interdisant l’édition manuelle.
- Ajout de `scripts/generate-supabase-types.mjs` et des commandes `supabase:types:generate`/`supabase:types:check`, avec gardes locales, contrôle des migrations, comparaison temporaire et nettoyage garanti.
- Ajout du module manuel `lib/supabase/types.ts`, qui réexporte `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `Views`, arguments et retours RPC sans recopier les structures générées.
- Typage des fixtures partagées avec `SupabaseClient<Database>` et `TablesInsert<'profiles'>` pour démontrer l’utilisation réelle aux niveaux TypeScript et E2E.
- Ajout des contrats positifs et négatifs sur cinq tables, la vue `active_related_profiles` et quatre RPC critiques.
- Documentation des commandes, règles de régénération, limites et divergences dans `docs/SUPABASE_TYPES.md`.

### Tâches cochées

- Phase 2 : « Générer ou centraliser les types Supabase » — terminée.
- Progression Phase 2 : 6/18 → 7/18 tâches.

### Décisions prises

- Seul le schéma `public` est généré; `auth` reste hors de l’artefact versionné.
- Le fichier généré n’est jamais édité manuellement et est exclu d’ESLint; le script, les alias et les consommateurs restent lintés.
- `supabase/.temp` n’est pas une source de vérité. La CLI locale installée interroge uniquement la base canonique vérifiée par `supabase-local.mjs ensure`.
- Les clients browser/server/admin applicatifs ne sont pas tous paramétrés dans cette tranche afin de ne pas anticiper la tâche dédiée aux factories et aux dix accès migrés.
- Les colonnes absentes révélées par les types ne sont ni inventées dans le fichier généré ni ajoutées au schéma sans décision métier.

### Problèmes rencontrés

- La première consultation de l’aide CLI a été bloquée par l’écriture de télémétrie hors sandbox; l’exécution locale autorisée et `SUPABASE_TELEMETRY_DISABLED=1` dans le script ont résolu ce point.
- La première génération a téléchargé l’image locale `postgres-meta:v0.96.6`; aucune API ni base distante n’a été utilisée.
- Les types révèlent des divergences actives : `payments.stripe_checkout_session_id`, `paid_at` et `description`; `profiles.stripe_onboarding_complete`, `coach_bio`, `cgu_accepted_at` et `subscription_price` sont utilisés par le code mais absents du schéma canonique.

### Risques ou dette restante

- Risque élevé Billing : les producteurs Stripe écrivent plusieurs colonnes `payments` absentes; une reconstruction locale honnête peut donc refuser ces mutations réelles.
- `stripe_onboarding_complete` et `coach_bio` semblent fonctionnellement nécessaires mais n’ont aucune migration canonique; leur autorité et leur historique doivent être tranchés avant migration des clients applicatifs.
- `subscription_price` reste une dette historique à analyser, pas une colonne à recréer automatiquement.
- Les retours JSON des RPC sont correctement typés `Json`, mais nécessiteront des contrats métier structurés séparés.
- Les 886 occurrences de `any`, dont au moins 62 sur une ligne d’accès Supabase, seront réduites progressivement par les factories, repositories et migrations représentatives ultérieures.

### Tests exécutés

- Reset Supabase canonique : 139/139 migrations; empreinte `96e08867f266a1a36fa8f2b94ef78fc6`.
- Génération exécutée deux fois : SHA-256 identique `12bbecbfd021b099c2a172f47229ef8e9d4d1ad207be7a1d444cb0221e86cfd1`.
- `npm run supabase:types:check` vert avant et après reset.
- Contrats de types ciblés : tables `profiles`, `coach_clients`, `coach_invitations`, `payments`, `push_subscriptions`; vue projetée; quatre RPC critiques; champs absents et obligations d’insertion.
- Matrice RLS : 114 attentes SQL et contrôle PostgREST verts, aucun écart connu.
- Suite complète : 35 fichiers, 403 tests actifs verts et 3 `todo`; TypeScript et ESLint ciblé verts.
- E2E checkout coach : 1/1 vert en 14,7 s avec fixtures typées.

### Mesures avant/après

- Sources centrales générées du schéma : 0 → 1.
- Commandes canoniques de génération/vérification : 0 → 2.
- Fixtures Supabase partagées paramétrées par `Database` : 0 → 1 module.
- Tâches Phase 2 terminées : 6/18 → 7/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir le contrat commun de réponse API.

## Entrée — 2026-07-15 — Contrat commun de réponse API

### Travail effectué

- Audit des 52 fichiers de route, 55 handlers HTTP, 287 constructions de réponse et 62 appels locaux `/api/` présents dans 30 fichiers consommateurs.
- Création du contrat générique discriminé `ApiSuccess`/`ApiFailure`/`ApiResponse` et de helpers purs pour succès, erreur et réponse `204`.
- Réutilisation stricte du correlation ID Phase 1 par extraction additive de `resolveCorrelationId()` dans le module d'audit existant.
- Validation avant sérialisation : rejet des valeurs non JSON, dates implicites, cycles, détails sensibles, traces et messages d'erreur non contrôlés.
- Documentation de l'état actuel, de la cible, des exceptions SSE/webhook/204 et de la coexistence route par route dans `docs/API_RESPONSE_CONTRACT.md`.
- Aucun handler ni consommateur n'a été migré dans cette tranche.

### Tâches cochées

- Phase 2 : « Définir le contrat commun de réponse API » — terminée.
- Progression Phase 2 : 7/18 → 8/18 tâches.

### Décisions prises

- `ok` est l'unique discriminant; le statut HTTP reste l'autorité et les erreurs possèdent un code machine stable ainsi qu'un message public contrôlé.
- Le `requestId` est présent dans l'en-tête et dans le corps produit par les helpers; le format existant n'est ni dupliqué ni élargi.
- Les dates doivent être sérialisées explicitement en chaînes et les détails d'erreur sont absents par défaut.
- Les flux SSE, corps binaires, redirections et vrais `204` ne sont pas enveloppés; leurs erreurs JSON ou événements nécessitent un contrat adapté.
- Chaque route conservera son ancien format pendant au moins une release de transition; aucune migration globale n'est autorisée.

### Problèmes rencontrés

- Le premier passage TypeScript a signalé un littéral `BigInt` incompatible avec la cible actuelle; le test utilise désormais `BigInt(1)` sans modifier la configuration.
- La mesure syntaxique des formes de corps se chevauche; le document distingue explicitement sites mesurés et classification manuelle.

### Risques ou dette restante

- Les 278 réponses JSON existantes n'utilisent pas encore le contrat; plusieurs routes exposent encore `detail` ou un message fournisseur et seront migrées séparément.
- La taxonomie complète des erreurs, le mapping Zod et les huit migrations route/service/schema restent à réaliser.
- Les deux flux SSE ont besoin d'un contrat d'événements distinct avant migration.

### Tests exécutés

- Tests ciblés du contrat et de l'audit : 26 assertions vertes au premier passage.
- Suite complète : 36 fichiers, 420 tests actifs verts et 3 `todo`.
- TypeScript `npx tsc --noEmit` et ESLint ciblé verts.
- Contrôle des liens internes, `git diff --check` et preuve d'absence de modification sous `app/api` et des consommateurs applicatifs : verts lors de la validation finale.

### Mesures avant/après

- Contrats communs de réponse API : 0 → 1.
- Helpers typés de réponse : 0 → 5 exports opérationnels.
- Tests actifs : 403 → 420 depuis la précédente tranche.
- Tâches Phase 2 terminées : 7/18 → 8/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir la taxonomie d'erreurs.

## Entrée — 2026-07-15 — Taxonomie des erreurs API

### Travail effectué

- Audit exhaustif des statuts, raisons de logs, messages publics et fuites de causes dans les 52 routes et leurs tests.
- Création de `lib/api/errors.ts` avec une union littérale de 27 codes, un registre typé exhaustif, des descriptors et un mapping legacy.
- Définition des catégories, statuts par défaut, messages publics, retry client/serveur, niveaux de log, politique `details`, anti-énumération et domaines.
- Documentation complète dans `docs/API_ERROR_TAXONOMY.md`, liée aux contrats réponse, invitation, Stripe, push, fournisseurs et logs.
- Aucun handler, consommateur, statut ou corps existant n'a été modifié.

### Tâches cochées

- Phase 2 : « Définir la taxonomie d'erreurs » — terminée.
- Progression Phase 2 : 8/18 → 9/18 tâches.

### Décisions prises

- MoovX conserve `400` pour validation syntaxique et sémantique; `422` n'est pas introduit sans besoin consommateur.
- `404` peut remplacer `403` uniquement pour une anti-énumération explicitement documentée, notamment invitation et surfaces admin non découvrables.
- `429` distingue rate limit et quota; `Retry-After` est requis lorsque la reprise est calculable.
- Le replay Stripe terminé est acquitté en `200`; concurrence et échec retentable restent distingués en `409` et `503`.
- `details` est interdit par défaut et autorisé uniquement sous forme publique contrôlée pour `VALIDATION_ERROR`.

### Problèmes rencontrés

- Les 236 statuts littéraux ne représentent pas toutes les branches construites dynamiquement; la documentation présente donc la mesure comme syntaxique.
- Plusieurs routes répercutent actuellement le statut ou le message brut d'un fournisseur; elles sont consignées comme prioritaires mais restent inchangées.

### Risques ou dette restante

- Les routes exposant `error.message`, `detail`, SQL ou Anthropic restent à migrer séparément avec leurs consommateurs.
- Le mapping legacy couvre les principaux contrats Phase 1, pas chaque phrase historique non contractualisée.
- Le helper Zod → HTTP reste à créer et devra produire seulement des détails de validation publics.

### Tests exécutés

- Tests ciblés taxonomie + contrat réponse : 49 assertions vertes.
- Suite complète : 37 fichiers, 452 tests actifs verts et 3 `todo`.
- TypeScript `npx tsc --noEmit` et ESLint ciblé verts.
- Liens internes valides; empreinte SHA des 52 routes strictement identique avant/après; `git diff --check` vert.

### Mesures avant/après

- Codes canoniques : 0 → 27.
- Mappings legacy centraux : 0 → 8.
- Tests actifs : 420 → 452.
- Tâches Phase 2 terminées : 8/18 → 9/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer le helper commun Zod → erreur HTTP.

## Entrée — 2026-07-16 — Frontière Zod vers erreur HTTP

### Travail effectué

- Audit de Zod 4.3.6, des routes Zod et des validations manuelles body, query, route params et headers dans les 52 routes.
- Création de `lib/api/validation.ts` avec `validateValue`, `validateJsonBody`, `validateQuery` et `validateRouteParams`.
- Production directe d'un `ApiFailure<ValidationDetails>` canonique avec statut 400, code `VALIDATION_ERROR` et correlation ID cohérent.
- Normalisation déterministe et bornée des issues sans valeur reçue, message custom, objet Zod brut ni chemin sensible.
- Documentation des contrats, exemples, limites et stratégie de migration dans `docs/API_VALIDATION.md`.
- Aucun handler ou consommateur n'a été migré.

### Tâches cochées

- Phase 2 : « Créer le helper commun Zod → erreur HTTP » — terminée.
- Progression Phase 2 : 9/18 → 10/18 tâches.

### Décisions prises

- Petits helpers séparés plutôt qu'une abstraction HTTP unique.
- `application/json` ou `+json` requis par défaut; corps vide et JSON malformé restent distingués publiquement.
- Limite applicative par défaut de 1 Mo, sans prétendre remplacer la limite d'infrastructure.
- Query répétée convertie en tableau; aucune coercition hors schéma Zod explicite.
- Maximum 8 issues, 12 segments et 120 caractères par chemin; champs sensibles expurgés.

### Problèmes rencontrés

- Une parenthèse manquante dans le premier test a été détectée par le transform Vitest avant exécution puis corrigée.
- Les validations actuelles sont majoritairement manuelles et hétérogènes; leur migration reste volontairement hors périmètre.

### Risques ou dette restante

- La limite après lecture protège l'application mais ne prévient pas l'allocation initiale; l'infrastructure demeure la première barrière.
- Les headers privés d'authentification ne disposent volontairement pas d'un helper générique afin d'éviter leur exposition en détails.
- Les huit routes simples restent à migrer après les factories et contrats requis par la roadmap.

### Tests exécutés

- Tests ciblés validation, réponse et taxonomie : 60 assertions vertes.
- Suite complète : 38 fichiers, 463 tests actifs verts et 3 `todo`.
- TypeScript `npx tsc --noEmit` et ESLint ciblé verts.
- Liens internes valides; empreinte SHA des 52 routes identique avant/après; consommateurs inchangés; `git diff --check` vert.

### Mesures avant/après

- Helpers de validation communs : 0 → 4.
- Tests actifs : 452 → 463.
- Tâches Phase 2 terminées : 9/18 → 10/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir les factories Supabase browser/server/admin.

## Entrée — 2026-07-16 — Factories Supabase browser, server et admin

### Travail effectué

- Audit de 76 créations Supabase : 25 browser, 26 server session et 25 clients SDK, réparties dans 76 fichiers.
- Création des frontières typées `createSupabaseBrowserClient`, `getSupabaseBrowserClient`, `createSupabaseServerClient` et `createSupabaseAdminClient`.
- Centralisation de la configuration serveur expurgée et séparation stricte du graphe browser.
- Conservation des exports legacy pour éviter toute migration de route ou propagation prématurée des divergences de schéma.
- Tests des configurations, singleton, cookies, isolation par requête, options Auth admin, imports et absence de réseau.
- Documentation dans `docs/SUPABASE_CLIENT_FACTORIES.md`.

### Tâches cochées

- Phase 2 : « Définir les factories Supabase browser/server/admin » — terminée.
- Progression Phase 2 : 10/18 → 11/18 tâches.

### Décisions prises

- Browser singleton explicite; server nouvelle instance par requête; admin nouvelle instance par appel.
- Les modules admin/env sont `server-only`; le module browser ne référence aucune configuration privée.
- L'admin n'est jamais une preuve d'autorisation et ne reçoit aucune identité en argument.
- Les exports historiques restent larges jusqu'à migration individuelle des routes contre le schéma généré.

### Problèmes rencontrés

- Le premier typecheck strict des exports legacy a exposé les divergences déjà documentées de colonnes admin/feedback/Stripe. Les nouvelles factories restent typées, tandis que les wrappers legacy conservent temporairement leur surface compatible.

### Risques ou dette restante

- 23 fichiers browser, 25 fichiers server et 21 fichiers service-role applicatifs restent dispersés.
- Les wrappers legacy larges doivent disparaître après migration et correction des écarts de schéma.
- Aucun repository n'est créé dans cette tranche.

### Tests exécutés

- Tests ciblés factories et types : 12 assertions vertes.
- Suite complète : 39 fichiers, 472 tests actifs verts et 3 `todo`.
- TypeScript et ESLint ciblé verts; types Supabase conformes au schéma local canonique.
- Graphes d'import, empreintes de tout `app/`, liens internes et `git diff --check` verts lors de la validation finale.

### Mesures avant/après

- Factories centrales typées : 0 → 3 frontières, 4 API publiques.
- Tests actifs : 463 → 472.
- Tâches Phase 2 terminées : 10/18 → 11/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les repositories profil, identité et abonnement.

## Entrée — 2026-07-16 — Repositories profil, identité et abonnement

### Travail effectué

- Audit des accès profils, identité, rôle, abonnements, Stripe et de `useClientDashboard` sans modification de consommateur.
- Création d'un résultat repository discriminé et d'erreurs internes expurgées.
- Repository profil avec projections explicites, lecture courante/relationnelle et mises à jour non sensibles typées.
- Repository identité fondé exclusivement sur `auth.getUser()`.
- Repository abonnement avec horloge injectée, normalisation invited/lifetime/essai et mutation d'autorité isolée `server-only`.
- Tests unitaires et intégration SQL locale avec personas partagés et rollback transactionnel.
- Documentation dans `docs/SUPABASE_REPOSITORIES.md`.

### Tâches cochées

- Phase 2 : « Créer les repositories profil, identité et abonnement » — terminée.
- Progression Phase 2 : 11/18 → 12/18 tâches.

### Décisions prises

- Absence, anonymat et échec ne sont jamais confondus.
- Les erreurs brutes sont réduites à une catégorie et un code technique borné.
- Les profils liés passent par `active_related_profiles`; aucun accès croisé aux 68 colonnes.
- Les mutations d'abonnement utilisent uniquement les quatre colonnes canoniques et restent dans un module serveur distinct.

### Problèmes rencontrés

- Le test du module d'autorité a nécessité le mock explicite de `server-only` sous Vitest.
- Les divergences `subscription_price` et colonnes Stripe restent exclues conformément aux types canoniques.

### Risques ou dette restante

- Aucun consommateur n'utilise encore ces repositories; la compatibilité réelle sera validée tranche par tranche.
- Injecter un client admin reste une capacité technique, jamais une autorisation.
- Les dix accès représentatifs et les repositories métier ultérieurs restent ouverts.

### Tests exécutés

- Tests unitaires repositories : 12 assertions vertes.
- Suite complète : 40 fichiers, 484 tests actifs verts et 3 `todo`.
- TypeScript et ESLint ciblé verts; types Supabase canoniques à jour.
- Matrice RLS/PostgREST verte; intégration repositories locale verte avec rollback.
- Empreinte de tout `app/`, liens internes et `git diff --check` verts lors de la validation finale.

### Mesures avant/après

- Frontières repository centrales : 0 → 3 domaines.
- Tests actifs : 472 → 484.
- Tâches Phase 2 terminées : 11/18 → 12/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Distinguer l'erreur de lecture du profil de son absence réelle dans `useClientDashboard`.

## Entrée — 2026-07-16 — Chargement de profil client récupérable

### Travail effectué

- Remplacement de la décision implicite `!profRes.data` par le résultat discriminé du repository profil.
- Ajout des états `idle`, `loading`, `ready`, `not_found` et `error`, avec redirection onboarding réservée à l'absence confirmée.
- Ajout d'une page d'erreur plein écran conservant la session et proposant une nouvelle tentative contrôlée.
- Protection contre les lectures concurrentes, réponses obsolètes, changements d'utilisateur et mises à jour après démontage.
- Liaison du cache dashboard à `ownerUserId` et rejet des caches legacy ou appartenant à une autre identité.
- Conservation d'un profil déjà confirmé lorsqu'un rafraîchissement serveur échoue.

### Tâches cochées

- Phase 2 : « Distinguer l'erreur de lecture du profil de l'absence réelle de profil dans `useClientDashboard` » — terminée.
- Progression Phase 2 : 12/18 → 13/18 tâches.

### Décisions prises

- Seul `RepositoryResult.kind === 'not_found'` prouve l'absence et autorise `/onboarding-v2`.
- Les erreurs repository et les échecs de la lecture agrégée ne déclenchent jamais l'onboarding.
- Les autres requêtes du dashboard restent sur leur chemin historique; leur migration appartient à la tranche suivante.
- Une nouvelle tentative est manuelle et sans boucle automatique; une requête identique déjà active n'est pas doublée.

### Problèmes rencontrés

- Le passage au client browser central typé a exposé des divergences historiques dans les nombreuses requêtes legacy du hook. La factory centrale est utilisée, mais la surface locale reste temporairement large jusqu'à la migration progressive des accès.
- ESLint complet des deux gros fichiers modifiés conserve la dette historique `any` déjà documentée, sans nouvelle erreur : hook 33 erreurs avant/après, page 11 erreurs avant/après. Les nouveaux modules et tests sont sans erreur ESLint.

### Risques ou dette restante

- La lecture agrégée du profil utilise encore `select('*')` après la confirmation d'existence; elle sera traitée avec les accès Supabase représentatifs.
- Le hook reste supérieur à 500 lignes et orchestre plusieurs domaines.
- L'E2E valide le profil complété et le dashboard réel; l'injection navigateur déterministe d'une panne PostgREST reste couverte au niveau repository/décision plutôt que par interception réseau E2E.

### Tests exécutés

- Tests ciblés chargement profil et repositories : 32 assertions vertes; suite complète à 42 fichiers, 504 tests actifs verts et 3 `todo`.
- TypeScript vert; ESLint vert sur le nouveau module de décision et ses tests, et comparaison ciblée sans nouvelle erreur sur les deux fichiers legacy modifiés.
- Reset Supabase canonique vert : 139/139 migrations, empreinte `96e08867f266a1a36fa8f2b94ef78fc6` stable.
- Intégration repository SQL, vérification Supabase locale et types générés vertes.
- E2E Chromium `default-coach-assignment` vert : 1 parcours en 10,0 s, avec chargement réel du dashboard.
- `git diff --check` vert lors de la validation finale.

### Mesures avant/après

- États de chargement profil explicites : 0 → 5.
- Tests actifs : 484 → 504.
- Tâches Phase 2 terminées : 12/18 → 13/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Migrer 10 accès Supabase représentatifs.

## Entrée — 2026-07-16 — Dix accès Supabase représentatifs

### Travail effectué

- Audit mesuré des constructeurs browser, server, admin, accès directs à `profiles` et champs d'abonnement.
- Sélection puis migration de dix sites applicatifs distincts : quatre browser, quatre routes session et deux routes admin.
- Remplacement des constructions locales par les factories canoniques, sans supprimer les exports de compatibilité encore consommés.
- Adoption du repository identité dans quatre routes et du repository profil dans les deux routes locale.
- Passage de l'écriture `preferred_locale` par `updateSafe` et typage du payload d'inscription avec `TablesUpdate<'profiles'>`.
- Ajout d'un inventaire automatisé fermé, de tests de routes et d'une documentation détaillée dans `docs/SUPABASE_ACCESS_MIGRATION.md`.

### Tâches cochées

- Phase 2 : « Migrer 10 accès Supabase représentatifs » — terminée.
- Progression Phase 2 : 13/18 → 14/18 tâches.

### Décisions prises

- Chaque fichier sélectionné compte pour un seul site applicatif; tests, imports et documentation ne comptent jamais.
- Les quatre sites browser utilisent le singleton partagé et n'importent aucun module server/admin.
- Les routes session recréent un client par requête et tirent l'identité exclusivement de `auth.getUser()` via le repository.
- Les factories admin ne sont créées qu'après authentification et contrôle de configuration; l'identifiant client vient de la session.
- Les accès sans repository adapté restent des requêtes Supabase typées directes.

### Problèmes rencontrés

- Le client browser typé a refusé le dictionnaire libre utilisé par l'inscription; le payload a été resserré sur `TablesUpdate<'profiles'>` sans modifier son contenu.
- Quatre composants browser conservent leur dette ESLint historique. La comparaison à `HEAD` montre exactement les mêmes erreurs et avertissements avant/après.
- L'E2E invitation continue de signaler les erreurs historiques de `/api/feedback/mine` et les avertissements Next Image, sans échec du parcours ni lien avec cette tranche.

### Risques ou dette restante

- 55 constructeurs legacy restent dans 48 fichiers.
- 87 accès directs à `profiles` et 170 occurrences de champs d'abonnement restent à traiter par tranches.
- Les divergences `payments`, Stripe Connect, `coach_bio`, `cgu_accepted_at` et `subscription_price` restent ouvertes.
- Les exports `createSupabaseRouteClient` et `supabaseAdmin` restent nécessaires aux consommateurs non migrés.

### Tests exécutés

- Tests ciblés : 8 fichiers et 58 assertions vertes.
- Suite complète : 45 fichiers, 527 tests actifs verts et 3 `todo`.
- TypeScript vert; ESLint vert sur les routes et tests modifiés, et aucune nouvelle erreur sur les quatre composants browser legacy.
- Types Supabase canoniques conformes; intégration repositories SQL verte.
- Matrice RLS/PostgREST complète verte, sans écart connu.
- E2E invitation : 2 tests verts en 21,9 s; E2E default coach : 1 test vert en 8,4 s.
- Recherche browser : aucune service-role, factory admin ou dépendance `server-only` dans les quatre sites migrés.
- `git diff --check` vert lors de la validation finale.

### Mesures avant/après

- Constructeurs legacy directs : 65 → 55.
- Fichiers avec constructeur legacy : 58 → 48.
- Accès directs à `profiles` : 89 → 87.
- Tests actifs : 504 → 527.
- Tâches Phase 2 terminées : 13/18 → 14/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir une stratégie de cache par domaine.

## Entrée — 2026-07-16 — Stratégie de cache par domaine

### Travail effectué

- Audit des stockages navigateur, caches mémoire, cookies, directives HTTP/Next et comportement du service worker, sans modifier les consommateurs.
- Formalisation du cache dashboard client actuel : clé, propriétaire, enveloppe de données, TTL de cinq minutes, symétrie lecture/écriture, rafraîchissement forcé et invalidations existantes.
- Création d'un registre déclaratif TypeScript couvrant douze domaines, indépendant de React et Supabase.
- Ajout des contrats de clé versionnée, enveloppe utilisateur, fraîcheur/rétention, cache négatif et horloge injectable.
- Documentation de la cible, des règles de sécurité, de l'adoption progressive et des écarts legacy dans `docs/CACHE_STRATEGY.md`.

### Tâches cochées

- Phase 2 : « Définir une stratégie de cache par domaine » — terminée.
- Progression Phase 2 : 14/18 → 15/18 tâches.

### Décisions prises

- Un cache n'est jamais une autorité pour l'identité, le rôle, l'abonnement, une relation coach/client, un paiement ou un accès produit.
- Les domaines critiques ne peuvent pas persister dans les stockages navigateur.
- Toute donnée privée persistante doit être versionnée, liée à l'utilisateur et purgée au logout comme au changement d'identité.
- Une erreur réseau, RLS ou fournisseur ne peut jamais alimenter un cache négatif.
- Le registre décrit la cible mais ne remplace pas `lib/cache.ts` et ne migre aucun consommateur dans cette tranche documentaire/contractuelle.

### Problèmes rencontrés

- Le jeton d'invitation est encore conservé temporairement en `sessionStorage`, contrairement au contrat cible.
- Plusieurs brouillons et clés locales ne portent ni propriétaire ni version; certaines n'ont pas d'expiration explicite.
- Le cache dashboard possède déjà une vérification propriétaire et un TTL, mais pas de version de schéma ni de séparation fraîcheur/rétention.
- Le service worker ne fournit actuellement aucun cache offline et purge Cache Storage à l'activation.

### Risques ou dette restante

- Le registre n'est pas encore consommé par le code applicatif; les écarts restent donc réels jusqu'aux migrations ciblées.
- Le cache des URL signées et les états mémoire coach/messaging devront être spécialisés après stabilisation de leurs repositories.
- L'adoption d'un cache public service worker exige encore un inventaire des ressources, des budgets et des tests offline.
- Les TTL proposés sont des bornes initiales à mesurer, pas des objectifs de performance garantis.

### Tests exécutés

- Tests ciblés du registre et de l'inventaire statique : 13 assertions vertes.
- Suite complète : 47 fichiers, 540 tests actifs verts et 3 `todo`.
- TypeScript vert; ESLint ciblé vert sur le registre et ses tests.
- Validation des liens internes et `git diff --check` vertes lors de la validation finale.

### Mesures avant/après

- Domaines possédant un contrat central : 0 → 12.
- Mécanismes inventoriés : 12 occurrences `sessionStorage`, 29 `localStorage`, 18 appels helper, 2 appels Cache Storage et 19 directives HTTP/Next explicites.
- Tâches Phase 2 terminées : 14/18 → 15/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Migrer 8 routes simples vers le contrat route/service/schema.

## Entrée — 2026-07-17 — Huit routes simples vers route/service/schema

### Travail effectué

- Audit de l'ensemble des routes `app/api`, de leur taille, de leurs consommateurs et de leurs tests existants.
- Sélection fermée de huit routes sans toucher à Stripe, invitations, push, chat Athena ou aux flux E2E lourds.
- Extraction de huit services typés et de trois schémas Zod pour les entrées JSON.
- Réduction des `route.ts` à la validation HTTP, la délégation et l'adaptation des réponses historiques.
- Ajout d'un inventaire statique exécutable, de tests de contrats et de la documentation `docs/API_SIMPLE_ROUTE_MIGRATION.md`.

### Tâches cochées

- Phase 2 : « Migrer 8 routes simples vers le contrat route/service/schema » — terminée sous réserve des validations finales consignées ci-dessous.
- Progression Phase 2 : 15/18 → 16/18 tâches.

### Décisions prises

- Les huit routes sont quota IA, synchronisation de locale, mise à jour de locale, lecture feedback, marquage feedback lu, Web Vitals, journal client et diagnostic hebdomadaire.
- Les services retournent des codes de la taxonomie commune; les routes conservent les réponses legacy consommées actuellement.
- Les schémas Zod tolèrent le Content-Type historique et les clés supplémentaires lorsque les anciens handlers les ignoraient.
- L'identité reste déterminée côté serveur via le repository; aucun identifiant navigateur n'est une autorité.
- Les routes feedback restent sur le wrapper session de compatibilité, soumis à RLS, en raison d'une divergence du schéma généré; aucun service-role n'est introduit.

### Problèmes rencontrés

- Les types Supabase générés de `bug_reports` ne contiennent pas plusieurs colonnes feedback utilisées par l'application. Le wrapper session large existant est conservé localement au lieu d'inventer le schéma.
- Le contrat `ApiResponse` ne peut pas envelopper immédiatement ces réponses sans casser leurs consommateurs; une coexistence explicite est documentée.

### Risques ou dette restante

- Les erreurs de persistance feedback continuent d'exposer le message historique en `500` pour compatibilité.
- Les consumers doivent être migrés avant une future bascule des réponses vers l'enveloppe commune.
- Aucun repository spécialisé feedback ou diagnostic n'a été créé dans cette tranche bornée.
- Les correlation IDs et journaux structurés communs restent la prochaine tâche officielle.

### Tests exécutés

- Tests ciblés des huit routes : 3 fichiers et 30 assertions vertes.
- Suite complète : 49 fichiers, 563 tests actifs verts et 3 `todo`.
- TypeScript vert; ESLint ciblé vert sur tous les fichiers TypeScript modifiés.
- Inventaire statique vert : exactement huit routes uniques, huit services, trois schémas et aucune frontière critique exclue.
- `git diff --check`, validation des liens internes et contrôle des fichiers verts lors de la validation finale.

### Mesures avant/après

- Routes utilisant le contrat route/service/schema : environ 0 → 8 routes inventoriées dans cette tranche.
- Services colocalisés ajoutés : 0 → 8.
- Schémas Zod colocalisés ajoutés : 0 → 3, uniquement pour les routes avec entrée JSON.
- Constructeurs Supabase legacy directs : 55 → 54, dans 47 fichiers, grâce au diagnostic hebdomadaire.
- Tâches Phase 2 terminées : 15/18 → 16/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Ajouter correlation IDs et logs structurés.

## Entrée — 2026-07-17 — Correlation IDs et logs structurés des routes simples

### Travail effectué

- Audit de `x-request-id`, `createSecurityAudit`, des helpers `ApiResponse` et des `console.*` sur les huit routes simples.
- Stabilisation de `resolveCorrelationId` pour un même objet `Request`, y compris lorsque l'en-tête entrant est invalide.
- Création de `createApiRouteObservability`, writer JSON borné avec résultats success, rejected, failed et skipped.
- Instrumentation exclusive des huit routes simples, sans modifier leurs consommateurs, corps ou statuts.
- Suppression des huit logs ad hoc présents dans ces routes/services, dont le log Web Vitals contenant le chemin navigateur.
- Ajout de tests contractuels, d'un inventaire statique fermé et de `docs/API_OBSERVABILITY.md`.

### Tâches cochées

- Phase 2 : « Ajouter correlation IDs et logs structurés » — terminée sous réserve des validations finales consignées ci-dessous.
- Progression Phase 2 : 16/18 → 17/18 tâches.

### Décisions prises

- Un objet `Request` possède un unique correlation ID mémorisé dans un `WeakMap`; aucune donnée de requête n'est conservée après sa collecte.
- Toutes les réponses, y compris les réponses legacy sans enveloppe, reçoivent `x-request-id`.
- Chaque observateur écrit au maximum un log JSON, même si plusieurs complétions sont tentées.
- Les clés et valeurs sensibles sont supprimées plutôt que masquées partiellement.
- Les raisons réutilisent la taxonomie API pour validation, auth, limites, persistance et erreurs internes; les succès/skips utilisent des codes stables contrôlés.

### Problèmes rencontrés

- Le commit de la tranche précédente annoncé par l'utilisateur n'était pas présent : HEAD restait `289376e` et les modifications route/service/schema étaient encore non commitées. Elles ont été préservées et cette tranche a été construite dessus sans commit.
- Web Vitals journalisait auparavant le chemin navigateur; ce champ est désormais exclu du log structuré.

### Risques ou dette restante

- Les routes hors des huit frontières gardent leurs logs et correlation IDs historiques.
- Les logs internes du générateur de diagnostic hebdomadaire ne sont pas migrés dans cette tranche.
- Aucun backend d'agrégation, métrique ou alerte de logs n'est ajouté.
- Les erreurs feedback conservent encore leur corps public legacy, même si le log structuré n'enregistre jamais le message interne.

### Tests exécutés

- Tests ciblés correlation/logs et huit routes : 7 fichiers et 63 assertions vertes.
- Suite complète : 51 fichiers, 570 tests actifs verts et 3 `todo`.
- TypeScript vert; ESLint ciblé vert sur tous les fichiers TypeScript modifiés par cette tranche.
- Inventaire statique vert : exactement huit routes instrumentées et aucun `console.*` ad hoc dans leurs frontières/services.
- `git diff --check` et validation des liens internes vertes lors de la validation finale.

### Mesures avant/après

- Routes simples avec `x-request-id` cohérent : 0/8 → 8/8.
- `console.*` ad hoc dans les huit routes/services : 8 → 0.
- Routes simples avec un log JSON borné et unique : 0/8 → 8/8.
- Tâches Phase 2 terminées : 16/18 → 17/18.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les premiers ADR et le guide de contribution.

## Entrée — 2026-07-17 — Premiers ADR et guide de contribution

### Travail effectué

- Lecture de la roadmap, de la dernière entrée de session et des contrats actuels de tests, API, Supabase, cache, RLS et rollback de Phase 1.
- Création d'un index ADR avec format, statuts, numérotation et critères de création.
- Création de quatre ADR acceptés sur la baseline de sécurité Phase 1, les frontières E2E locales, les frontières d'accès Supabase et les contrats des routes API.
- Création de `docs/CONTRIBUTING.md` avec démarrage local, validations proportionnées, règles de sécurité, Supabase, API, cache, Git et suivi de session.
- Vérification que les documents distinguent les garanties présentes des limites et dettes restantes.

### Tâches cochées

- Phase 2 : « Créer les premiers ADR et le guide de contribution » — terminée après validation des liens et du périmètre documentaire.
- Progression Phase 2 : 17/18 → 18/18 tâches ; Phase 2 terminée.

### Décisions prises

- Un ADR utilise un numéro séquentiel sur quatre chiffres et un statut `proposed`, `accepted` ou `superseded`.
- Les décisions actuelles sont enregistrées comme `accepted`; une évolution substantielle créera un nouvel ADR plutôt que de réécrire l'historique.
- Les frontières E2E locales simulent les fournisseurs à leur frontière réseau et ne sont pas présentées comme une certification des services distants.
- RLS reste l'autorité des accès utilisateur; `service_role` est réservé aux flux serveur contrôlés.
- Le contrat API est progressif : les réponses legacy restent compatibles tant que leurs consommateurs ne sont pas migrés.
- Le guide de contribution rend explicite l'interdiction de push, publication ou déploiement sans demande de l'utilisateur.

### Problèmes rencontrés

- Le `README.md` racine conserve une commande Next.js générique `npm run dev`; le guide documente la commande réellement autorisée par `package.json`, `npm run dev:webpack`, sans élargir cette tranche documentaire.
- Aucun test applicatif n'était nécessaire pour cette tranche exclusivement documentaire.

### Risques ou dette restante

- Les ADR décrivent les frontières actuelles, mais ne remplacent pas les futurs modèles métier Training, Nutrition, Billing ou IA.
- Plusieurs accès Supabase et routes API legacy restent à migrer progressivement.
- Les E2E critiques restent limités à Chromium local et à cinq parcours.
- La dette de lint historique et le build potentiellement bloqué par les polices externes restent explicitement documentés.

### Tests exécutés

- Validation de tous les liens Markdown internes des six nouveaux documents.
- Vérification de toutes les commandes citées contre les scripts npm réels ou les binaires de validation déjà utilisés par le dépôt.
- `git diff --check` vert.
- Contrôle de périmètre vert : seuls `docs/`, `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` sont modifiés; aucun fichier dans `app/`, `lib/`, `supabase/` ou `tests/`.

### Mesures avant/après

- ADR versionnés : 0 → 4, plus un index et un format commun.
- Guide de contribution MoovX : 0 → 1.
- Tâches Phase 2 terminées : 17/18 → 18/18.
- Progression globale mesurée : 33/138 tâches, soit environ 24 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir le modèle métier Billing.

## Entrée — 2026-07-17 — Modèle métier Billing

### Travail effectué

- Audit des quatre routes Stripe demandées, des migrations `payments`, `commissions`, `stripe_webhook_events`, `profiles` et `coach_clients`, des types Supabase générés et des tests Stripe/E2E checkout.
- Cartographie des acteurs, objets, autorités et frontières actuelles du Billing MoovX.
- Définition des machines d'état pour abonnements plateforme/coach, paiements, entitlements et événements webhook, avec annulation et remboursement explicitement séparés.
- Création de `docs/BILLING_DOMAIN_MODEL.md` avec invariants, état courant, écarts, modèle cible et migration progressive.
- Création de l'ADR 0005 pour acter la séparation entre contrat financier, droit produit et relation coach/client.

### Tâches cochées

- Phase 6 : « Définir le modèle métier Billing » — terminée après audit et validations documentaires.
- Progression Phase 6 : 0/10 → 1/10 tâche.

### Décisions prises

- Checkout, subscription, payment et entitlement sont quatre objets distincts.
- Les subscriptions `platform` et `coach_service` peuvent coexister et ne se remplacent pas.
- Un paiement n'accorde jamais seul un accès et ne crée ou n'active jamais une relation coach/client.
- `invited`, `beta` et `lifetime` sont des sources ou durées d'entitlement, pas des états interchangeables d'un abonnement Stripe.
- Les événements Stripe sont recoupés puis traduits en événements métier ; ils ne constituent pas directement l'autorité produit.
- La cible sera introduite par expand/backfill/calcul parallèle/comparaison/bascule/contract avec maintien des projections legacy.

### Problèmes rencontrés

- Les types générés de `payments` n'exposent pas `description`, `stripe_checkout_session_id` ni `paid_at`, pourtant utilisés par les routes et dashboards.
- `profiles.stripe_onboarding_complete`, `coach_subscription_active` et `subscription_price` sont utilisés par du code courant mais absents des types générés et des migrations canoniques trouvées.
- Le nom `coach_monthly` représente actuellement deux contrats différents selon la route et les metadata.

### Risques ou dette restante

- Les créations Stripe et mutations locales ne sont pas transactionnelles ; un échec partiel requiert une future réconciliation.
- `profiles.subscription_*` mélange encore abonnement, essai, invitation, lifetime et accès coach.
- Les clés d'idempotence checkout incluent l'heure courante et ne représentent pas une commande métier stable.
- `setup-products` reste non idempotent.
- `commissions` n'est reliée à aucun paiement et aucun producteur courant n'a été trouvé.
- Le webhook ne couvre pas encore échec de paiement, remboursement, chargeback ou tous les ordres d'événements.
- Les E2E Stripe locaux ne certifient pas la sémantique complète du fournisseur.

### Tests exécutés

- Aucun test applicatif ajouté ou requis : cette tranche formalise un modèle sans imposer un schéma inexistant.
- Validation des liens Markdown internes des nouveaux documents et de l'index ADR.
- `git diff --check` vert lors de la validation finale.
- Contrôle de périmètre : aucun changement dans `app/`, `lib/`, `supabase/migrations`, `tests/` ou `e2e/`.

### Mesures avant/après

- Modèles Billing centraux documentés : 0 → 1.
- ADR Billing : 0 → 1 (ADR total : 4 → 5).
- Tâches Phase 6 terminées : 0/10 → 1/10.
- Progression globale : 33/138 → 34/138 tâches, soit environ 25 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Séparer paiement, abonnement et accès produit.

## Entrée — 2026-07-17 — Séparation paiement, abonnement et accès produit

### Travail effectué

- Audit des décisions d'accès et lectures Billing dans `app/` et `lib/`, ainsi que des routes Stripe, migrations et tests existants.
- Création d'un noyau pur `lib/billing` distinguant `PaymentState`, `SubscriptionState`, `ProductAccessState`, produits, entitlements et subscriptions plateforme/coach.
- Ajout de décisions pures pour succès financier, période d'abonnement vérifiée, entitlement actif, accès produit et accès coach/client avec scope d'identité.
- Création d'adaptateurs legacy séparés pour les projections du dashboard et du repository abonnement.
- Intégration bornée des adaptateurs dans `useClientDashboard` et `lib/repositories/subscription`, sans modifier leurs sorties publiques.
- Ajout de `docs/BILLING_ACCESS_MODEL.md` et d'une matrice de décision explicite.

### Tâches cochées

- Phase 6 : « Séparer paiement, abonnement et accès produit » — terminée après tests ciblés et suite complète.
- Progression Phase 6 : 1/10 → 2/10 tâches.

### Décisions prises

- Un paiement `paid` isolé renvoie `PAYMENT_NOT_AUTHORITY` et n'accorde aucun accès durable.
- Une subscription canonique doit être active, correspondre au produit et posséder une période vérifiée courante.
- Un entitlement actif est une autorité distincte du paiement et de la subscription.
- L'accès coach exige en plus une relation active et des scopes client/coach identiques.
- Les subscriptions plateforme et coach sont des unions discriminées indépendantes.
- Tout état inconnu, remboursement, annulation ou période non vérifiée est refusé par défaut.
- Les comportements legacy restent derrière des adaptateurs nommés jusqu'au calcul parallèle et à la migration des consommateurs.

### Problèmes rencontrés

- L'audit compte 139 occurrences liées aux abonnements/essais, 67 aux paiements et 38 aux relations dans `app/` et `lib/`; une migration globale aurait dépassé cette tranche.
- Le lint complet de `useClientDashboard.ts` expose 33 erreurs `no-explicit-any` et 2 warnings préexistants. Le nouveau noyau, le repository modifié et les tests sont lintés sans erreur; les deux lignes d'intégration du hook n'ajoutent aucun `any` ni avertissement.
- Les projections dashboard et repository n'avaient pas exactement les mêmes règles d'essai; elles restent donc deux adaptateurs explicites plutôt qu'une fusion fonctionnelle risquée.

### Risques ou dette restante

- Aucun entitlement n'est encore persisté et aucun consumer ne lit le modèle canonique depuis Supabase.
- Les routes Stripe et le webhook utilisent toujours directement les champs legacy de `profiles` et `payments`.
- Les permissions `invited` restent distribuées dans plusieurs composants et routes.
- Le statut `active` sans date continue d'ouvrir le dashboard via l'adaptateur legacy, contrairement au modèle canonique fail-closed.
- Les divergences de colonnes Billing et la réconciliation Stripe/base restent ouvertes.

### Tests exécutés

- Tests ciblés Billing, repository et frontière dashboard : 3 fichiers, 51 assertions vertes.
- Suite complète `npm test` : 52 fichiers, 606 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé vert sur `lib/billing`, le repository abonnement et le test Billing; dette historique du hook mesurée séparément.
- `git diff --check`, validation des liens et contrôles de périmètre verts lors de la validation finale.
- Aucun test Stripe ciblé supplémentaire requis : aucune route Stripe n'a été modifiée; leurs tests passent dans la suite complète.

### Mesures avant/après

- Noyaux Billing typés : 0 → 1 module pur composé de 3 fichiers.
- Décisions d'accès canoniques : 0 → 5 fonctions pures principales.
- Projections legacy isolées : 0 → 2 adaptateurs explicitement testés.
- Tâches Phase 6 terminées : 1/10 → 2/10.
- Progression globale : 34/138 → 35/138 tâches, soit environ 25 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire le service Checkout.

## Entrée — 2026-07-17 — Extraction du service Checkout (validation incomplète)

### Travail effectué

- Audit des responsabilités, contrats legacy, tests unitaires et parcours E2E des checkouts plateforme et coach.
- Extraction de `lib/billing/checkout` avec catalogue fermé, validateurs, constructeurs purs de metadata/paramètres Stripe, ports minimaux et orchestrateurs plateforme/coach.
- Réduction des deux routes aux frontières HTTP, authentification, adaptateurs Supabase et mapping d'erreurs legacy.
- Ajout de tests purs du service et renforcement des tests d'injection et de relation active ambiguë.
- Adaptation du test de compatibilité webhook pour vérifier les constructeurs de metadata sans modifier le webhook.
- Documentation du contrat dans `docs/BILLING_CHECKOUT_SERVICE.md`.

### Tâches cochées

- Aucune. « Extraire le service Checkout » reste ouverte tant que le parcours E2E plateforme requis ne passe pas.
- Progression Phase 6 inchangée : 2/10 tâches.

### Décisions prises

- Les routes restent seules responsables de la session HTTP et de la traduction exacte vers les réponses legacy.
- Les repositories et le port Stripe sont injectés dans le service ; aucune dépendance réseau n'entre dans ses tests purs.
- Les identités et comptes Connect sont toujours relus côté serveur ; les corps injectant une autorité sont refusés avant Stripe.
- Le package racine `lib/billing` ne réexporte pas l'adaptateur Stripe serveur afin de préserver la frontière avec les consommateurs client.
- Le webhook reste inchangé et reçoit les mêmes metadata.

### Problèmes rencontrés

- Le parcours E2E plateforme échoue avant tout appel checkout : après connexion, le dashboard reste sur l'état de chargement et le paywall n'est jamais monté.
- Le diagnostic PostgREST confirme que l'authentification et les premières lectures de profil réussissent, mais la lecture complète coordonnée n'est jamais lancée.
- La cause identifiée est antérieure à cette tranche : le nettoyage initial de l'effet sous React Strict Mode appelle `ProfileLoadCoordinator.unmount()`, puis le même coordinateur n'est jamais réarmé. Corriger ce comportement modifierait `useClientDashboard` et le domaine de chargement de profil hors du périmètre Checkout.
- Next/Supabase modifient le fichier temporaire suivi `supabase/.temp/cli-latest` pendant les validations locales ; ce résidu doit être restauré avant livraison.

### Risques ou dette restante

- La tâche Checkout ne peut pas être cochée sans un E2E plateforme vert après décision explicite sur le correctif du coordinateur.
- Les clés d'idempotence à base de temps, les écritures Stripe/Supabase non transactionnelles et la réconciliation restent ouvertes.
- Le customer coach peut encore être créé chez Stripe avant l'échec de sa persistance locale.

### Tests exécutés

- Tests ciblés service/routes/webhook : 4 fichiers, 66 assertions vertes.
- Suite complète `npm test` : 53 fichiers, 620 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur les routes, le service et les tests modifiés : vert.
- E2E checkout coach : 1 parcours vert en 16,5 s.
- E2E checkout plateforme : échec reproductible avant checkout sur l'attente du paywall ; aucun appel Stripe authentifié observé.
- Le webhook et `supabase/migrations` ne sont pas modifiés.

### Mesures avant/après

- Routes contenant l'orchestration Checkout : 2 → 0.
- Services Checkout testables : 0 → 2 orchestrateurs derrière 1 module.
- Tâches Phase 6 terminées : inchangé, 2/10.
- Progression globale : inchangée, 35/138 tâches, soit environ 25 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Décider si le correctif borné du cycle de vie de `ProfileLoadCoordinator` est autorisé, puis relancer l'E2E checkout plateforme avant de clôturer l'extraction Checkout.

## Entrée — 2026-07-17 — Clôture de l'extraction Checkout

### Travail effectué

- Caractérisation du cycle setup-cleanup-setup de React Strict Mode dans les tests du coordinateur de chargement de profil.
- Ajout d'un réarmement explicite `mount()` au `ProfileLoadCoordinator`, appelé au début de l'effet d'authentification de `useClientDashboard`.
- Conservation de l'invalidation de version dans `unmount()` afin que les réponses antérieures au nettoyage ou au changement d'identité restent obsolètes.
- Revalidation complète du service Checkout, des contrats de route, du webhook inchangé et des deux parcours E2E locaux.
- Mise à jour de `docs/BILLING_CHECKOUT_SERVICE.md` et clôture de la tâche Phase 6.

### Tâches cochées

- Phase 6 : « Extraire le service Checkout » — terminée.
- Progression Phase 6 : 2/10 → 3/10 tâches.

### Décisions prises

- `mount()` modifie uniquement le drapeau de cycle de vie ; il ne change ni utilisateur actif, ni version, ni état métier.
- `unmount()` continue d'incrémenter la version et d'annuler l'état en vol, ce qui empêche toute réponse obsolète d'être appliquée.
- Le correctif ne modifie ni la logique paywall, ni les décisions profil absent/erreur, ni la portée du cache.
- Les routes Checkout, metadata, URLs, plans, prix et réponses publiques restent inchangés après l'extraction.

### Problèmes rencontrés

- Le lint complet de `useClientDashboard.ts` expose toujours ses 33 erreurs `no-explicit-any` et 2 warnings historiques. La seule ligne ajoutée est l'appel typé `profileLoadCoordinator.mount()` ; tous les nouveaux fichiers et tests sont lintés sans erreur.
- Les exécutions Next locales réécrivent temporairement `supabase/.temp/cli-latest`, résidu restauré avant validation finale.

### Risques ou dette restante

- Les clés d'idempotence Checkout reposent toujours sur l'heure courante.
- La création Stripe et les écritures Supabase associées ne sont pas transactionnelles et nécessitent la future réconciliation.
- La création d'un customer coach peut précéder un échec de persistance locale.
- L'avertissement Supabase sur l'usage de l'objet issu de `getSession()` dans le dashboard reste hors de cette tranche.

### Tests exécutés

- Tests ciblés profil et Checkout : 6 fichiers, 88 assertions vertes.
- Suite complète `npm test` : 53 fichiers, 622 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur le coordinateur, les routes, le service et les tests : vert.
- Dette lint historique de `useClientDashboard.ts` mesurée séparément : 33 erreurs et 2 warnings inchangés.
- E2E checkout plateforme : vert en 21,7 s.
- E2E checkout coach : vert en 15,6 s.
- Webhook et migrations SQL inchangés.

### Mesures avant/après

- Cycle Strict Mode supporté explicitement : non → oui.
- E2E Checkout verts : coach uniquement → plateforme et coach.
- Tâches Phase 6 terminées : 2/10 → 3/10.
- Progression globale : 35/138 → 36/138 tâches, soit environ 26 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire le service Stripe Connect.

## Entrée — 2026-07-17 — Extraction du service Stripe Connect

### Travail effectué

- Audit de la création/réutilisation du compte Express, des liens d'onboarding, de la lecture de statut, des consommateurs coach, du checkout coach, du webhook et des champs Connect du profil.
- Création de `lib/billing/connect` avec contrats, décisions d'autorité, orchestration onboarding/statut et adaptateur Stripe expurgeant les erreurs fournisseur.
- Réduction de `/api/stripe/connect` à l'authentification, la validation d'identité, le contrôle du rôle, les adaptateurs Supabase et le mapping HTTP legacy.
- Migration de `/api/stripe/check-account` vers la factory Supabase serveur et relecture de `stripe_account_id` depuis le profil coach authentifié.
- Ajout de tests purs du service, de tests de route statut et de scénarios Connect supplémentaires pour profil absent et erreur Stripe sensible.
- Documentation du contrat dans `docs/BILLING_CONNECT_SERVICE.md` et mise à jour de l'inventaire des constructions Supabase legacy.

### Tâches cochées

- Phase 6 : « Extraire le service Stripe Connect » — terminée.
- Progression Phase 6 : 3/10 → 4/10 tâches.

### Décisions prises

- Le `coachId` du body reste accepté pour compatibilité mais doit égaler l'identité obtenue par `auth.getUser()` ; `email`, `existingAccountId` et `accountId` navigateur sont ignorés comme autorités.
- Le client service-role n'est créé qu'après authentification, égalité d'identité, lecture du profil et validation du rôle coach.
- Le compte existant du profil est prioritaire ; l'écriture conditionnelle et la relecture gèrent une création concurrente sans écraser le gagnant.
- La lecture de statut utilise exclusivement `profiles.stripe_account_id` côté serveur.
- Les erreurs Stripe deviennent `PROVIDER_ERROR` et ne renvoient jamais le message fournisseur.

### Problèmes rencontrés

- Le compteur statique des constructions Supabase legacy est passé de 54 à 53 après migration de `check-account`; son test et sa documentation ont été ajustés.
- `stripe_onboarding_complete` reste utilisé par le webhook et les interfaces sans exister dans les migrations ou types canoniques, contrairement à `stripe_account_id`.

### Risques ou dette restante

- Les consommateurs coach recopient encore historiquement certains champs Connect depuis le navigateur après retour Stripe ; ces écritures ne sont pas une autorité et restent à retirer dans une tranche dédiée.
- Création du compte Stripe et persistance Supabase ne sont pas transactionnelles malgré idempotence et garde concurrente.
- Aucun E2E dédié à l'onboarding Connect n'exerce le fournisseur réel ; les E2E checkout utilisent un compte Connect synthétique déjà configuré.
- La vérification de statut n'atteste pas à elle seule l'autorisation de facturer un client ni l'existence d'une relation active.

### Tests exécutés

- Tests ciblés Connect et checkout coach : 5 fichiers, 56 assertions vertes.
- Suite complète `npm test` : 55 fichiers, 641 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur les deux routes, le service et les tests : vert.
- `git diff --check` vert.
- Contrôle de périmètre : webhook, migrations SQL et RLS inchangés ; checkout coach non modifié, donc E2E non requis dans cette tranche.

### Mesures avant/après

- Routes contenant l'orchestration Connect : 2 → 0.
- Services Connect testables : 0 → 2 opérations derrière un port commun.
- Constructions Supabase legacy suivies : 54 → 53.
- Tâches Phase 6 terminées : 3/10 → 4/10.
- Progression globale : 36/138 → 37/138 tâches, soit environ 27 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire les handlers métier du webhook.

## Entrée — 2026-07-17 — Extraction des handlers métier du webhook Stripe

### Travail effectué

- Audit de la signature, du claim atomique, des états durables, des relectures Stripe, de la validation des metadata, des mutations Billing et du mapping HTTP du webhook.
- Extraction des cinq handlers supportés dans `lib/billing/webhook`, derrière un port Stripe et un repository Supabase testables.
- Conservation dans la route de la lecture du corps brut, de la vérification de signature, du claim/replay, du classement `skipped`, de la finalisation durable et du mapping HTTP legacy.
- Ajout de tests unitaires directs pour les checkouts plateforme/coach, les metadata invalides, la propriété serveur, les abonnements, renouvellements, annulations et l'onboarding Connect.
- Documentation de la frontière, de l'idempotence et des limites dans `docs/BILLING_WEBHOOK_HANDLERS.md`.

### Tâches cochées

- Phase 6 : « Extraire les handlers métier du webhook » — terminée.
- Progression Phase 6 : 4/10 → 5/10 tâches.

### Décisions prises

- Le claim et la finalisation restent hors du service métier afin de préserver une seule autorité durable autour de `event.id`.
- Les Checkout Sessions, Subscriptions et Invoices restent relus depuis Stripe avant mutation ; `account.updated` conserve l'objet signé existant.
- Les metadata ne sont jamais une autorité isolée : profil, rôle, paiement préparé ou relation coach active sont vérifiés côté serveur.
- Une erreur de lecture PostgreSQL lors d'un renouvellement devient un échec retentable au lieu d'être confondue avec un profil absent.

### Problèmes rencontrés

- Les UUID synthétiques initiaux de la nouvelle suite ne respectaient pas le contrat strict de metadata ; ils ont été remplacés par des UUID de test valides.
- Aucun changement de migration n'était nécessaire : les RPC de claim/finalisation existantes restent l'autorité de concurrence.

### Risques ou dette restante

- Les mutations profil/paiement d'un événement ne sont pas transactionnelles et nécessitent toujours une réconciliation Billing.
- Le message d'échec durable historique doit rester borné et ne jamais accueillir un payload fournisseur.
- La centralisation complète des metadata et de l'idempotence reste à réaliser.

### Tests exécutés

- Tests webhook ciblés : 2 fichiers, 30 assertions vertes.
- Tests Stripe checkout/webhook de compatibilité : 4 fichiers, 66 assertions vertes avant ajout de la suite service.
- Intégration PostgreSQL `stripe-webhook-claims.sql` verte avec transaction annulée et aucun résidu.
- Suite complète `npm test` : 56 fichiers, 647 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur la route, le service et les tests : vert.
- `git diff --check` vert.
- Contrôle de périmètre : migrations, Checkout et Connect inchangés.

### Mesures avant/après

- Handlers métier inline dans la route : 5 → 0.
- Handlers métier testables derrière des ports : 0 → 5.
- Tâches Phase 6 terminées : 4/10 → 5/10.
- Progression globale : 37/138 → 38/138 tâches, soit environ 28 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Centraliser metadata et idempotence.

## Entrée — 2026-07-17 — Centralisation des metadata Stripe et de l'idempotence Billing

### Travail effectué

- Audit des producteurs et consommateurs de metadata dans Checkout, Webhook, tests, faux Stripe local et documentation.
- Centralisation des builders plateforme, coach, subscription et customer, des clés canoniques et du parseur strict dans `lib/stripe/metadata.ts`.
- Création de `lib/billing/idempotency.ts` pour les clés Checkout, les résultats de claim webhook et la cible de conflit `stripe_event_id`.
- Migration des services Checkout et Webhook vers ces contrats sans modifier les valeurs envoyées à Stripe ni les réponses publiques.
- Renforcement du faux Stripe et des deux E2E pour observer et vérifier l'en-tête d'idempotence des Checkout Sessions.
- Documentation du contrat et de ses limites dans `docs/BILLING_STRIPE_CONTRACTS.md`.

### Tâches cochées

- Phase 6 : « Centraliser metadata et idempotence » — terminée.
- Progression Phase 6 : 5/10 → 6/10 tâches.

### Décisions prises

- Les metadata de checkout acceptent exactement un contrat plateforme ou coach ; toute clé manquante, additionnelle ou incompatible est refusée.
- Les noms legacy `clientId`, `coachId`, `planId`, `subType` et `type` ainsi que toutes leurs valeurs restent inchangés.
- Les clés Checkout temporelles sont centralisées sans prétendre fournir une idempotence métier durable.
- `event_id` reste l'autorité du claim durable ; `payments.stripe_event_id` reste la cible de conflit des écritures idempotentes.
- Les metadata ne remplacent jamais les vérifications serveur du profil, du rôle, du paiement ou de la relation active.

### Problèmes rencontrés

- Le SDK Stripe produit une clé automatique pour la création Customer ; elle ne fait pas partie du contrat Billing MoovX. L'E2E vérifie uniquement la clé explicite de la Checkout Session.
- Les premiers tests directs des handlers utilisaient une forme plateforme partielle ; ils ont été migrés vers le builder canonique.

### Risques ou dette restante

- Deux clics à des millisecondes différentes produisent toujours deux clés Checkout distinctes.
- La création Stripe et l'écriture locale du paiement plateforme ne sont pas transactionnelles.
- Les mutations multiples d'un handler webhook nécessitent toujours une réconciliation Stripe/base.
- Les metadata Connect sont un contrat séparé et restent hors de cette tranche.

### Tests exécutés

- Tests metadata/idempotence, Checkout et Webhook ciblés : 6 fichiers, 84 assertions vertes.
- Contrôle standalone metadata centralisé : 9/9 cas verts, sans réimplémentation locale.
- Suite complète `npm test` : 57 fichiers, 659 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur les contrats, services, route, faux fournisseur, E2E et tests : vert.
- E2E checkout plateforme vert en 23,7 s avec clé `checkout-{userId}-{planId}-{nowMs}` vérifiée.
- E2E checkout coach vert en 24,2 s avec clé `coach-checkout-{clientId}-{coachId}-{nowMs}` vérifiée.
- `git diff --check` vert ; aucune migration SQL modifiée.

### Mesures avant/après

- Builders de metadata Checkout dispersés : 2 dans le service → 0 hors module central.
- Formats de clés Checkout assemblés inline : 2 → 0.
- Contrats invalides avec clés inconnues acceptés : oui → non.
- Tâches Phase 6 terminées : 5/10 → 6/10.
- Progression globale : 38/138 → 39/138 tâches, soit environ 28 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer la réconciliation Stripe/base.

## Entrée — 2026-07-17 — Premier audit de réconciliation Stripe/base

### Travail effectué

- Audit des événements webhook durables, paiements, autorités Stripe des profils, flux Checkout/Connect et frontières admin existantes.
- Création de `lib/billing/reconciliation` avec types explicites, service d'audit pur, repository local read-only et port Stripe normalisé.
- Détection des claims `failed` ou `processing` anciens, paiements manquants ou incohérents, customers/subscriptions divergents, checkouts sans webhook et comptes Connect incomplets.
- Ajout de références opaques, limites de volume, rapport partiel sur panne fournisseur et refus de propager toute erreur Stripe brute.
- Aucun endpoint ajouté : l'audit reste une primitive serveur injectable sans correction automatique.
- Documentation du périmètre, des recommandations et des limites dans `docs/BILLING_RECONCILIATION.md`.

### Tâches cochées

- Phase 6 : « Créer la réconciliation Stripe/base » — terminée.
- Progression Phase 6 : 6/10 → 7/10 tâches.

### Décisions prises

- La première version est strictement read-only ; les ports n'exposent aucune méthode de mutation.
- Les lectures sont bornées à 100 éléments par défaut et 500 au maximum ; le rapport est borné à 200 écarts par défaut et 500 au maximum.
- Les IDs locaux et Stripe sont remplacés par des empreintes opaques dans le rapport.
- Une absence Stripe est un écart déterministe ; une indisponibilité fournisseur rend le rapport partiel mais n'interrompt pas les autres contrôles.
- Aucune route admin n'est créée avant de définir une procédure d'exécution, d'autorisation et de réparation explicite.

### Problèmes rencontrés

- Les types Supabase canoniques ne reflètent toujours pas toutes les colonnes checkout historiques de `payments`; l'adaptateur reste compatible avec le schéma réellement consommé sans introduire de migration.
- Les créations Customer Stripe reçoivent une idempotence SDK distincte du contrat Checkout et ne servent pas d'autorité de rapprochement.

### Risques ou dette restante

- L'audit ne couvre qu'une fenêtre bornée et ne garantit pas l'exhaustivité historique.
- Il ne répare, rejoue ou supprime aucun état divergent.
- Refunds, disputes et invoices non supportés restent hors du modèle actuel.
- Les mutations multi-tables du webhook ne sont toujours pas transactionnelles.
- Une future commande admin devra créer service-role et Stripe uniquement après contrôle d'identité explicite.

### Tests exécutés

- Tests réconciliation et compatibilité webhook ciblés : 3 fichiers, 43 assertions vertes.
- Suite complète `npm test` : 58 fichiers, 672 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur le service, les adaptateurs et les tests : vert.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route publique/admin, migration, Checkout, Webhook ou Connect modifié.

### Mesures avant/après

- Service de réconciliation : absent → audit read-only injectable.
- Familles d'écarts détectées : 0 → 7 sources structurées.
- Mutations accessibles depuis le service : 0.
- Tâches Phase 6 terminées : 6/10 → 7/10.
- Progression globale : 39/138 → 40/138 tâches, soit environ 29 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Tester replay, concurrence et événements désordonnés.

## Entrée — 2026-07-17 — Replay, concurrence et événements Stripe désordonnés

### Travail effectué

- Audit des garanties existantes de claim durable, replay `failed`, finalisation tardive et déduplication par `event.id`/`stripe_event_id`.
- Ajout d'un test PostgreSQL avec deux connexions réellement concurrentes réclamant le même événement et nettoyage systématique des données synthétiques.
- Ajout de scénarios métier stateful couvrant une ancienne mise à jour, une ancienne suppression, une invoice tardive et un checkout tardif.
- Restriction des mutations d'abonnement au couple d'autorité serveur `(stripe_customer_id, stripe_subscription_id)` au lieu du customer seul.
- Relecture de la subscription courante avant tout octroi ou renouvellement d'accès ; seuls `active` et `trialing` accordent l'accès.
- Séparation explicite du fait financier et de l'accès : une invoice ou un checkout tardif peut être enregistré sans réactiver une subscription annulée.
- Documentation du contrat, des commandes et des limites dans `docs/BILLING_WEBHOOK_ORDERING.md`, avec mise à jour du document des handlers.

### Tâches cochées

- Phase 6 : « Tester replay, concurrence et événements désordonnés » — terminée.
- Progression Phase 6 : 7/10 → 8/10 tâches.

### Décisions prises

- L'autorité d'une mutation subscription est le couple customer/subscription relu depuis Stripe et confronté au profil courant.
- L'ordre de livraison n'est pas déduit d'un horodatage global inexistant ; un ancien objet ne peut agir sur une subscription de remplacement.
- Une observation de paiement n'accorde jamais à elle seule un accès produit.
- Une invoice sans référence de subscription vérifiable échoue de manière retentable au lieu de rechercher un bénéficiaire par customer seul.
- Le protocole de claim reste dans la route/RPC ; le service métier ne duplique pas l'idempotence durable.

### Problèmes rencontrés

- Les handlers subscription et invoice retrouvaient auparavant les profils par customer seul : un événement ancien pouvait écraser l'état d'une nouvelle subscription.
- Le premier lancement PostgreSQL depuis le sandbox ne pouvait pas ouvrir la connexion locale ; la commande autorisée sur Supabase local a ensuite validé le scénario.

### Risques ou dette restante

- Les mutations profil/paiement d'un même événement ne sont toujours pas transactionnelles.
- Refunds, disputes et plusieurs variantes d'invoices restent hors du périmètre supporté.
- Une invoice legacy sans autorité subscription devient retentable et doit être diagnostiquée par la réconciliation.
- La suite couvre les types de webhook actuellement supportés, pas un ordre global que Stripe ne garantit pas entre tous les objets.

### Tests exécutés

- Tests webhook ciblés : 3 fichiers, 34 assertions vertes.
- Claims PostgreSQL séquentiels : `tests/integration/stripe-webhook-claims.sql` vert.
- Claims PostgreSQL réellement concurrents : `tests/integration/stripe-webhook-concurrency.sh` vert, exactement un `claimed`, un `already_processing` et une ligne durable avant nettoyage.
- Suite complète `npm test` : 59 fichiers, 676 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur service, repository et tests modifiés : vert.
- `git diff --check` vert.
- Contrôle de périmètre : aucune migration, policy RLS, route Checkout/Connect ou contrat HTTP public modifié.

### Mesures avant/après

- Test de claim réellement parallèle : absent → présent.
- Mutations subscription filtrées par customer seul : 2 → 0.
- Scénarios d'ordre métier stateful dédiés : 0 → 4.
- Tâches Phase 6 terminées : 7/10 → 8/10.
- Progression globale : 40/138 → 41/138 tâches, soit environ 30 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire les routes Stripe à des adaptateurs HTTP.

## Entrée — 2026-07-17 — Routes Stripe réduites à des adaptateurs HTTP

### Travail effectué

- Audit des six routes Stripe publiques/admin : taille, auth, validation, accès Supabase, création Stripe, mapping legacy et logs.
- Extraction des repositories Checkout plateforme et coach hors des routes, avec création service-role toujours bornée au serveur et paresseuse pour le checkout plateforme.
- Extraction du repository de claim `stripe_account_id` du flux Connect ; la lecture du profil et le contrôle coach restent dans la route avant service-role.
- Extraction du protocole durable webhook (claim, replay, dispatch et finalisation) dans `lib/billing/webhook/delivery.ts`, tout en conservant raw body et signature dans la route.
- Extraction de la création historique des deux produits et quatre prix vers `lib/billing/products` sans rendre `setup-products` artificiellement idempotent.
- Conservation sans modification de `check-account`, déjà conforme comme adaptateur de 36 lignes.
- Ajout d'un inventaire statique des six routes et de tests purs du service produits.
- Documentation des frontières, mesures, compatibilités et limites dans `docs/BILLING_HTTP_ADAPTERS.md`.

### Tâches cochées

- Phase 6 : « Réduire les routes Stripe à des adaptateurs HTTP » — terminée.
- Progression Phase 6 : 8/10 → 9/10 tâches.

### Décisions prises

- Authentification, contrôle d'autorité préalable, parsing HTTP, signature Stripe et mapping des réponses legacy restent dans les routes.
- Les requêtes métier et mutations Supabase sont portées par des repositories injectés, sauf les lectures de profil Connect soumises à la session/RLS qui établissent l'autorité avant service-role.
- Le webhook conserve `req.text()` et `webhooks.constructEvent` dans la frontière HTTP ; seul le cycle durable post-signature est extrait.
- `setup-products` conserve exactement ses prix, produits, réponse et comportement non idempotent historique.
- Aucun contrat ApiResponse commun n'est imposé à ces routes tant que leurs consommateurs dépendent des formes legacy.

### Problèmes rencontrés

- Le lancement Next E2E annonce une mise à jour de `tsconfig.json` pour `.next-e2e`, mais aucune différence suivie n'est restée après les scénarios.
- `connect` atteint exactement le seuil cible de 80 lignes car son contrôle d'autorité serveur et son mapping d'erreurs restent volontairement explicites.

### Risques ou dette restante

- Le mapping d'erreurs reste spécifique à chaque route pour préserver les contrats publics historiques.
- `setup-products` demeure non idempotent et doit être traité dans une tranche dédiée si cette route reste nécessaire opérationnellement.
- Les mutations multi-tables du webhook ne sont pas transactionnelles.
- Le cycle de vie complet des abonnements, remboursements et annulations reste à documenter.

### Tests exécutés

- Tests Stripe/Billing ciblés : 11 fichiers, 122 assertions vertes.
- Claims webhook PostgreSQL séquentiels et réellement concurrents : verts.
- E2E checkout plateforme : vert, 1 scénario en 16,8 s.
- E2E checkout coach : vert, 1 scénario en 14,6 s.
- Suite complète `npm test` : 61 fichiers, 684 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur routes, services, repositories et tests modifiés : vert.
- `git diff --check` vert.
- Contrôle documentaire : liens internes valides.
- Contrôle de périmètre : aucune migration SQL, policy RLS, metadata, clé d'idempotence, URL, prix ou E2E modifié.

### Mesures avant/après

- Routes auditées : 6/6.
- Routes effectivement allégées : 5 ; route déjà conforme inchangée : 1 (`check-account`).
- Taille cumulée des six routes : 451 → 312 lignes.
- Routes au-dessus de 80 lignes : 4 → 0.
- Tâches Phase 6 terminées : 8/10 → 9/10.
- Progression globale : 41/138 → 42/138 tâches, soit environ 30 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Documenter le cycle de vie des abonnements.

## Entrée — 2026-07-17 — Cycle de vie des abonnements et clôture de Phase 6

### Travail effectué

- Consolidation documentaire des deux cycles Billing : abonnement plateforme (client mensuel/annuel, lifetime ponctuel et Coach Pro) et accompagnement coach/client via Connect.
- Inventaire des états Stripe, projections legacy, états webhook et états seulement cibles, sans les présenter comme tous persistés.
- Description des transitions checkout, relecture Stripe, invoice payée, mise à jour/annulation, paiement tardif, ordre différent, replay et réconciliation.
- Cartographie des autorités : Stripe, session serveur, relation active, claims webhook, `profiles`, `payments`, entitlements futurs et cache non autoritaire.
- Documentation explicite de l'indépendance métier des cycles et de sa limite actuelle : les deux contrats partagent encore des champs legacy de `profiles`.
- Ajout d'une procédure de rollback/dégradation qui maintient le webhook des subscriptions existantes et interdit le retour aux autorités navigateur ou aux anciennes permissions RLS.
- Création de `docs/BILLING_SUBSCRIPTION_LIFECYCLE.md` et ajout d'un lien depuis le modèle métier Billing.

### Tâches cochées

- Phase 6 : « Documenter le cycle de vie des abonnements » — terminée.
- Progression Phase 6 : 9/10 → 10/10 tâches ; Phase 6 clôturée.
- Phase active suivante : Phase 3 — Domaine Training et exécution de séance.

### Décisions prises

- `trialing` Stripe peut accorder l'accès après relecture, mais reste projeté comme `active` dans le modèle legacy actuel.
- `invited`, `beta` et `lifetime` sont des sources d'accès legacy, pas des subscriptions récurrentes interchangeables.
- Les statuts Stripe autres que `active` ou `trialing`, y compris inconnus, sont fail-closed pour l'octroi d'accès.
- Le paiement et l'accès restent deux faits séparés, y compris lors d'une invoice ou d'un checkout tardif.
- La future séparation persistée devra suivre expand → comparaison/double lecture → bascule → contract ; aucune table implicite n'est déclarée livrée.

### Problèmes rencontrés

- Le schéma legacy ne matérialise pas deux subscriptions indépendantes : Coach Pro et accompagnement coach/client traversent encore des champs partagés de `profiles`.
- Les périodes locales de renouvellement sont estimées à 30/365 jours au lieu d'utiliser systématiquement les bornes Stripe.
- Certains états sont acceptés ou propagés depuis Stripe sans transition produit dédiée ; la documentation distingue donc état fournisseur, projection locale et effet d'accès.

### Risques ou dette restante

- `setup-products` reste non idempotent.
- Les mutations webhook multi-tables ne sont pas transactionnelles.
- Aucun entitlement explicite n'est persisté.
- Refunds, disputes, annulations planifiées et reprises après impayé restent incomplets.
- La réconciliation ne corrige rien automatiquement et sa vérification sans divergence en préproduction reste une étape opérationnelle avant déploiement.
- Le faux Stripe local ne couvre pas toute la sémantique du fournisseur réel.

### Tests exécutés

- Aucun test applicatif exécuté : tranche strictement documentaire.
- `git diff --check` vert.
- Vérification automatisée des liens internes des documents modifiés : verte.
- Contrôle de périmètre : seuls `docs/`, `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` sont modifiés ; aucun fichier `app/`, `lib/`, `tests/`, `e2e/` ou `supabase/migrations` touché.

### Mesures avant/après

- Cycles d'abonnement consolidés dans un document opérationnel : 0 → 2.
- Tâches Phase 6 terminées : 9/10 → 10/10.
- Progression globale : 42/138 → 43/138 tâches, soit environ 31 %.
- Phase active : Phase 6 → Phase 3.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Cartographier les formats de programme existants.

## Entrée — 2026-07-17 — Cartographie des formats Training existants

### Travail effectué

- Audit des migrations, types Supabase générés, seeds, scripts, routes, hooks, composants et tests qui produisent ou consomment des programmes, séances, exercices et données de progression.
- Création de `docs/TRAINING_FORMATS_INVENTORY.md` avec la cartographie des tables, des formats JSON persistés, des formats IA/tableur, des adaptateurs implicites et des historiques d'exécution.
- Description séparée des modèles coach `training_programs`, affectations `client_programs`, programmes personnels `custom_programs`, catalogues d'exercices, calendrier, exécutions détaillées, complétions d'affectation et records.
- Inventaire des divergences de noms, types primitifs, colonnes utilisées hors schéma canonique, duplications et accès Supabase directs.
- Revue des policies Training existantes et consignation des risques liés aux relations coach historiques ou inactives, sans modification RLS.

### Tâches cochées

- Phase 3 : « Cartographier les formats de programme existants » — terminée.
- Progression Phase 3 : 0/27 → 1/27 tâche.

### Décisions prises

- La cartographie distingue les lignes SQL, leurs colonnes JSON libres et les projections runtime ; aucun format legacy n'est déclaré canonique.
- `training_programs.program`, `client_programs.program` et `custom_programs.days` sont traités comme trois contrats distincts tant qu'un modèle commun et ses adaptateurs ne sont pas définis.
- Les tableaux de jours, objets hebdomadaires français et enveloppes `{ days, split, duration }` doivent rester lisibles pendant la transition future.
- `completed_sessions` et `workout_sessions` représentent deux historiques différents ; leur fusion éventuelle nécessite un contrat explicite plutôt qu'un renommage mécanique.
- Les écarts de colonnes ne doivent pas être corrigés par ajout opportuniste avant audit de compatibilité et stratégie de migration.

### Problèmes rencontrés

- Les colonnes JSON Training n'ont ni schéma PostgreSQL ni type TypeScript structurel généré.
- Les composants redéfinissent plusieurs interfaces locales et utilisent quatre clés de nom d'exercice, deux clés de repos et deux marqueurs de jour de repos.
- Le code utilise notamment `client_programs.program_name`, `client_programs.week_start` et `workout_sessions.date`, absents du schéma canonique généré.
- La planification, l'exécution détaillée et la complétion d'une affectation ne partagent pas de transaction ni de lien complet.

### Risques ou dette restante

- Absence de modèle Training canonique et d'adaptateurs testés entre formats legacy.
- Absence de repositories programmes, séances et exercices ; accès Supabase directs nombreux.
- Couverture limitée des compatibilités producteur → consommateur et absence d'E2E Training complet.
- Policies coach de certaines tables fondées sur des identifiants mémorisés ou une relation sans contrôle explicite de statut actif ; contrat RLS Training à tester avant correction.
- Fréquence réelle des variantes JSON inconnue sans jeu de données anonymisé dédié.

### Tests exécutés

- Aucun test applicatif exécuté : tranche strictement documentaire.
- `git diff --check` vert.
- Vérification des liens internes du nouveau document : verte.
- Contrôle de périmètre : seuls `docs/TRAINING_FORMATS_INVENTORY.md`, `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` sont modifiés ; aucun fichier applicatif, test, E2E, migration ou policy touché.

### Mesures avant/après

- Sources de vérité Training explicitement cartographiées : 0 → 10 familles de tables/projections.
- Formats de programme persistés principaux documentés : 0 → 4 (modèle coach enveloppé, affectation tableau, affectation hebdomadaire, programme personnel tableau).
- Tâches Phase 3 terminées : 0/27 → 1/27.
- Progression globale : 43/138 → 44/138 tâches, soit environ 32 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir le modèle Training canonique.

## Entrée — 2026-07-17 — Définition du modèle Training canonique

### Travail effectué

- Relecture de la cartographie Training, du schéma Supabase généré, des migrations, policies, producteurs IA/import et consommateurs applicatifs.
- Création de `docs/TRAINING_CANONICAL_MODEL.md`, contrat métier indépendant de React, Next.js et Supabase.
- Définition des objets catalogue, programme, semaine, jour, séance prescrite, bloc, exercice prescrit, séries/repos, progression, affectation, exécution, complétion et record.
- Formalisation des identités, ownership, provenance, unités, versions, snapshots et états canoniques.
- Définition des invariants structurels, d'autorité et d'historique, ainsi que des erreurs fail-closed sur les formats inconnus.
- Identification de huit adaptateurs legacy attendus et d'une stratégie expand → adaptateurs/double lecture → persistance additive → bascule progressive.
- Documentation des repositories, services, matrices RLS et E2E nécessaires avant toute migration.

### Tâches cochées

- Phase 3 : « Définir le modèle Training canonique » — terminée.
- Progression Phase 3 : 1/27 → 2/27 tâches.

### Décisions prises

- Le modèle canonique est d'abord un contrat documentaire ; aucun type strict n'est ajouté avant les fixtures et adaptateurs capables de prouver sa compatibilité avec les données legacy.
- Un programme, une affectation, une séance prescrite et une exécution sont quatre objets distincts et versionnés.
- Tout programme possède un owner explicite, y compris la plateforme ; `null` ne confère aucune autorité.
- Les répétitions, durées, distances, charges, efforts et repos utilisent des unions discriminées et des unités canoniques.
- Une référence d'exercice utilise un UUID catalogue/custom avec snapshot, ou une référence `legacy` explicitement isolée ; aucun rapprochement de nom silencieux.
- Une affectation contient un snapshot et une révision : modifier un template ne réécrit pas automatiquement les affectations ni les exécutions passées.
- Les formats inconnus sont rejetés ou mis en quarantaine, jamais complétés silencieusement.

### Problèmes rencontrés

- L'absence de fixtures représentatives interdit encore de démontrer qu'un type TypeScript strict accepterait honnêtement toutes les données actuelles.
- Les concepts de séance prescrite, occurrence planifiée, exécution détaillée et marqueur de complétion sont mélangés dans les tables et composants actuels.
- Les phases Excel/IA, les chaînes de répétitions/repos et les références par nom demandent des décisions de conversion explicites.

### Risques ou dette restante

- Les adaptateurs legacy et schémas Zod ne sont pas encore implémentés.
- Aucune extraction anonymisée ne mesure la fréquence des formats ou valeurs inconnus.
- Repositories Training, matrices RLS et E2E Training restent à créer.
- Les quatre formats persistés, les doubles historiques et les champs hors schéma généré restent inchangés.
- Les policies coach fondées sur un identifiant mémorisé ou une relation non explicitement active restent à caractériser et renforcer.

### Tests exécutés

- Aucun test applicatif exécuté : tranche documentaire sans modèle TypeScript ni changement de comportement.
- `git diff --check` vert.
- Vérification automatisée des liens internes du document et de la roadmap : verte.
- Contrôle de périmètre : seuls `docs/TRAINING_CANONICAL_MODEL.md`, `ROADMAP_CODEX.md` et `SESSION_LOG_CODEX.md` sont modifiés ; aucun fichier `app/`, `lib/`, `tests/`, `e2e/` ou `supabase/migrations` touché.

### Mesures avant/après

- Objets métier canoniques définis : 0 → 15 familles principales.
- Formats legacy dotés d'un identifiant d'adaptateur attendu : 0 → 8.
- Tâches Phase 3 terminées : 1/27 → 2/27.
- Progression globale : 44/138 → 45/138 tâches, soit environ 33 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les adaptateurs legacy ↔ canonique.

## Entrée — 2026-07-17 — Adaptateurs Training legacy vers canonique

### Travail effectué

- Création d'un modèle TypeScript pur minimal dans `lib/training/model.ts`, limité aux objets nécessaires pour tester les conversions.
- Implémentation d'adaptateurs read-only dans `lib/training/adapters` pour les huit formats legacy contractuels : modèle coach, deux affectations client, programme personnel, deux imports, historique workout et marqueur de complétion.
- Ajout de projections complémentaires pour la sortie IA structurée, le calendrier legacy et les records personnels.
- Conversion explicite des exercices catalogue/custom/legacy, prescriptions de répétitions/AMRAP/durée/distance, repos, séries, jours, séances, affectations et exécutions.
- Ajout d'une union `AdapterResult` distinguant `converted` de `legacyUnsupported`, avec warnings structurés et champs non mappés.
- Ajout de fixtures synthétiques locales et de tests de conversion, ordre, provenance, ownership, warnings, isolation, immutabilité et architecture pure.
- Création de `docs/TRAINING_LEGACY_ADAPTERS.md` pour documenter l'API, les décisions de mapping, les pertes et les limites.

### Tâches cochées

- Phase 3 : « Créer les adaptateurs legacy ↔ canonique » — terminée.
- Progression Phase 3 : 2/27 → 3/27 tâches.

### Décisions prises

- Les huit identifiants de formats documentés sont exposés par `CORE_LEGACY_FORMATS` et vérifiés par test.
- Calendrier, sortie IA et record sont des projections complémentaires ; ils ne remplacent pas les huit formats persistés du contrat initial.
- Un owner coach est obligatoire pour un template coach ; un owner client est obligatoire pour un programme personnel, IA ou importé.
- Une référence catalogue/custom explicite est conservée ; un nom seul devient une référence legacy avec warning, jamais un rapprochement catalogue inventé.
- Une contradiction d'identité, une cible incompréhensible, un jour ambigu ou une forme inconnue produit `legacyUnsupported`.
- L'absence de repos produit `none` avec warning plutôt qu'une valeur par défaut silencieuse.
- Les adaptateurs ne sont branchés à aucun écran, hook, route ou repository dans cette tranche.

### Problèmes rencontrés

- Les imports Strong/Hevy arrivent déjà agrégés par l'ancien parseur : les charges et répétitions par série originales ne peuvent pas être reconstruites.
- Les phases `p1/p2/p3`, la durée globale, la planification et l'avancement hebdomadaire n'ont pas encore de règle de conversion suffisamment caractérisée.
- Les identifiants déterministes des objets imbriqués servent aux comparaisons mais ne sont pas encore une stratégie UUID persistée.

### Risques ou dette restante

- Les fixtures synthétiques ne mesurent pas la fréquence réelle des variantes en environnement dédié.
- Les adaptateurs ne possèdent pas encore de schémas Zod distincts à leurs frontières.
- Aucun repository, double lecture ou feature flag Training n'utilise encore ces conversions.
- `completed_sessions`, calendrier et records restent sans lien canonique résolu vers une exécution lorsque la source legacy ne le fournit pas.
- Les matrices RLS coach/client Training et les E2E d'affectation/exécution restent à créer.

### Tests exécutés

- Tests ciblés adaptateurs/statiques : 12/12 verts.
- Suite Vitest complète : 63 fichiers, 696 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur le modèle, les adaptateurs, fixtures et tests : vert.
- `git diff --check` vert.
- Vérification des liens internes : verte.
- Contrôle statique : aucun import React, Next, Supabase, navigateur ou `app/`, aucun appel réseau et aucune écriture base dans le module.
- Contrôle de périmètre : aucun fichier `app/`, route, E2E, migration ou policy RLS modifié.

### Mesures avant/après

- Formats legacy centraux avec adaptateur testé : 0 → 8.
- Projections complémentaires pures : 0 → 3.
- Tests unitaires/statiques ajoutés : 12.
- Tâches Phase 3 terminées : 2/27 → 3/27.
- Progression globale : 45/138 → 46/138 tâches, soit environ 33 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Renforcer les tests de progression et normalisation.

## Entrée — 2026-07-17 — Renforcement progression et normalisation Training

### Travail effectué

- Audit de `compute-progression`, `program-week`, `equipment-normalize`, `build-program-params`, du modèle canonique et des adaptateurs legacy.
- Ajout de tests de limites pour le parsing des répétitions, les increments par famille d'exercice, les valeurs de charge non finies, accélérations RIR, deload et stagnation.
- Ajout de tests pour les équipements legacy, mappings inverses, classification home-friendly, paramètres de génération et overrides sans mutation.
- Ajout de tests déterministes du calcul de semaine avec horloge contrôlée, dates avant/après programme et entrées invalides.
- Extension des tests d'adaptateurs aux weekdays anglais, phases `p1/p2/p3` non converties, stabilité de sortie et prescriptions durée/distance/repos.
- Ajout préalable de tests de régression rouges, puis corrections bornées aux fonctions pures concernées.

### Tâches cochées

- Phase 3 : « Renforcer les tests de progression et normalisation » — terminée.
- Progression Phase 3 : 3/27 → 4/27 tâches.

### Décisions prises

- `parseRepsTarget` accepte uniquement un entier positif exact ou une plage ordonnée ; les suffixes arbitraires, plages inversées et nombres non finis sont rejetés.
- Une charge de référence non finie ne produit jamais une recommandation de progression.
- Les noms français accentués comme « Élévations » suivent le pas isolation de 1,25 kg.
- `getEffectiveWeek` revient au compteur stocké, ou à 1, lorsqu'une date ou une borne de semaine est invalide.
- « Battle Ropes » suit le mapping `band` déjà annoncé par la documentation du module.
- Les phases legacy racine et exercice produisent désormais des warnings `unmapped_field` ; elles ne sont toujours pas converties silencieusement.

### Problèmes rencontrés

- Le premier passage a confirmé que `parseInt` acceptait `10abc` et une plage inversée comme cibles valides.
- Une charge `NaN` pouvait produire une recommandation `progress` avec un poids `NaN`.
- Une date de démarrage invalide produisait une semaine effective `NaN`.
- Le commentaire de normalisation annonçait « Battle Ropes » → `band`, mais la valeur manquait dans le mapping.
- Les phases `p1/p2/p3` étaient ignorées par les adaptateurs sans warning structuré.

### Risques ou dette restante

- Les règles RIR restent marquées « à valider par un coach » dans le code métier.
- Les phases `p1/p2/p3` sont détectées mais toujours non converties.
- Les tests reposent sur des fixtures synthétiques et ne mesurent pas encore les variantes réelles d'un environnement dédié.
- Les repositories Training, matrices RLS et E2E d'exécution restent à construire.
- La logique de génération Anthropic elle-même n'est pas appelée : les tests restent volontairement purs et sans réseau.

### Tests exécutés

- Tests Training ciblés : 5 fichiers, 86/86 tests verts.
- Suite Vitest complète : 65 fichiers, 727 tests actifs verts et 3 `todo`.
- Inventaire `vitest list tests/unit` : 730 tests déclarés, dont 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur les modules et tests Training concernés : vert, sans warning.
- `git diff --check` vert.
- Contrôle de périmètre : aucun fichier `app/`, route, E2E, migration ou policy RLS modifié.
- Aucun accès réseau ni service distant.

### Mesures avant/après

- Tests actifs globaux : 696 → 727.
- Tests ciblés progression/normalisation/adaptateurs : 86 verts.
- Régressions pures corrigées : parsing répétitions, poids non fini, semaine invalide, classification accentuée, mapping Battle Ropes et warnings de phases.
- Tâches Phase 3 terminées : 3/27 → 4/27.
- Progression globale : 46/138 → 47/138 tâches, soit environ 34 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les repositories programmes, séances et exercices.

## Entrée — 2026-07-17 — Repositories Training programmes, séances et exercices

### Travail effectué

- Lecture du modèle canonique, des adaptateurs, des contrats Supabase/repositories, des types générés et de l'inventaire RLS.
- Audit des accès directs Training dans `app/` et `lib/`, y compris les projections wildcard, les historiques concurrents et les colonnes runtime absentes des types générés.
- Création de trois repositories injectables pour programmes, séances/progression et exercices.
- Ajout de projections TypeScript explicites sur `training_programs`, `client_programs`, `custom_programs`, `workout_sessions`, `completed_sessions`, `personal_records`, `exercises_db` et `custom_exercises`.
- Ajout de 12 méthodes read-only avec scope owner/client, ordres déterministes, limite catalogue bornée, résultat `not_found` et erreurs Supabase expurgées.
- Documentation du contrat d'autorité, des limites RLS, des divergences de schéma et du report volontaire des mutations.

### Tâches cochées

- Phase 3 : « Créer les repositories programmes, séances et exercices » — terminée.
- Progression Phase 3 : 4/27 → 5/27 tâches.

### Décisions prises

- Les repositories reçoivent exclusivement un `DatabaseClient` injecté et ne construisent aucun client browser/server/admin.
- Les paramètres `coachUserId`, `clientUserId` et `ownerUserId` bornent les requêtes mais ne constituent jamais une preuve d'identité ; l'appelant doit les dériver d'une session vérifiée ou s'appuyer sur la RLS.
- Les JSON `program`, `days` et `phases` restent des snapshots legacy et doivent être passés aux adaptateurs avant emploi canonique.
- Aucune méthode de mutation n'est exposée avant schémas d'entrée et matrices RLS Training : ajouter maintenant des writes figerait les JSON libres et les policies coach non caractérisées.
- Aucun `listSessionsForProgram` artificiel n'est créé : les séances prescrites restent imbriquées dans les JSON ; seule la complétion liée par `program_id` est interrogeable sans ambiguïté.
- Les colonnes runtime absentes des types générés sont exclues au lieu d'être castées ou inventées.

### Problèmes rencontrés

- Les accès applicatifs Training restent nombreux et plusieurs utilisent encore `select('*')`.
- `workout_sessions` et `completed_sessions` restent deux historiques sans identité canonique commune.
- `client_programs.program_name`, `client_programs.week_start`, `workout_sessions.date` et `workout_sessions.personal_records` sont consommés par du code legacy mais absents du schéma généré.

### Risques ou dette restante

- Les repositories ne sont pas encore branchés dans l'application ; les accès directs existants restent inchangés.
- Les matrices RLS Training owner/coach/client actif restent à écrire avant d'exposer des mutations.
- Les repositories read-only ne valident pas eux-mêmes la relation coach/client active ; cette autorité reste à composer côté serveur et en RLS.
- `workout_sets`, planification et mutations programmes/exercices nécessiteront des contrats séparés lors des extractions suivantes.
- Les JSON libres ne possèdent toujours pas de validation Zod à la frontière repository.

### Tests exécutés

- Tests repositories Training ciblés : 6/6 verts.
- Suite Vitest complète : 66 fichiers, 733 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur les repositories et leur test : vert.
- `git diff --check` vert.
- Vérification des liens documentaires internes : verte.
- Contrôle statique : aucun `select('*')`, constructeur Supabase, import React/Next/`app`, client admin ou `service_role` dans les repositories.
- Contrôle de périmètre : aucun fichier `app/`, route, E2E, migration ou policy RLS modifié.

### Mesures avant/après

- Repositories Training : 0 → 3.
- Méthodes de lecture centralisées : 0 → 12.
- Tables couvertes par projections explicites : 0 → 8.
- Tests actifs globaux : 727 → 733.
- Tâches Phase 3 terminées : 4/27 → 5/27.
- Progression globale : 47/138 → 48/138 tâches, soit environ 35 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire session/profil de `useClientDashboard`.

## Entrée — 2026-07-17 — Extraction session/profil du dashboard client

### Travail effectué

- Audit du cycle Auth/session, du profil, du cache owner-scoped, des redirections onboarding, du retry, du chargement agrégé et des accès Supabase directs de `useClientDashboard`.
- Création de `createSessionProfileLoader`, frontière injectable composant repositories identité/profil, cache et `ProfileLoadCoordinator`.
- Déplacement hors du hook de la vérification `auth.getUser()`, de l'acceptation/invalidation du cache, de la décision profil présent/absent/erreur et de la détection des réponses obsolètes.
- Conservation dans le hook de la session réactive, de l'application des données agrégées et des états UI existants.
- Adaptation des gardes statiques de chargement profil et de stratégie cache.
- Ajout de tests unitaires pour identité vérifiée, session absente, profil trouvé/absent, erreur, profil confirmé conservé, cache croisé, réponse obsolète, retry, concurrence et cycle Strict Mode.

### Tâches cochées

- Phase 3 : « Extraire session/profil de `useClientDashboard` » — terminée.
- Progression Phase 3 : 5/27 → 6/27 tâches.

### Décisions prises

- Une session réactive issue de `getSession` reste nécessaire au hook, mais aucune lecture profil/cache ne démarre avant confirmation de l'identité par `IdentityRepository.getCurrent()` (`auth.getUser`).
- Un écart entre l'identité vérifiée et l'utilisateur demandé rend la réponse obsolète ; il ne déclenche ni requête profil ni redirection.
- Le coordinateur reste détenu par la frontière extraite et son lease demeure actif jusqu'à la fin du chargement agrégé, afin de protéger aussi les effets asynchrones suivants.
- Une session absente ou une panne Auth est récupérable et ne peut jamais être interprétée comme un profil absent.
- Le cache n'est accepté que si `ownerUserId` et `profileData.id` correspondent à l'identité vérifiée ; un cache legacy ou croisé est supprimé.
- La lecture agrégée et les accès Training/Nutrition restent hors périmètre de cette tranche.

### Problèmes rencontrés

- Le test d'inventaire cache attendait encore l'appel `isDashboardCacheOwnedBy` directement dans le hook ; il a été adapté pour vérifier la nouvelle frontière.
- ESLint complet du hook expose toujours 33 erreurs `no-explicit-any` et 2 warnings d'imports inutilisés historiques ; les nouveaux fichiers et tests sont verts et aucun nouvel `any` n'a été ajouté.
- L'E2E signale les warnings Next.js historiques sur les qualités d'images et l'avertissement Supabase lié à `getSession`; la frontière profil utilise désormais explicitement `getUser` avant lecture.

### Risques ou dette restante

- Le hook reste volumineux et conserve le chargement agrégé direct, dont un `profiles.select('*')` utilisé pour hydrater les champs dashboard après confirmation d'existence.
- Programmes, séances, nutrition, mesures, coach link et analytics restent orchestrés directement dans `fetchAll`.
- Les logs Auth client historiques contiennent encore des détails de navigation et ne sont pas traités dans cette tranche.
- La dette TypeScript `any` et les imports inutilisés du hook devront être réduits au fil des extractions spécialisées.

### Tests exécutés

- Tests ciblés session/profil/dashboard/cache : 29 tests verts avant suite complète.
- Suite Vitest complète : 67 fichiers, 740 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur la nouvelle frontière, le coordinateur et les tests : vert.
- ESLint du hook : aucune nouvelle dette, 33 erreurs `any` et 2 warnings historiques toujours présents.
- E2E default-coach Chromium local : 1/1 vert en 9,0 s, un worker.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, migration, policy RLS ou scénario E2E modifié.

### Mesures avant/après

- Frontières session/profil testables : 0 → 1.
- Cas unitaires ajoutés : 7.
- Tests actifs globaux : 733 → 740.
- Tâches Phase 3 terminées : 5/27 → 6/27.
- Progression globale : 48/138 → 49/138 tâches, soit environ 36 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire programmes et séances de `useClientDashboard`.

## Entrée — 2026-07-17 — Extraction programmes/séances du dashboard client

### Travail effectué

- Audit des lectures Training de `useClientDashboard` : affectations coach, programme personnel actif, séances et séries, complétions, existence d'un entraînement et dates d'historique.
- Création de `createTrainingDashboardLoader`, frontière injectable composant les repositories programmes et séances sans construire de client Supabase.
- Ajout de projections explicites et bornées pour le programme personnel actif, les séances dashboard avec séries, l'existence d'une séance terminée et les dates d'entraînement.
- Délégation du chargement Training initial depuis `useClientDashboard`, en conservant les formes legacy attendues par l'interface et le cache owner-scoped existant.
- Suppression du chargement initial de deux lectures Training inutilisées (`training_programs` templates et `user_programs`) sans modifier les handlers ou mutations restants.
- Ajout de tests unitaires et statiques pour le succès, l'absence de données, les erreurs expurgées, le scope client vérifié, l'ordre, les bornes, les complétions, les records et l'absence de mutation.
- Documentation du premier consommateur applicatif des repositories Training et des limites maintenues hors périmètre.

### Tâches cochées

- Phase 3 : « Extraire programmes et séances de `useClientDashboard` » — terminée.
- Progression Phase 3 : 6/27 → 7/27 tâches.

### Décisions prises

- Le loader reçoit uniquement un identifiant client déjà vérifié et des repositories injectés ; cet identifiant borne les requêtes mais ne remplace jamais l'autorité de la session ou de la RLS.
- Les données restent dans les formes legacy consommées par le dashboard ; seul le snapshot coach passe par l'adaptateur borné `normalizeCoachProgram`, sans bascule générale vers le modèle canonique.
- Une absence confirmée produit des valeurs vides distinctes d'une erreur repository récupérable ; les messages Supabase bruts ne remontent pas au hook.
- Les lectures sont bornées à 90 séances, 50 complétions et 400 dates afin d'éviter un chargement dashboard non limité.
- Les records personnels restent accessibles par une méthode dédiée du loader et sont chargés par le flux analytics existant afin d'éviter une requête initiale dupliquée.
- Le calendrier planifié, les mutations Training et les autres domaines du dashboard restent volontairement hors de cette tranche.

### Problèmes rencontrés

- Le schéma généré ne décrit pas toutes les colonnes runtime historiques utilisées par le dashboard, notamment certaines dates de séance ; les projections restent donc bornées aux contrats réellement observés.
- `workout_sessions` et `completed_sessions` demeurent deux historiques distincts sans identité canonique commune.
- ESLint complet de `useClientDashboard` signale toujours 33 erreurs `no-explicit-any` et 2 warnings d'imports inutilisés historiques ; aucun nouvel `any` n'a été introduit par l'extraction.

### Risques ou dette restante

- `useClientDashboard` reste à 725 lignes et conserve les chargements nutrition, mesures, photos, diagnostic, coach et analytics ainsi que plusieurs mutations Training directes.
- Les matrices RLS Training détaillées et la validation Zod des snapshots JSON legacy restent à construire.
- La planification calendrier et l'unification des historiques devront disposer de contrats dédiés avant leur migration.
- Les deux lectures supprimées étaient sans consommateur dans le chargement initial ; une caractérisation UI plus large restera nécessaire avant le futur découpage de `TrainingTab`.

### Tests exécutés

- Tests ciblés loaders dashboard et repositories Training : 26/26 verts.
- Suite Vitest complète : 69 fichiers, 750 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur le loader, les repositories et les tests : vert.
- ESLint du hook : dette historique inchangée, 33 erreurs `any` et 2 warnings ; aucun nouvel `any` dans le diff.
- E2E default-coach Chromium local : 1/1 vert en 10,5 s, un worker.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, migration, policy RLS ou scénario E2E modifié.

### Mesures avant/après

- Méthodes de repositories Training : 12 → 16.
- Frontières de chargement Training dashboard : 0 → 1.
- Lectures Supabase Training directes retirées du chargement initial du hook : 7.
- Tests actifs globaux : 740 → 750.
- Tâches Phase 3 terminées : 6/27 → 7/27.
- Progression globale : 49/138 → 50/138 tâches, soit environ 36 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire nutrition et mesures de `useClientDashboard`.

## Entrée — 2026-07-17 — Extraction nutrition/mesures du dashboard client

### Travail effectué

- Audit des lectures nutrition, poids, mensurations, photos de progression, objectifs macro/caloriques et plans alimentaires du dashboard client.
- Création de `createNutritionMeasurementsReaders`, quatre readers Supabase injectables avec projections explicites et limites identiques au chargement legacy.
- Création de `createNutritionMeasurementsLoader`, frontière testable distinguant absence de données et erreur récupérable expurgée.
- Délégation depuis `useClientDashboard` du poids, des mensurations, des photos de progression et du dernier plan alimentaire coach.
- Retrait de la lecture initiale `daily_food_logs` dont le résultat était jeté ; les consommateurs Nutrition spécialisés conservent leur propre chargement du journal.
- Conservation des clés et formes du cache dashboard existant ainsi que des loaders session/profil et Training.
- Ajout de tests unitaires et statiques pour données complètes, absence, erreur, scope client, ordre, projections, bornes, non-mutation et imports interdits.

### Tâches cochées

- Phase 3 : « Extraire nutrition et mesures de `useClientDashboard` » — terminée.
- Progression Phase 3 : 7/27 → 8/27 tâches.

### Décisions prises

- La tranche utilise des readers internes injectables plutôt que de généraliser prématurément quatre repositories de domaine sans contrats de mutation stabilisés.
- L'identifiant client est fourni après vérification de session ; il borne les requêtes mais ne constitue jamais à lui seul une autorité et la RLS reste active.
- Les projections et limites legacy sont conservées : 30 poids par date ascendante, 10 mensurations descendantes, 20 photos descendantes et le dernier plan coach.
- Les objectifs calories/macros restent issus du profil déjà chargé ; aucune seconde source de vérité Nutrition n'est créée.
- Une absence valide retourne des listes vides ou `null`; une erreur Supabase produit uniquement un type borné et les sources concernées, sans message brut.
- Les écritures de poids, mesures et photos ainsi que les écrans Nutrition/Progression restent hors périmètre.

### Problèmes rencontrés

- La requête `daily_food_logs` du chargement initial ne possédait aucun consommateur ; elle a été supprimée plutôt que reproduite dans la nouvelle frontière.
- Plusieurs composants Nutrition et Progression continuent d'accéder directement aux mêmes tables et restent hors de cette extraction.
- ESLint complet de `useClientDashboard` signale toujours 33 erreurs `no-explicit-any` et 2 warnings d'imports inutilisés historiques ; aucun nouvel `any` n'a été ajouté.
- L'E2E conserve les warnings historiques Next.js sur les qualités d'images et Supabase sur `getSession`.

### Risques ou dette restante

- `useClientDashboard` reste à 727 lignes et conserve profil agrégé, diagnostic, coach link, analytics, handlers et mutations de plusieurs domaines.
- Les mutations nutrition/mesures n'utilisent pas encore de repositories ou schémas d'entrée communs.
- Les matrices RLS Nutrition/Progression et l'exposition aux relations coach inactives doivent rester surveillées lors des futurs travaux de domaine.
- `NutritionTab`, `ProgressTab`, `HomeTab` et les hooks analytics effectuent encore des lectures Supabase directes qui ne doivent pas être déplacées sans caractérisation.

### Tests exécutés

- Tests ciblés loaders dashboard session/profil, Training et nutrition/mesures : 31/31 verts.
- Suite Vitest complète : 71 fichiers, 761 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur le loader et ses tests : vert.
- ESLint du hook : dette historique inchangée, 33 erreurs `any` et 2 warnings ; aucun nouvel `any` dans le diff.
- E2E default-coach Chromium local : 1/1 vert en 9,8 s, un worker.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, migration, policy RLS, composant UI ou scénario E2E modifié.

### Mesures avant/après

- Frontières de chargement nutrition/mesures dashboard : 0 → 1.
- Readers injectables bornés : 0 → 4.
- Lectures directes nutrition/mesures retirées de `fetchAll` : 5, dont une sans consommateur.
- Tests actifs globaux : 750 → 761.
- Tâches Phase 3 terminées : 7/27 → 8/27.
- Progression globale : 50/138 → 51/138 tâches, soit environ 37 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire la façade `useClientDashboard` sous 250 lignes.

## Entrée — 2026-07-17 — Réduction de la façade du dashboard client

### Travail effectué

- Mesure puis réduction de `useClientDashboard` de 727 à 203 lignes.
- Extraction de la coordination Auth, cache, profil, Training, nutrition/mesures, diagnostic et relation coach dans `useClientDashboardData`.
- Extraction des actions séance, poids, mensurations, photos, checkout et préférences calendrier dans `useClientDashboardActions`.
- Conservation dans la façade des états React, de la composition des hooks spécialisés, des valeurs calculées et du contrat public retourné aux composants.
- Remplacement des sélections Supabase restantes par des projections explicites sans introduire de client privilégié ni de nouvel `any`.
- Adaptation des inventaires statiques historiques afin qu'ils suivent les responsabilités déplacées sans relâcher leurs garanties de cache, invitation ou assignation coach.
- Ajout d'un garde statique sur la limite de 250 lignes, la délégation, les imports interdits, les wildcards et les principaux champs publics.

### Tâches cochées

- Phase 3 : « Réduire la façade `useClientDashboard` sous 250 lignes » — terminée.
- Progression Phase 3 : 8/27 → 9/27 tâches.

### Décisions prises

- La façade reste l'unique contrat consommé par l'UI ; aucun composant n'a été modifié.
- Les deux nouvelles frontières sont des hooks internes bornés à la coordination et aux actions, plutôt qu'un nouveau contrôleur monolithique de plus de 500 lignes.
- Le cache conserve exactement son propriétaire `ownerUserId`, le contrôle `profileData.id`, sa durée de cinq minutes et ses formes legacy.
- L'identité provient toujours de la session vérifiée et des repositories existants ; les identifiants passés aux loaders bornent les requêtes sans devenir une autorité navigateur.
- Les comportements session/profil, erreur récupérable, onboarding, retry, Strict Mode, Training et nutrition/mesures restent couverts par leurs tests existants.

### Problèmes rencontrés

- Trois tests d'inventaire lisaient encore exclusivement l'ancien fichier du hook ; ils ont été redirigés vers la nouvelle frontière propriétaire de ces responsabilités.
- Le premier lancement E2E a été arrêté avant scénario par l'interdiction sandbox d'accéder au socket Docker ; le même harnais a été relancé avec l'autorisation locale prévue et a réussi.
- Next.js continue d'émettre les avertissements historiques sur les qualités d'images, et Supabase avertit encore sur l'objet issu de `getSession`.

### Risques ou dette restante

- `useClientDashboardData` et `useClientDashboardActions` restent des orchestrateurs transitoires de 340 et 310 lignes ; leurs domaines devront être séparés progressivement sans recréer une façade cachée.
- Diagnostic, relation coach, analytics et mutations de poids/mesures/photos restent en coexistence legacy avec des accès Supabase directs bornés par projections.
- Les formes retournées par le hook restent volontairement legacy ; leur typage pourra être resserré seulement avec des tests de caractérisation des composants consommateurs.
- `TrainingTab`, `WorkoutSession` et `ProgramBuilder` restent les prochaines concentrations majeures du domaine Training.

### Tests exécutés

- Tests ciblés client-dashboard et inventaires associés : verts.
- Suite Vitest complète : 72 fichiers, 765 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur la façade, les deux hooks internes et les tests modifiés : vert, sans désactivation globale.
- E2E default-coach Chromium local : 1/1 vert en 10,6 s, un worker.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, migration, policy RLS, spécification E2E ou composant consommateur modifié.

### Mesures avant/après

- `useClientDashboard.ts` : 727 → 203 lignes.
- Hooks du dépôt au-dessus de 500 lignes : 3 → 2.
- Erreurs ESLint ciblées sur la frontière dashboard modifiée : 33 historiques → 0.
- Tests actifs globaux : 761 → 765.
- Tâches Phase 3 terminées : 8/27 → 9/27.
- Progression globale : 51/138 → 52/138 tâches, soit environ 38 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Écrire les tests de caractérisation de `TrainingTab`.

## Entrée — 2026-07-18 — Caractérisation de `TrainingTab`

### Travail effectué

- Lecture complète de `TrainingTab`, de ses composants enfants, de ses hooks, de ses formats legacy et du socle de tests React disponible.
- Inventaire des huit effets, des accès Supabase directs et des décisions actuelles sur programme coach, programme personnel, séance du jour, repos, complétion et prescriptions.
- Ajout d'une suite de caractérisation par rendu serveur React, avec mocks limités aux frontières Supabase et aux composants périphériques lourds.
- Capture des props réellement produites pour la carte héro, les exercices et la progression afin de tester les décisions de `TrainingTab`, pas seulement la présence d'un rendu.
- Documentation de la frontière couverte et des limites dans `docs/TRAINING_TAB_CHARACTERIZATION.md`.
- Aucun changement de `TrainingTab` ou d'un autre fichier applicatif.

### Tâches cochées

- Phase 3 : « Écrire les tests de caractérisation de `TrainingTab` » — terminée.
- Progression Phase 3 : 9/27 → 10/27 tâches.

### Décisions prises

- Les données coach assignées restent caractérisées dans leur forme legacy, y compris séries, plage de répétitions et repos.
- Le test appelle directement la callback `onStart` produite par le composant et vérifie que les objets de programme résolus sont transmis sans réécriture.
- Les champs optionnels manquants restent acceptés selon les valeurs par défaut actuelles : trois séries et absence de répétitions explicites.
- La priorité programme personnel actif → programme coach, la progression périodisée et le contrat `invited` sont verrouillés statiquement, car ils dépendent d'effets non exécutés pendant le rendu serveur.
- Aucun état artificiel de chargement ou d'erreur n'a été ajouté : `TrainingTab` n'en expose pas actuellement.

### Problèmes rencontrés

- Le premier harnais React Testing Library n'a exécuté aucun test : `jsdom@29` échoue au démarrage sous Node 24 à cause d'un module ESM avec top-level await chargé depuis CommonJS.
- La tranche a été maintenue bornée en utilisant `react-dom/server`, sans modifier dépendances, Vitest ou configuration du dépôt.
- Les effets DOM, minuteurs, stockage local et activations asynchrones ne peuvent pas être exercés avec cette frontière serveur.

### Risques ou dette restante

- `TrainingTab` reste à 1 721 lignes, avec huit effets, de nombreux `any`, plusieurs accès Supabase directs et plusieurs responsabilités UI/métier.
- Les états chargement et erreur sont implicites ; leur formalisation devra être précédée d'un contrat lors des futures extractions.
- L'activation interactive d'un programme personnel, l'édition, les minuteurs et les modales nécessiteront un environnement DOM compatible ou un E2E dédié.
- Les programmes coach et personnels restent deux formats UI distincts malgré la priorité désormais caractérisée.

### Tests exécutés

- Tests ciblés `TrainingTab` : 5/5 verts.
- Suite Vitest complète : 73 fichiers, 770 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur la nouvelle suite : vert.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, migration, policy RLS, spécification E2E, repository ou fichier applicatif modifié.

### Mesures avant/après

- Tests de caractérisation `TrainingTab` : 0 → 5.
- Scénarios caractérisés : vide, coach assigné, prescriptions/démarrage, complété, repos, legacy incomplet et contrats personnel/progression.
- Tests actifs globaux : 765 → 770.
- Tâches Phase 3 terminées : 9/27 → 10/27.
- Progression globale : 52/138 → 53/138 tâches, soit environ 38 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire programme actif et navigation des jours.

## Entrée — 2026-07-18 — Compatibilité du dashboard avec le schéma distant

### Travail effectué

- Correction bornée des deux projections de lecture responsables de l'écran « Profil indisponible ».
- Retrait de `biceps`, `thighs` et `calves` de la projection `body_measurements` utilisée par `NutritionMeasurementsLoader`.
- Retrait de `reminder_enabled` de `DASHBOARD_PROFILE_PROJECTION`.
- Réduction du type `BodyMeasurementRow` aux sept colonnes réellement lues afin que l'absence des colonnes distantes soit explicite côté TypeScript.
- Ajout de tests de non-régression vérifiant les listes exactes de colonnes compatibles.
- Validation distante en lecture seule des deux projections corrigées, sans restitution de contenu personnel.
- Rechargement de l'onglet Chrome existant sur localhost ; aucune donnée, migration ou configuration distante n'a été modifiée.

### Tâches cochées

- Aucune tâche supplémentaire de roadmap : correction de compatibilité incidente au sein de la Phase 3.

### Décisions prises

- Le code s'aligne temporairement sur le schéma effectivement déployé au lieu de créer des colonnes ou d'appliquer une migration pendant un incident de lecture.
- Les autres champs, les formes de cache, les loaders et les décisions dashboard restent inchangés.
- Aucun fallback de données synthétiques n'est ajouté ; les champs absents restent simplement indisponibles dans la projection.
- L'E2E default-coach n'est pas exécuté : son harnais Supabase local ne valide pas le schéma distant concerné et son orchestration est incompatible avec l'interdiction de reset de cette tranche.

### Problèmes rencontrés

- Le schéma distant diverge des migrations et types canoniques : `body_measurements.biceps`, `body_measurements.thighs`, `body_measurements.calves` et `profiles.reminder_enabled` n'y existent pas.
- Chrome a rechargé l'onglet, mais refuse l'inspection booléenne via AppleScript tant que « Autoriser JavaScript dans les événements AppleScript » est désactivé.
- L'alternative via Accessibilité macOS est également refusée à `osascript`; aucune extraction visuelle automatisée du contenu du profil n'a donc été effectuée.

### Risques ou dette restante

- Les migrations/types locaux et le schéma distant doivent être réconciliés dans une tranche dédiée avant de réintroduire ces champs.
- Les préférences de rappel restent modifiables ailleurs dans l'application alors que `profiles.reminder_enabled` est absent du schéma distant ; ce flux n'est pas corrigé dans cette tranche.
- Une confirmation visuelle humaine de l'onglet localhost reste nécessaire, même si les deux requêtes qui produisaient `42703` sont désormais vertes à distance.

### Tests exécutés

- Tests ciblés dashboard/nutrition : 19/19 verts.
- Suite Vitest complète : 73 fichiers, 771 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur les deux loaders/projections et leurs tests : vert.
- `git diff --check` vert.
- Projections distantes corrigées : `profiles` verte, `body_measurements` verte, aucun code PostgreSQL.
- E2E default-coach non exécuté pour respecter l'interdiction de reset et parce qu'il cible Supabase local.

### Mesures avant/après

- Erreurs PostgreSQL `42703` sur les projections dashboard vérifiées : 2 → 0.
- Colonnes demandées par `BODY_MEASUREMENTS_PROJECTION` : 10 → 7.
- Colonnes demandées par `DASHBOARD_PROFILE_PROJECTION` : 68 → 67.
- Tests actifs globaux : 770 → 771.
- Données distantes modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Confirmer visuellement le dashboard existant, puis reprendre « Extraire programme actif et navigation des jours ».

## Entrée — 2026-07-18 — Programme actif et navigation des jours Training

### Travail effectué

- Extraction de la priorité du programme actif dans `lib/training/active-program-day.ts`.
- Conservation du premier programme personnel `is_active`, puis du fallback programme coach, puis de l'état sans programme.
- Extraction de la résolution lundi-premier des jours personnels, des repos explicites ou complétés et des prescriptions périodisées `p1/p2/p3`.
- Extraction des transitions semaine précédente, suivante et retour à aujourd'hui avec leur direction d'animation.
- Branchement borné de `TrainingTab` sur cette frontière pure, sans modifier son rendu ni ses accès aux données.
- Ajout d'une documentation des ambiguïtés legacy conservées et de tests unitaires dédiés.

### Tâches cochées

- Phase 3 : « Extraire programme actif et navigation des jours » — terminée.
- Progression Phase 3 : 10/27 → 11/27 tâches.

### Décisions prises

- Un jour personnel interprétable conserve la priorité même s'il est au repos ou provient du padding historique à sept jours.
- Un programme personnel vide ou un nom de jour non interprétable conserve le fallback coach actuel.
- Un jour coach absent reste une séance vide non marquée comme repos ; aucune nouvelle règle métier n'est inventée.
- La périodisation conserve `getEffectiveWeek`, les seuils `p1/p2/p3`, le fallback `p1` et la conversion legacy des répétitions.
- Les adaptateurs canoniques ne sont pas branchés dans cette tranche.

### Problèmes rencontrés

- Le lint complet de `TrainingTab.tsx` remonte sa dette historique restante : 76 erreurs `no-explicit-any` et 11 avertissements, contre 79 erreurs et 11 avertissements au commit de départ.
- Le lint des nouveaux fichiers et du test de caractérisation est vert ; aucune désactivation ESLint n'a été ajoutée.

### Risques ou dette restante

- Chargement, activation et persistance des programmes personnels restent dans `TrainingTab`.
- Les formats personnel et coach restent distincts et legacy.
- Le padding d'un programme personnel court masque toujours une éventuelle séance coach sur les jours complétés en repos.
- La bibliothèque, l'historique, les modales, l'édition, les minuteurs et les accès Supabase directs restent à extraire.

### Tests exécutés

- Tests ciblés programme actif/navigation et caractérisation `TrainingTab` : 13/13 verts.
- Suite Vitest complète : 74 fichiers, 779 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé sur le module pur et les tests : vert.
- ESLint informatif sur `TrainingTab.tsx` : dette historique réduite de 79 à 76 erreurs ; 11 avertissements avant/après.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, spécification E2E, migration, policy RLS, donnée distante, repository ou accès Supabase modifié.

### Mesures avant/après

- Décisions programme/jour directement dans `TrainingTab` : bloc inline → frontière pure testée.
- Tests actifs globaux : 771 → 779.
- Tâches Phase 3 terminées : 10/27 → 11/27.
- Progression globale : 53/138 → 54/138 tâches, soit environ 39 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire bibliothèque et recherche d'exercices.

## Entrée — 2026-07-18 — Bibliothèque et recherche d'exercices Training

### Travail effectué

- Cartographie des trois contrats actuels de recherche : bibliothèque
  `TrainingTab`, modale serveur et catalogue mixte de `ProgramBuilder`.
- Création de `lib/training/exercise-library.ts`, frontière pure pour la
  normalisation, les noms legacy, le filtrage, l'ordre, les sources et la
  résolution des sélections.
- Branchement de `ExerciseLibrarySection` sur le filtrage partagé, les
  alternatives, les raccourcis du programme et le payload de séance libre.
- Branchement de `ExerciseSearchModal` sur l'isolation des entrées, le filtre
  musculaire exact et le payload d'ajout, sans remplacer son `ilike` serveur.
- Branchement de `ProgramBuilder` sur la combinaison catalogue/personnalisés et
  le filtre historique insensible à la casse.
- Ajout d'une documentation des règles et limites et de deux suites unitaires.

### Tâches cochées

- Phase 3 : « Extraire bibliothèque et recherche d'exercices » — terminée.
- Progression Phase 3 : 11/27 → 12/27 tâches.

### Décisions prises

- Les résultats conservent l'ordre reçu ; aucun tri alphabétique ou score de
  pertinence nouveau n'est ajouté.
- La normalisation ignore la casse et unifie les formes Unicode équivalentes,
  mais ne retire ni accents ni espaces.
- Les alias musculaires restent propres à la bibliothèque principale ; la
  modale garde une égalité exacte et `ProgramBuilder` une égalité sans casse.
- Catalogue et exercice personnel homonymes restent deux choix distincts ;
  aucune déduplication par nom n'est inventée.
- L'équipement reste affiché mais ne devient pas un filtre, car aucun des trois
  écrans concernés ne le filtre actuellement.
- Les entrées dépourvues des quatre noms legacy reconnus sont isolées et ne
  produisent aucune sélection.

### Problèmes rencontrés

- Les trois consommateurs possédaient des règles voisines mais non identiques ;
  une unification naïve aurait changé le filtre musculaire ou la recherche.
- Le lint complet des trois composants historiques reste en dette : 55 erreurs
  et 15 avertissements après extraction, contre 62 erreurs et 15 avertissements
  au commit de départ.

### Risques ou dette restante

- Les lectures Supabase du catalogue restent directes dans `TrainingTab`, la
  modale et `ProgramBuilder`; aucun repository n'est migré dans cette tranche.
- La bibliothèque principale n'affiche toujours pas les exercices personnels.
- La recherche serveur de la modale dépend toujours de `ilike`, de sa collation
  et de sa limite à dix résultats.
- Le remplacement d'alternative reste une mutation directe de
  `custom_programs` dans le composant.
- `TrainingTab`, `ProgramBuilder` et la modale conservent leurs `any` et leurs
  responsabilités historiques hors de la frontière pure.

### Tests exécutés

- Tests ciblés bibliothèque, intégration statique, caractérisation
  `TrainingTab` et navigation : 27/27 verts.
- Suite Vitest complète : 76 fichiers, 793 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint du module pur et des deux nouvelles suites : vert.
- ESLint informatif des composants historiques : 62 → 55 erreurs, 15
  avertissements avant/après.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, spécification E2E, migration, policy
  RLS, donnée distante, repository ou requête/mutation Supabase nouvelle.

### Mesures avant/après

- Logiques de recherche/filtrage inline migrées : 3 consommateurs.
- Tests actifs globaux : 779 → 793.
- Tâches Phase 3 terminées : 11/27 → 12/27.
- Progression globale : 54/138 → 55/138 tâches, soit environ 40 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire historique et séances récentes.

---

## Entrée — 2026-07-18 — Historique et séances récentes Training

### Travail effectué

- Cartographie des sources `workout_sessions`, `workout_sets` et
  `completed_sessions`, de leurs projections repository, du cache des séances
  détaillées et des maps de navigation alimentées par les complétions.
- Création de `lib/training/session-history.ts`, frontière pure chargée du tri
  stable, des limites, des dates, du filtrage legacy, du regroupement des
  séries et des totaux de présentation.
- Délégation depuis `TrainingTab`, `RecentSessionsList` et
  `WorkoutDetailList`, sans modification visuelle ni nouvelle requête.
- Branchement du loader dashboard sur la préparation bornée des marqueurs
  `completed_sessions`, tout en conservant les exécutions détaillées dans une
  collection `workout_sessions` séparée.
- Ajout de la documentation `docs/TRAINING_SESSION_HISTORY.md` et de deux
  suites unitaires, dont un contrôle statique de pureté et d'intégration.

### Tâches cochées

- Phase 3 : « Extraire historique et séances récentes » — terminée.
- Progression Phase 3 : 12/27 → 13/27 tâches.

### Décisions prises

- `workout_sessions`/`workout_sets` et `completed_sessions` restent deux
  historiques indépendants ; aucune fusion ou déduplication par date, nom ou
  index n'est autorisée dans cette frontière.
- Le tri est décroissant par date ; à date égale, l'ordre d'entrée reste le
  départage déterministe afin de préserver le contrat des requêtes existantes.
- Les limites historiques restent 3 séances en aperçu, 20 en vue étendue et
  50 marqueurs de complétion dans le dashboard.
- Les lignes aux dates ou formes inutilisables sont isolées avec un code
  structuré sans faire échouer les entrées valides.
- L'ordre des exercices et séries détaillés reste celui de la requête
  `exercise_name`, puis `set_number`; aucune nouvelle règle de présentation
  n'est introduite.

### Problèmes rencontrés

- `TrainingTab` lit encore la colonne legacy `workout_sessions.date`, absente
  des types Supabase générés, pour les marqueurs calendrier.
- Le lint complet de `TrainingTab` reste bloqué par sa dette historique : 71
  erreurs et 11 avertissements, sans nouvelle infraction introduite par la
  frontière extraite.

### Risques ou dette restante

- La lecture récente et la lecture des séries restent des accès Supabase
  directs dans `TrainingTab` ; leur migration repository est hors périmètre.
- `completed_sessions` ne possède toujours pas de référence vers
  `workout_sessions`; la cohérence croisée n'est donc ni supposée ni réparée.
- Les autres historiques de `HomeTab`, du détail client, des analytics et du
  dashboard desktop conservent leurs transformations locales.
- Les modales de `TrainingTab` restent la prochaine responsabilité à extraire.

### Tests exécutés

- Tests ciblés historique, loader dashboard, caractérisation `TrainingTab`,
  adaptateurs, navigation et bibliothèque : 63/63 verts.
- Suite Vitest complète : 78 fichiers, 809 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé de la frontière, du loader, des composants de présentation et
  des nouvelles suites : vert.
- ESLint informatif de `TrainingTab` : 71 erreurs historiques et 11
  avertissements.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, spécification E2E, migration, policy
  RLS, donnée distante, repository ou nouvelle mutation Supabase modifiée.

### Mesures avant/après

- Logiques d'historique inline extraites : tri/limites/filtre/date, dates
  terminées, regroupement des séries et résumé détaillé.
- Tests actifs globaux : 793 → 809.
- Tâches Phase 3 terminées : 12/27 → 13/27.
- Progression globale : 55/138 → 56/138 tâches, soit environ 41 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire les modales de `TrainingTab`.

---

## Entrée — 2026-07-18 — Extraction des modales de `TrainingTab`

### Travail effectué

- Inventaire des modales, overlays et vues assimilées pilotés par
  `TrainingTab`, avec leurs états, données, callbacks, dépendances et contrats
  mobile/backdrop/scroll.
- Extraction de cinq overlays inline vers des composants typés distincts :
  alerte minuteur, gestionnaire de programmes, aperçu d'import, variantes et
  détail d'historique.
- Conservation dans `TrainingTab` du parsing Excel, des mutations programme,
  des sélections jour/exercice, des accès Supabase et des transitions entre
  modales.
- Ajout de tests React serveur et statiques adaptés à la limite jsdom 29/Node
  24, sans contournement du graphe ESM.
- Documentation de l'organisation et des limites dans
  `docs/TRAINING_TAB_MODALS.md`.

### Tâches cochées

- Phase 3 : « Extraire les modales de `TrainingTab` » — terminée.
- Progression Phase 3 : 13/27 → 14/27 tâches.

### Décisions prises

- Chaque overlay extrait possède son propre composant et son propre contrat ;
  aucun composant générique de modale Training n'est imposé.
- Les composants déjà autonomes (`SessionDetailModal`, `ProgramBuilder`,
  `ExerciseSearchModal`, popups d'exercice et de sauvegarde) ne sont pas
  réécrits dans cette tranche.
- Les transitions incompatibles existantes sont conservées : manager vers
  builder et aperçu import vers démarrage ferment la vue source avant la vue
  cible.
- Aucune exclusivité globale nouvelle n'est inventée entre les états de modale
  historiquement indépendants.
- Le contenu métier de la séance reste dans `TrainingTab`, à l'intérieur de la
  coque déjà dédiée `SessionDetailModal`, afin de ne pas déplacer l'autorité
  d'exécution dans une présentation.

### Problèmes rencontrés

- Les tests DOM interactifs restent indisponibles avec jsdom 29 sous Node 24 ;
  les contrats sont donc vérifiés par rendu React serveur et inventaires
  statiques, conformément à la stratégie de caractérisation existante.
- Les programmes et exercices legacy n'ont pas encore de types frontend
  centraux ; les nouveaux composants utilisent des projections de vue bornées
  et des champs optionnels explicites.

### Risques ou dette restante

- `TrainingTab` reste à 1 493 lignes et conserve le contenu complexe de la
  modale de séance, les effets et les actions métier.
- Les modales historiques déjà dédiées conservent leurs `any` et, pour
  certaines, leurs accès Supabase directs préexistants.
- Il n'existe toujours pas de test navigateur interactif spécifique aux
  modales Training ; les comportements backdrop/callback sont protégés par
  leur structure et les tests serveur/statiques.
- La prochaine tranche doit réduire `TrainingTab` sous 500 lignes sans changer
  ces contrats.

### Tests exécutés

- Tests ciblés modales et caractérisation `TrainingTab` : 15/15 verts.
- Suite Vitest complète : 80 fichiers, 819 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des cinq composants extraits et des deux suites : vert.
- ESLint informatif de `TrainingTab` : 71 erreurs/11 avertissements avant,
  63 erreurs/9 avertissements après.
- `git diff --check` vert.
- Contrôle de périmètre : aucune route, repository, spécification E2E,
  migration, policy RLS, donnée distante ou nouvelle requête/mutation Supabase.

### Mesures avant/après

- `TrainingTab.tsx` : 1 704 → 1 493 lignes.
- Overlays de présentation inline extraits : 5.
- Tests actifs globaux : 809 → 819.
- Tâches Phase 3 terminées : 13/27 → 14/27.
- Progression globale : 56/138 → 57/138 tâches, soit environ 41 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire `TrainingTab` sous 500 lignes.

---

## Entrée — 2026-07-18 — Réduction de la façade `TrainingTab`

### Travail effectué

- Cartographie puis séparation de l'orchestration, de l'aperçu/calendrier, du
  détail de séance, des overlays, de l'éditeur de jour, des cartes d'exercices,
  du minuteur, de la recherche catalogue et de l'historique.
- Conservation de l'export public `TrainingTab`, désormais limité à une façade
  de sept lignes déléguant au contrôleur typé.
- Extraction du contenu métier encore inline dans `SessionDetailModal` vers
  `TrainingProgramDayEditor` et `TrainingSessionExerciseList`.
- Adaptation des gardes de caractérisation à la nouvelle architecture et ajout
  d'une garde statique imposant moins de 500 lignes à chaque frontière.
- Documentation dans `docs/TRAINING_TAB_ARCHITECTURE.md`.

### Tâches cochées

- Phase 3 : « Réduire `TrainingTab` sous 500 lignes » — terminée.
- Progression Phase 3 : 14/27 → 15/27 tâches.

### Décisions prises

- La façade publique ne possède ni état ni accès aux données ; le contrôleur
  conserve les mutations legacy pour éviter un changement fonctionnel.
- Les trois `select('*')` préexistants sont conservés et comptés par test ; aucun
  nouvel accès Supabase n'est ajouté.
- Les overlays et présentations reçoivent uniquement état et callbacks ; ils ne
  deviennent pas une frontière d'autorité.
- Les mises à jour du minuteur déclenchées par effets sont différées au prochain
  tour de boucle sans attente arbitraire afin de respecter les règles React 19.

### Problèmes rencontrés

- Les tests statiques historiques lisaient uniquement `TrainingTab.tsx` ; ils
  ont été adaptés pour lire les frontières responsables après extraction.
- Le premier passage de la suite a révélé un compteur `localStorage` et un
  inventaire historique liés au chemin de fichier ; les attentes ont été mises
  à jour sur la structure réellement mesurée, sans changement de cache.

### Risques ou dette restante

- `TrainingTabController` conserve 35 erreurs et 1 avertissement ESLint
  historiques, contre 63 erreurs et 9 avertissements avant la tranche ; toutes
  les nouvelles frontières sont vertes individuellement.
- Les types legacy du contrôleur restent larges et les accès `custom_programs`
  et `exercises_db` ne passent pas encore par les repositories.
- Aucun E2E n'a été modifié ; le comportement mobile repose sur les mêmes
  handlers tactiles, minuteurs et callbacks qu'avant.

### Tests exécutés

- Tests ciblés TrainingTab/Training : 52/52 verts.
- Suite Vitest complète : 81 fichiers, 825 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des nouvelles frontières : vert.
- ESLint informatif de l'orchestrateur : 35 erreurs/1 avertissement, dette en
  baisse par rapport à 63 erreurs/9 avertissements.
- `git diff --check` et contrôle de périmètre exécutés en validation finale.

### Mesures avant/après

- `TrainingTab.tsx` : 1 493 → 7 lignes.
- Plus grande frontière extraite : 454 lignes.
- Composants de plus de 1 000 lignes : 5 → 4.
- Tests actifs globaux : 819 → 825.
- Tâches Phase 3 : 14/27 → 15/27.
- Progression globale : 57/138 → 58/138, soit environ 42 %.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Décrire les états et transitions de `WorkoutSession`.

---

## Entrée — 2026-07-18 — Cycle de vie legacy de `WorkoutSession`

### Travail effectué

- Audit en lecture de `WorkoutSession`, des contrôleurs Training, des actions du
  dashboard client, des repositories, des types générés, des migrations et des
  tests liés aux séances.
- Inventaire des états réellement observables, des transitions, de leurs
  préconditions et de leurs sources d'autorité.
- Distinction explicite entre l'enveloppe `moovx_active_workout`, le brouillon
  détaillé `moovx_workout_draft`, l'historique `workout_sessions`/`workout_sets`,
  le marqueur `completed_sessions` et la planification `scheduled_sessions`.
- Formalisation du cycle de sauvegarde non transactionnel, de ses échecs
  partiels et des divergences avec `SessionExecution` canonique.
- Création de `docs/TRAINING_WORKOUT_SESSION_LIFECYCLE.md` avec table de
  transitions, diagramme d'état, invariants et migration progressive.

### Tâches cochées

- Phase 3 : « Décrire les états et transitions de `WorkoutSession` » — terminée.
- Progression Phase 3 : 15/27 → 16/27 tâches.

### Décisions prises

- Les états documentés sont des noms d'audit et non une machine persistée que le
  code posséderait déjà.
- Le moteur plein écran et la séance rapide de `TrainingTab` restent décrits
  comme deux flux distincts ; aucune fusion implicite n'est proposée.
- La cible doit introduire une identité d'exécution stable, un brouillon lié à
  l'owner et une finalisation idempotente avant toute bascule canonique.

### Problèmes rencontrés

- `moovx_active_workout` ne contient que l'enveloppe de lancement ; la
  progression détaillée est conservée séparément dans `moovx_workout_draft`.
- `finish()` n'attend pas `onFinish`, et la chaîne de finalisation supprime les
  caches avant de confirmer les écritures serveur.
- La finalisation met à jour plusieurs tables et services sans transaction ni
  clé d'idempotence commune.

### Risques ou dette restante

- Une panne partielle peut produire une session sans séries, une planification
  terminée sans session détaillée, ou un marqueur coach absent.
- Un double appel peut dupliquer `workout_sessions` et `completed_sessions`.
- Les caches de reprise ne sont ni owner-scoped ni versionnés.
- `workout_sessions` et `completed_sessions` n'ont aucune référence commune ;
  le flux rapide de `TrainingTab` ne crée pas de `workout_sets`.

### Tests exécutés

- Aucun test applicatif : tranche documentaire et d'audit uniquement.
- Vérification des états/transitions contre le code, des clés `localStorage`,
  des noms de tables et de leurs colonnes générées.
- Vérification des liens internes, du périmètre documentaire et
  `git diff --check` : verts.

### Mesures avant/après

- Tâches Phase 3 : 15/27 → 16/27.
- Progression globale : 58/138 → 59/138, soit environ 43 %.
- Code applicatif, tests, E2E, migrations et RLS modifiés : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Écrire les tests de transitions de séance.

---

## Entrée — 2026-07-18 — Caractérisation des transitions de séance

### Travail effectué

- Centralisation sans changement de contrat des deux clés de séance dans la
  frontière pure `lib/training/workout-session-storage.ts`.
- Ajout de tests déterministes pour l'enveloppe active, le brouillon détaillé,
  leur restauration, expiration, nettoyage, immutabilité et absence d'owner.
- Exercice direct de `useClientDashboardActions` avec Supabase, stockage,
  horloge et dépendances injectés/simulés, sans navigateur, réseau ni base.
- Vérification de l'ordre `workout_sessions` → `scheduled_sessions` →
  `workout_sets` → `scheduled_sessions` → `completed_sessions`.
- Caractérisation des pannes partielles et de la répétition actuellement non
  idempotente, sans corriger ces comportements.
- Gardes statiques sur le repos, les mutations de séries, l'abandon, le flux
  rapide sans `workout_sets` et l'absence de lien entre les deux historiques.
- Mise à jour de `docs/TRAINING_WORKOUT_SESSION_LIFECYCLE.md` avec la couverture
  obtenue et ses limites.

### Tâches cochées

- Phase 3 : « Écrire les tests de transitions de séance » — terminée.
- Progression Phase 3 : 16/27 → 17/27 tâches.

### Décisions prises

- La sérialisation locale est extraite sans ajouter owner, version ou nouvelle
  validation afin de caractériser exactement le legacy.
- Les actions dashboard sont testées directement : malgré son nom, cette
  frontière n'invoque aucun hook React et accepte déjà Supabase par injection.
- Le minuteur React reste couvert statiquement tant que jsdom 29 / Node 24 rend
  son exécution DOM fragile ; aucun contournement ESM n'est ajouté.

### Problèmes rencontrés

- Un `savedAt` invalide est accepté aujourd'hui : la date produit `NaN` et la
  comparaison d'expiration ne rejette pas le brouillon. Le test le caractérise
  sans le corriger.
- La première suite complète a détecté une garde d'inventaire attachée aux
  anciens fichiers ; elle pointe désormais vers la frontière centralisée.

### Risques ou dette restante

- Finalisation non transactionnelle et non idempotente, caches supprimés avant
  confirmation de l'écriture racine et erreurs partielles sans état dédié.
- Caches locaux non owner-scoped, non versionnés et brouillon à date invalide
  accepté.
- Le flux rapide ne crée toujours pas de `workout_sets`.
- Les transitions interactives du minuteur ne disposent pas encore d'un modèle
  pur exécutable ; cette extraction est la prochaine tranche.

### Tests exécutés

- Tests nouveaux et transitions ciblés : 22/22 verts.
- Tests Training ciblés : 87/87 verts.
- Suite Vitest complète : 84 fichiers, 847 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert après validation des types de fixtures.
- ESLint des nouveaux fichiers et tests : vert. `WorkoutSession.tsx` conserve
  sa dette historique de 33 erreurs et 22 avertissements, sans nouvelle
  désactivation. `git diff --check` et contrôle de périmètre : verts.

### Mesures avant/après

- Tests actifs globaux : 825 → 847.
- Tâches Phase 3 : 16/27 → 17/27.
- Progression globale : 59/138 → 60/138, soit environ 43 %.
- Routes, E2E, migrations et RLS modifiés : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire le modèle pur de session.

---

## Entrée — 2026-07-18 — Modèle pur de session d'entraînement

### Travail effectué

- Création de `lib/training/workout-session-model.ts`, sans dépendance UI,
  navigateur, stockage ou Supabase.
- Modélisation discriminée des phases `prepared`, `in-progress`, `resting`,
  `rest-complete` et `abandoned`.
- Types purs pour séance, exercice, série, repos, refus de transition et
  snapshot de finalisation.
- Ajout de transitions immuables pour démarrage, séries, exercices, repos,
  abandon et préparation de la finalisation.
- Adaptateur legacy explicite isolant les entrées inconnues ou sans nom.
- Horloge injectée pour lancement, repos, fin de repos et abandon.
- Migration représentative du lancement dashboard et du calcul d'échéance de
  repos dans `WorkoutSession`, sans toucher à la chaîne SQL.
- Documentation des frontières UI, stockage et persistance dans le cycle de vie.

### Tâches cochées

- Phase 3 : « Extraire le modèle pur de session » — terminée.
- Progression Phase 3 : 17/27 → 18/27 tâches.

### Décisions prises

- La réussite SQL n'est pas un état du modèle pur : elle reste inconnue tant que
  le service de sauvegarde non transactionnel n'a pas confirmé ses écritures.
- `done`, modales et alertes restent de l'état de présentation ; les échéances
  de repos appartiennent au modèle métier/minuteur.
- L'adaptateur legacy conserve une copie des champs source et refuse les formes
  inconnues plutôt que d'inventer un exercice valide.
- Les IDs par défaut sont déterministes et locaux au modèle ; ils ne prétendent
  pas être des UUID persistants.

### Problèmes rencontrés

- Une garde statique initiale confondait `Array.from` avec un appel Supabase
  `.from`; elle a été resserrée sur les appels de table réels.
- L'état UI et la persistance sont encore concentrés dans `WorkoutSession` ; ils
  ne sont pas déplacés artificiellement dans le modèle pur.

### Risques ou dette restante

- Finalisation SQL non transactionnelle et non idempotente, sans lien entre les
  deux historiques.
- Caches non owner-scoped/non versionnés et `savedAt` invalide toujours accepté.
- Le minuteur, l'audio et le wake lock restent couplés au composant React.
- Le modèle n'est pas encore la source unique de l'état React complet ; seuls
  deux consommateurs représentatifs sont migrés dans cette tranche.

### Tests exécutés

- Tests modèle et transitions ciblés : 36/36 verts.
- Tests Training ciblés : 101/101 verts.
- Suite Vitest complète : 86 fichiers, 861 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint du modèle, de ses tests et de l'action dashboard : vert ;
  `WorkoutSession.tsx` conserve 33 erreurs et 22 avertissements historiques.
- Liens internes, `git diff --check` et contrôle de périmètre : verts.

### Mesures avant/après

- Tâches Phase 3 : 17/27 → 18/27.
- Progression globale : 60/138 → 61/138, soit environ 44 %.
- Tests actifs globaux : 847 → 861.
- Nouvelles requêtes ou mutations Supabase : 0.
- Routes, E2E, migrations et RLS modifiés : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire timer, audio et wake lock.

---

## Entrée — 2026-07-18 — Runtime de séance et effets navigateur

### Travail effectué

- Inventaire des deux minuteurs Training : runtime plein écran fondé sur une
  échéance absolue et minuteur rapide `TrainingTab` fondé sur un décompte.
- Création de `lib/training/workout-runtime.ts`, contrôleur pur à horloge et
  scheduler injectés pour durée écoulée, repos, avertissement et fin unique.
- Création de ports typés pour audio, vibration, wake lock et visibilité, avec
  adaptateurs navigateur isolés dans `workout-runtime-browser.ts`.
- Création du hook étroit `useWorkoutRuntime` et migration de
  `WorkoutSession` hors de ses intervalles de repos, listeners visibilité,
  sons planifiés et gestion directe du wake lock.
- Réutilisation des ports audio/vibration/wake lock par le minuteur rapide et
  `useWakeLock`, sans fusionner leurs algorithmes distincts.
- Nettoyage explicite à l'annulation, au redémarrage, à la finalisation, à
  l'abandon et au démontage ; double setup/cleanup Strict Mode caractérisé.
- Mise à jour du cycle de vie de séance avec frontières, comportements
  conservés et minuteurs de présentation laissés volontairement hors runtime.

### Tâches cochées

- Phase 3 : « Extraire timer, audio et wake lock » — terminée.
- Progression Phase 3 : 18/27 → 19/27 tâches.

### Décisions prises

- Le runtime plein écran conserve le tick à 200 ms et l'échéance absolue ; le
  minuteur rapide conserve son décompte à la seconde pour éviter un changement
  fonctionnel implicite.
- Le calcul d'échéance continue d'utiliser `createWorkoutRestPeriod` du modèle
  pur ; le contrôleur runtime ne duplique pas cette règle.
- Les API navigateur absentes ou refusées sont fail-soft : la séance continue,
  mais aucun effet ou verrou n'est conservé après cleanup.
- Redirection post-séance, alertes de présentation, célébration, debounce et
  tempo restent hors du runtime car ils ne partagent ni audio de repos ni wake
  lock.

### Problèmes rencontrés

- Le test statique du modèle pur attendait son ancien consommateur direct dans
  `WorkoutSession`; il vérifie désormais le chemin explicite
  `WorkoutSession` → runtime → modèle pur.
- Le typage des ports autorise un effet synchrone ou asynchrone ; `useWakeLock`
  normalise donc les deux formes avec `Promise.resolve` avant expurgation des
  refus.

### Risques ou dette restante

- La sauvegarde SQL reste non transactionnelle et non idempotente, sans lien
  durable entre `workout_sessions` et `completed_sessions`.
- Les caches restent sans owner/version et un `savedAt` invalide est toujours
  accepté, conformément au périmètre.
- `WorkoutSession.tsx` reste volumineux et conserve 31 erreurs et 22
  avertissements ESLint historiques ; la tranche réduit toutefois de deux les
  erreurs historiques sans désactivation.
- Les minuteurs strictement visuels restent locaux et devront être revus avec
  leurs composants respectifs, pas absorbés par le runtime métier.

### Tests exécutés

- Tests runtime, modèle, transitions et Training ciblés : 55/55 verts lors de
  la validation ciblée.
- Suite Vitest complète : 88 fichiers, 872 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des nouveaux fichiers, ports, hooks et tests : vert.
- Dette `WorkoutSession` avant/après : 33 erreurs/22 avertissements → 31
  erreurs/22 avertissements.
- `git diff --check`, recherche d'effets navigateur directs et contrôle de
  périmètre routes/E2E/migrations/RLS : verts.

### Mesures avant/après

- Tâches Phase 3 : 18/27 → 19/27.
- Progression globale : 61/138 → 62/138, soit environ 45 %.
- Tests actifs globaux : 861 → 872.
- Nouvelles requêtes ou mutations Supabase : 0.
- Routes, E2E, migrations et RLS modifiés : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire sauvegarde et synchronisation.

---

## Entrée — 2026-07-18 — Sauvegarde et synchronisation des séances

### Travail effectué

- Cartographie de la sauvegarde locale, du flux détaillé dashboard et du flux
  rapide `TrainingTab`, y compris nettoyages, rafraîchissements et erreurs
  partielles.
- Création de `lib/training/workout-persistence/` avec service pur, types de
  résultats discriminés et adaptateur Supabase séparé.
- Injection explicite des ports `workout_sessions`, `workout_sets`,
  `completed_sessions`, `scheduled_sessions`, synchronisation profil, stockage
  local et horloge.
- Migration de `onFinishWorkout` vers le service tout en conservant l'ordre des
  écritures, les effets gamification/records/badges et le rafraîchissement UI.
- Migration du flux rapide vers `persistQuickWorkout`, toujours sans écriture
  `workout_sets`.
- Création de `workout-draft-sync.ts` pour sauvegarde, restauration et abandon
  du brouillon avec stockage et horloge injectés ; branchement de
  `WorkoutSession` sur cette frontière.
- Documentation du double update planning, des nettoyages précoces et de la
  future frontière d'idempotence/réconciliation.

### Tâches cochées

- Phase 3 : « Extraire sauvegarde et synchronisation » — terminée.
- Progression Phase 3 : 19/27 → 20/27 tâches.

### Décisions prises

- L'ordre legacy est conservé : cache actif, session racine, premier planning,
  effets annexes, séries, effets annexes, second planning, profil puis marqueur
  de complétion.
- Le double update `scheduled_sessions` reste caractérisé comme dette ; il
  n'est pas corrigé pendant l'extraction.
- Les erreurs fournisseur sont converties en codes stables sans message SQL ou
  donnée personnelle. Les états partiels indiquent explicitement qu'une future
  réconciliation est nécessaire.
- L'échec profil reste bloquant avant `completed_sessions`, conformément au
  comportement précédent ; les autres erreurs non bloquantes laissent la chaîne
  legacy continuer.
- La suppression de `moovx_active_workout` reste best-effort avant la première
  écriture et le brouillon reste supprimé avant l'appel de finalisation.
- Aucun mécanisme d'idempotence n'est ajouté : un double appel produit toujours
  deux sessions et, si applicable, deux marqueurs.

### Problèmes rencontrés

- Trois tests statiques recherchaient les tables directement dans le hook ; ils
  vérifient maintenant l'adaptateur extrait sans diminuer les garanties.
- La synchronisation profil n'utilise pas une table directement dans le service
  afin de conserver `updateProfile` à la frontière Supabase existante.
- Les effets gamification, records, badges et surcharge sont maintenus via deux
  hooks ordonnés du service ; leurs erreurs restent non bloquantes comme avant.

### Risques ou dette restante

- Persistance multi-tables toujours non transactionnelle et sans clé
  d'idempotence.
- `workout_sessions` et `completed_sessions` restent sans lien durable.
- Les nettoyages locaux précoces peuvent empêcher une reprise après panne.
- Le flux rapide ne persiste toujours pas les séries détaillées.
- Les caches restent sans owner/version et `savedAt` invalide reste accepté.
- La correction cible nécessitera identité d'exécution, migration additive,
  RPC/transaction et réconciliation ; aucun de ces changements n'est inclus.

### Tests exécutés

- Tests sauvegarde, synchronisation, stockage, transitions, modèle et runtime :
  60/60 verts.
- Suite Vitest complète : 91 fichiers, 891 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des services, adaptateurs, tests et du hook actions allégé : vert.
- Dette `WorkoutSession` avant/après : 31 erreurs/22 avertissements → 31/22.
- Dette `TrainingTabController` inchangée : 35 erreurs/1 avertissement et aucun
  nouvel `any`.
- `git diff --check`, liens internes et contrôle routes/E2E/migrations/RLS :
  verts.

### Mesures avant/après

- `WorkoutSession.tsx` : 1 532 → 1 522 lignes.
- `use-client-dashboard-actions.ts` : 314 → 289 lignes.
- Tâches Phase 3 : 19/27 → 20/27.
- Progression globale : 62/138 → 63/138, soit environ 46 %.
- Tests actifs globaux : 872 → 891.
- Nouvelles routes, migrations, policies RLS ou spécifications E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire les composants de présentation par phase.

---

## Entrée — 2026-07-18 — Composants de présentation de WorkoutSession

### Travail effectué

- Inventaire des branches de rendu de `WorkoutSession` et association aux états
  observables : active, reprise de brouillon, repos actif/terminé, validation de
  série, finalisation, abandon, proposition de modèle et résumé terminé.
- Extraction de vues typées dédiées dans
  `app/components/training/workout-session/` pour l'en-tête/progression et la
  barre de fin de séance active, le brouillon, les deux états de repos, les
  confirmations, la sauvegarde de modèle et le résumé final.
- Conservation des décisions, effets runtime, stockage, persistance, identité
  et mutations dans `WorkoutSession` ou leurs frontières existantes.
- Remplacement des blocs JSX dupliqués par les composants extraits, sans
  modifier textes, styles, z-index, dimensions mobiles ni callbacks.
- Ajout de tests de rendu React serveur et d'un inventaire statique interdisant
  Supabase, storage et effets runtime dans les vues de présentation.
- Documentation de l'organisation des phases et de la dette encore composée
  dans l'éditeur détaillé exercices/séries.

### Tâches cochées

- Phase 3 : « Extraire les composants de présentation par phase » — terminée.
- Progression Phase 3 : 20/27 → 21/27 tâches.

### Décisions prises

- `WorkoutSession` reste l'orchestrateur et conserve l'autorité sur les états,
  transitions et callbacks ; les vues ne reçoivent que des données et fonctions
  typées.
- L'état principal actif est marqué séparément de l'état terminé. Le repos et
  les confirmations demeurent des surcouches de l'état actif, conformément au
  rendu existant, plutôt que de devenir de nouveaux états métier artificiels.
- L'éditeur exercices/séries, les variantes, le tempo et les popups legacy non
  liés à une phase restent dans `WorkoutSession`; leur extraction relève de la
  future réduction sous 600 lignes.
- La date du résumé reste fournie par l'orchestrateur afin de préserver le rendu
  au moment de la finalisation et de permettre des tests déterministes.

### Problèmes rencontrés

- La limite jsdom/Node connue a été évitée avec `renderToStaticMarkup`, sans
  contournement ESM.
- Des modifications utilisateur non liées sont apparues pendant la tranche dans
  `scripts/enrich-parent-exercises.mjs` et deux médias
  `public/videos/exercises/developpe-couche-barre.*`; elles n'ont été ni lues,
  ni modifiées, ni incluses dans le périmètre.

### Risques ou dette restante

- `WorkoutSession` reste à 1 161 lignes, au-dessus de la cible finale de 600.
- L'éditeur détaillé exercices/séries, le réordonnancement, les variantes, le
  tempo et plusieurs popups restent fortement couplés dans l'orchestrateur.
- Les dettes de cache sans owner, `savedAt` invalide, persistance
  non transactionnelle et finalisation non idempotente restent inchangées.
- Les callbacks sont prouvés statiquement et les sorties sont rendues côté
  serveur ; les interactions DOM complètes restent limitées par l'environnement
  jsdom actuel.

### Tests exécutés

- Tests ciblés des vues de phase : 14/14 verts.
- Tests modèle, runtime, transitions et persistance représentatifs : 52/52
  verts avant la suite complète.
- Suite Vitest complète : 93 fichiers, 905 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des nouveaux composants et tests : vert.
- Dette ESLint `WorkoutSession` : 31 erreurs/22 avertissements → 31/12 ; aucune
  nouvelle erreur et dix imports/constantes devenus inutiles supprimés.
- `git diff --check` vert.

### Mesures avant/après

- `WorkoutSession.tsx` : 1 522 → 1 161 lignes (-361, environ -24 %).
- Vues extraites : 35, 106, 24, 82 et 79 lignes ; types partagés : 20 lignes.
- Tâches Phase 3 : 20/27 → 21/27.
- Progression globale : 63/138 → 64/138, soit environ 46 %.
- Tests actifs globaux : 891 → 905.
- Nouvelles routes, migrations, policies RLS ou spécifications E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Tester interruption, reprise et arrière-plan mobile.

---

## Entrée — 2026-07-18 — Interruption, reprise et arrière-plan mobile

### Travail effectué

- Audit des frontières de stockage, modèle pur, runtime, adaptateur navigateur,
  hook React et orchestration `WorkoutSession` liées à l'interruption mobile.
- Ajout d'une suite déterministe couvrant stockage mémoire, horloge et scheduler
  manuels, visibilité simulée, ports audio/vibration/wake lock et nettoyage des
  ressources.
- Caractérisation de la restauration de `moovx_active_workout` et
  `moovx_workout_draft`, des caches absents/invalides/expirés et de la
  finalisation ou de l'abandon après reprise.
- Caractérisation des retours visibles avant/après échéance et preuve que le
  repos utilise une échéance absolue plutôt qu'un comptage de ticks suspendus.
- Documentation explicite des limites owner, `savedAt`, wake lock et
  persistance sans les corriger.

### Tâches cochées

- Phase 3 : « Tester interruption, reprise et arrière-plan mobile » — terminée.
- Progression Phase 3 : 21/27 → 22/27 tâches.

### Décisions prises

- Aucun test navigateur mobile n'est ajouté : les ports injectables couvrent
  fidèlement la suspension du scheduler, la visibilité et les effets runtime
  sans dépendance au navigateur réel.
- Le passage `hidden` sans appel explicite à `wakeLock.release()` est figé comme
  comportement actuel : la perte est laissée au navigateur, puis une nouvelle
  acquisition est tentée au retour visible.
- L'acceptation d'un `savedAt` invalide et l'absence d'owner dans les deux caches
  restent des tests de dette, pas des garanties cibles.
- Aucun correctif n'est appliqué à l'idempotence, la transactionnalité, les
  caches ou la persistance du repos.

### Problèmes rencontrés

- Aucun blocage technique. Les frontières extraites permettaient de couvrir les
  scénarios sans adaptation du code applicatif.
- Les trois changements utilisateur protégés sont restés hors périmètre, non
  ouverts, non modifiés et non indexés.

### Risques ou dette restante

- Les caches restent partagés entre utilisateurs du même navigateur et sans
  `formatVersion`.
- Un `savedAt` invalide reste accepté ; un repos actif n'est pas persisté.
- Le wake lock n'est pas explicitement libéré au passage en arrière-plan.
- La finalisation reste non idempotente et multi-tables non transactionnelle.
- Les tests simulent les événements mobiles via ports purs ; ils ne valident pas
  les particularités d'un appareil ou navigateur physique.

### Tests exécutés

- Tests interruption/reprise et suites runtime, stockage, transitions, modèle
  et phases : 66/66 verts.
- Suite Vitest complète : 94 fichiers, 915 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé du nouveau test : vert.
- `git diff --check` ciblé : vert.

### Mesures avant/après

- Nouveau fichier applicatif ou modification de comportement : 0.
- Tests actifs globaux : 905 → 915.
- Tâches Phase 3 : 21/27 → 22/27.
- Progression globale : 64/138 → 65/138, soit environ 47 %.
- Nouvelles routes, repositories, migrations, policies RLS ou E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire `WorkoutSession` sous 600 lignes.

---

## Entrée — 2026-07-18 — Réduction de la façade WorkoutSession

### Travail effectué

- Cartographie des responsabilités restantes dans `WorkoutSession` : création
  libre, éditeur exercices/séries, variantes, tempo et overlays.
- Extraction de `WorkoutCustomBuilder`, `WorkoutExerciseEditor` et
  `WorkoutSessionOverlays`, avec contrats typés partagés.
- Conservation dans la façade de l'état React, des accès Supabase existants, du
  runtime, des mutations, de la sauvegarde et de la finalisation.
- Ajout de tests de rendu serveur pour l'éditeur et les overlays, ainsi que d'un
  contrat statique sur les tailles, dépendances et callbacks.
- Adaptation du contrat statique des vues de phase : le repos actif est rendu
  par l'éditeur, mais reste piloté par l'orchestrateur.

### Tâches cochées

- Phase 3 : « Réduire `WorkoutSession` sous 600 lignes » — terminée.
- Progression Phase 3 : 22/27 → 23/27 tâches.

### Décisions prises

- La construction de séance libre conserve sa lecture catalogue Supabase
  historique dans une frontière dédiée ; aucune requête nouvelle n'est créée.
- Les éditeurs et overlays restent présentationnels et ne dépendent ni de
  Supabase, ni du stockage, ni du runtime navigateur.
- Le tempo legacy à trois segments minimum reste accepté ; aucune validation
  canonique plus stricte n'est introduite.
- Les callbacks de sauvegarde, finalisation, abandon, repos et tempo restent
  construits dans `WorkoutSession` afin de ne déplacer aucune autorité métier.

### Problèmes rencontrés

- Un test statique attendait encore `WorkoutActiveRestView` directement dans la
  façade. Il a été aligné sur la nouvelle composition sans réduire sa garantie.
- La dette ESLint historique de la façade reste présente, mais diminue sans
  désactivation : 31 erreurs/12 avertissements → 10 erreurs/3 avertissements.
- Les trois changements utilisateur protégés sont restés hors périmètre, non
  ouverts, non modifiés et non indexés.

### Risques ou dette restante

- `WorkoutSession` conserve des accès Supabase directs et dix occurrences
  `any` historiques.
- Les caches restent non liés à l'utilisateur et `savedAt` invalide reste
  accepté.
- La finalisation demeure non idempotente et multi-tables non transactionnelle.
- Les avertissements historiques d'effets Supabase et de balises `<img>` sont
  conservés ; aucun redesign ni changement de chargement média n'est inclus.

### Tests exécutés

- Suites ciblées façade, éditeur, phases, modèle, transitions, runtime,
  persistance et interruption : 73/73 vertes.
- Suite Vitest complète : 96 fichiers, 924 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé : nouvelles frontières sans erreur ; façade à 10 erreurs et 3
  avertissements historiques.
- `git diff --check` limité à la tranche, liens internes et contrôles de
  périmètre : verts.

### Mesures avant/après

- `WorkoutSession.tsx` : 1 161 → 530 lignes (-631, environ -54 %).
- Frontières extraites : 210, 384 et 160 lignes.
- Composants de plus de 1 000 lignes : 4 → 3.
- Tâches Phase 3 : 22/27 → 23/27.
- Progression globale : 65/138 → 66/138, soit environ 48 %.
- Tests actifs globaux : 915 → 924.
- Nouvelles routes, repositories, migrations, policies RLS ou E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Écrire les tests de caractérisation de `ProgramBuilder`.

---

## Entrée — 2026-07-18 — Caractérisation de ProgramBuilder

### Travail effectué

- Lecture complète de `ProgramBuilder`, de ses consommateurs, des frontières de
  recherche, des repositories Training et des formats documentés.
- Inventaire des quatre modes, des jours fixes, de l'éditeur d'exercices, des
  variantes, de la génération IA, des callbacks et des accès Supabase directs.
- Ajout d'une suite de 18 tests de caractérisation combinant exécution des
  frontières pures et inventaire statique du composant.
- Documentation du contrat actuel, des formats legacy, du payload de
  sauvegarde, de la synchronisation calendrier et des limites de test.

### Tâches cochées

- Phase 3 : « Écrire les tests de caractérisation de `ProgramBuilder` » —
  terminée.
- Progression Phase 3 : 23/27 → 24/27 tâches.

### Décisions prises

- Aucun montage jsdom fragile n'est ajouté : le composant retourne `null` en
  rendu serveur et dépend de frontières navigateur/Framer Motion.
- Les transformations pures `padTo7Days` et bibliothèque d'exercices sont
  exécutées avec des fixtures synthétiques ; les callbacks et mutations sont
  vérifiés à leur frontière source réelle.
- L'ajout/suppression structurel de jours n'est pas inventé : le builder utilise
  sept positions fixes et transforme un jour en repos, ce qui vide ses exercices.
- L'absence actuelle de charge et de RIR dans l'éditeur est documentée au lieu
  d'être présentée comme un oubli du test.

### Problèmes rencontrés

- `padTo7Days` clone le tableau mais ajoute `weekday` aux objets jour existants.
  Cette mutation superficielle est caractérisée comme dette, pas corrigée.
- `custom_exercises` est encore lu avec `select('*')`; les accès Supabase directs
  restent hors de la frontière repository.
- Les trois changements utilisateur protégés sont restés hors périmètre, non
  ouverts, non modifiés et non indexés.

### Risques ou dette restante

- `ProgramBuilder` reste un composant client de 1 330 lignes, fortement typé en
  `any` et responsable de l'édition, de l'IA et de la persistance.
- La sauvegarde de `custom_programs` et la régénération de
  `scheduled_sessions` ne sont pas transactionnelles.
- Une erreur de synchronisation du calendrier n'empêche pas les callbacks de
  succès et fermeture.
- Les fallbacks `||` remplacent les valeurs numériques zéro ; la validation du
  JSON programme reste implicite.

### Tests exécutés

- Tests ciblés ProgramBuilder, bibliothèque, programme actif, adaptateurs et
  repositories : 59/59 verts.
- Suite Vitest complète : 97 fichiers, 942 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint du nouveau test : vert.
- `git diff --check` limité à la tranche, liens internes et contrôles de
  périmètre : verts.

### Mesures avant/après

- Nouveau comportement applicatif : 0.
- Fichier applicatif modifié : 0.
- Tests actifs globaux : 924 → 942.
- Tâches Phase 3 : 23/27 → 24/27.
- Progression globale : 66/138 → 67/138, soit environ 49 %.
- Nouvelles routes, repositories, migrations, policies RLS ou E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire modèle d'édition, DnD et validation.

---

## Entrée — 2026-07-18 — Modèle d'édition, réordonnancement et validation

### Travail effectué

- Extraction d'un modèle d'édition Training pur et typé couvrant programme,
  sept jours, repos, exercices, prescriptions, tempo et techniques.
- Extraction des opérations immuables de normalisation, création de semaine,
  modification de jour, CRUD exercice, déplacement intra-jour et échange de
  jours.
- Ajout d'une décision de déplacement discriminée pour source/destination
  invalides, même position et déplacement inter-jours non supporté.
- Ajout d'une validation bornée à codes/chemins stables et d'une préparation du
  payload legacy avec horloge injectée.
- Migration de `ProgramBuilder` vers ces frontières sans modifier ses lectures,
  mutations, rendu, callbacks ou synchronisation calendrier.

### Tâches cochées

- Phase 3 : « Extraire modèle d'édition, DnD et validation » — terminée.
- Progression Phase 3 : 24/27 → 25/27 tâches.

### Décisions prises

- Le réordonnancement actuel reste intra-jour ; un déplacement inter-jours est
  refusé par `cross_day_not_supported` au lieu d'inventer un nouveau DnD.
- L'échange de jours conserve leurs `weekday`, conformément au comportement
  caractérisé.
- La validation n'expose que `code` et `path`, avec au plus 20 erreurs ; aucun
  contenu utilisateur ou détail de persistance n'est retourné.
- La persistance `custom_programs` et la reconstruction de
  `scheduled_sessions` restent dans le composant et dans le même ordre.

### Problèmes rencontrés

- La correction de mutation de `padTo7Days` exigeait de préserver aussi
  l'absence de clé `exercises` dans un jour legacy incomplet. Le normaliseur pur
  conserve désormais cette absence au lieu d'inventer un tableau vide dans le
  payload.
- Le composant conserve son export historique de `padTo7Days` pour les autres
  consommateurs ; cette ancienne frontière reste mutable hors du builder.
- Les trois changements utilisateur protégés sont restés hors périmètre, non
  ouverts, non modifiés et non indexés.

### Risques ou dette restante

- `ProgramBuilder` conserve les accès Supabase directs, la génération IA et la
  synchronisation calendrier non transactionnelle.
- Le rendu et la persistance restent composés dans un fichier de 1 281 lignes.
- Le déplacement d'exercice entre jours n'est pas supporté.
- L'export `padTo7Days` utilisé par d'autres composants conserve sa mutation
  superficielle historique.

### Tests exécutés

- Tests ciblés modèle, statique, caractérisation, bibliothèque, adaptateurs et
  repositories : 70/70 verts.
- Suite Vitest complète : 99 fichiers, 961 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des nouvelles frontières et tests : vert.
- Dette ESLint `ProgramBuilder` : 28 erreurs/8 avertissements → 26 erreurs/8
  avertissements, sans désactivation ajoutée.
- `git diff --check` limité à la tranche, liens internes et contrôles de
  périmètre : verts.
- Accès Supabase directs : 8 avant/après ; mutations explicites : 5
  avant/après.

### Mesures avant/après

- `ProgramBuilder.tsx` : 1 330 → 1 281 lignes.
- Modèle pur : 333 lignes, sans import ni effet externe.
- Tests actifs globaux : 942 → 961.
- Tâches Phase 3 : 24/27 → 25/27.
- Progression globale : 67/138 → 68/138, soit environ 49 %.
- Nouvelles routes, repositories, migrations, policies RLS ou E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire persistance et présentation du builder.

---

## Entrée — 2026-07-18 — Persistance et vues de ProgramBuilder

### Travail effectué

- Inventaire des huit familles d'accès Supabase et des cinq mutations du
  builder, avec identité, projections, payloads, ordre et comportements
  d'échec.
- Extraction d'un port de persistance injecté, d'un adaptateur Supabase et de
  services pour le chargement, la création d'exercice, les variantes, la
  sauvegarde du programme et la synchronisation calendrier.
- Ajout de résultats discriminés et expurgés pour les chargements complets ou
  partiels, l'échec de sauvegarde et les échecs calendrier.
- Extraction de la navigation des jours/repos/types de séance, des vues plein
  écran de recherche/bibliothèque et du sélecteur de variantes dans trois
  composants typés sans accès Supabase.
- Migration de `ProgramBuilder` vers ces frontières, sans modifier le payload
  legacy, l'ordre des mutations, les callbacks ni le rendu mobile concerné.

### Tâches cochées

- Phase 3 : « Extraire persistance et présentation du builder » — terminée.
- Progression Phase 3 : 25/27 → 26/27 tâches.

### Décisions prises

- La synchronisation conserve volontairement l'ordre historique : sauvegarde
  programme, suppression calendrier, puis insertion des jours non repos.
- Les erreurs structurées Supabase restent caractérisées sans transaction
  fictive ; les opérations suivantes continuent comme dans le composant
  historique et le résultat signale l'état partiel.
- Le `select('*')` historique des exercices personnalisés est conservé afin de
  ne pas changer leur forme publique dans cette tranche.
- L'identité des lectures privées et des écritures reste exclusivement
  `session.user.id`, transmise au service depuis la frontière existante.

### Problèmes rencontrés

- Les anciens tests de caractérisation affirmaient la présence physique des
  requêtes dans le composant. Ils ont été adaptés pour vérifier les mêmes
  contrats dans l'adaptateur et la délégation depuis le builder.
- Les trois changements utilisateur protégés sont restés hors périmètre, non
  ouverts, non modifiés et hors staging.

### Risques ou dette restante

- La sauvegarde programme/calendrier reste non transactionnelle et non
  idempotente ; les résultats partiels préparent seulement une future
  réconciliation.
- `ProgramBuilder` reste au-dessus de sa cible de 500 lignes ; les modes AI,
  manuel, exercice personnalisé et l'éditeur de jour restent à extraire.
- La génération IA reste un fetch direct du composant et les types legacy
  `any` historiques ne sont pas tous résolus.

### Tests exécutés

- Tests ciblés persistance, vues, caractérisation et modèle : 52/52 verts.
- Suite Vitest complète : 101 fichiers, 976 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des nouveaux services, vues et tests : vert.
- Dette ESLint `ProgramBuilder` : 26 erreurs/8 avertissements → 19 erreurs/7
  avertissements, sans désactivation ajoutée.
- `git diff --check`, liens documentaires et contrôles de périmètre : verts.

### Mesures avant/après

- `ProgramBuilder.tsx` : 1 281 → 998 lignes.
- Vues extraites : 157 lignes.
- Service/port/types de persistance : 254 lignes.
- Accès Supabase directs dans `ProgramBuilder` : 8 → 0 ; les contrats sont
  centralisés dans l'adaptateur injecté.
- Tests actifs globaux : 961 → 976.
- Tâches Phase 3 : 25/27 → 26/27.
- Progression globale : 68/138 → 69/138, soit 50 %.
- Nouvelles routes, repositories, migrations, policies RLS ou E2E : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire `ProgramBuilder` sous 500 lignes.

---

## Entrée — 2026-07-18 — Façade ProgramBuilder sous 500 lignes

### Travail effectué

- Cartographie des responsabilités restantes de la façade : états et effets,
  modes sélection/IA/manuel/custom, journée, exercices, prescriptions,
  variantes, recherche et callbacks de sauvegarde.
- Extraction des quatre modes dans `ProgramBuilderModeViews`, de l'éditeur
  exercices/séries/tempo/techniques dans `ProgramBuilderExerciseEditor` et des
  styles partagés dans une frontière dédiée.
- Conservation de la navigation des jours et des overlays déjà extraits ; la
  façade ne garde que l'orchestration, les effets, les décisions du modèle pur
  et le câblage du service de persistance.
- Remplacement du dernier `any` de la façade par le contrat structurel
  `ProgramBuilderSupabaseClient`.
- Ajout d'une garde statique imposant moins de 500 lignes, l'absence de
  Supabase dans les vues, l'absence de nouvel `any` et la délégation des
  responsabilités.

### Tâches cochées

- Phase 3 : « Réduire `ProgramBuilder` sous 500 lignes » — terminée.
- Phase 3 : 26/27 → 27/27 tâches ; Phase 3 terminée.

### Décisions prises

- Les vues sont séparées selon deux axes : phase du builder et édition d'une
  journée. Aucun fichier unique ne reçoit l'ancien composant monolithique.
- Les mutations continuent à passer par le modèle pur et le service existant ;
  leur ordre et leurs payloads ne changent pas.
- La génération IA reste dans l'orchestrateur car son extraction fonctionnelle
  n'appartient pas à cette tranche de présentation.

### Problèmes rencontrés

- Les tests statiques historiques vérifiaient encore la présence du JSX et des
  algorithmes dans le fichier façade. Ils ont été adaptés pour suivre les
  frontières extraites tout en gardant les mêmes assertions métier.
- Les trois changements utilisateur protégés sont restés hors périmètre, non
  ouverts, non modifiés et hors staging.

### Risques ou dette restante

- La synchronisation programme/calendrier reste non transactionnelle et non
  idempotente.
- Le `select('*')` des exercices personnalisés reste un contrat legacy.
- L'appel de génération IA reste directement orchestré par le composant.

### Tests exécutés

- Tests ciblés ProgramBuilder et Training : 102/102 verts.
- Suite Vitest complète : 102 fichiers, 980 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint de la façade, des nouvelles vues, styles et frontières : vert.
- Dette ESLint `ProgramBuilder` : 19 erreurs/7 avertissements → 0/0.
- `git diff --check` et contrôles de périmètre : verts.

### Mesures avant/après

- `ProgramBuilder.tsx` : 998 → 223 lignes.
- `ProgramBuilderModeViews.tsx` : 76 lignes.
- `ProgramBuilderExerciseEditor.tsx` : 68 lignes.
- `ProgramBuilderDayNavigation.tsx` : 56 lignes.
- `ProgramBuilderOverlays.tsx` : 101 lignes.
- `styles.ts` : 21 lignes.
- Tests actifs globaux : 976 → 980.
- Progression globale : 69/138 → 70/138, soit environ 51 %.
- Routes, repositories, migrations, RLS ou E2E modifiés : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Cartographier les formats repas, plans et aliments en Phase 4.

---

## Entrée — 2026-07-18 — Cartographie des formats Nutrition

### Travail effectué

- Activation effective de la Phase 4 et audit documentaire de l'ensemble des
  migrations, types générés, composants, hooks, routes, tâches serveur et
  consommateurs indirects du domaine Nutrition.
- Création de `docs/NUTRITION_FORMATS_INVENTORY.md` avec carte des sources,
  matrice producteurs/consommateurs, formats de plans, journaux, catalogues,
  recettes, préférences, IA, caches, ownership et RLS.
- Inventaire de douze adaptateurs legacy attendus et proposition d'un ordre de
  construction du futur modèle canonique, sans migration ni refactor.

### Tâches cochées

- Phase 4 : « Cartographier les formats repas, plans et aliments » — terminée.
- Phase 4 : 0/17 → 1/17 tâches.

### Décisions prises

- Le type tolérant de `lib/meal-plan.ts` est documenté comme adaptateur
  existant, pas comme autorité métier définitive : il accepte des formes
  ambiguës et remplace certains champs invalides par zéro.
- `daily_food_logs`, `meal_logs` et `meal_tracking` restent trois contrats
  distincts ; aucune fusion n'est proposée sans clé de rapprochement fiable.
- Les catalogues `food_items`, `community_foods`, `custom_foods` et la base
  statique `FITNESS_FOODS` conservent leurs provenances et bases nutritionnelles
  distinctes jusqu'à la définition du modèle canonique.

### Principales divergences relevées

- Les types générés décrivent `meal_plans.plan/active`, tandis que l'application
  utilise `plan_data/is_active` ; des écarts analogues existent pour les cibles
  de `client_meal_plans`, la complétion de `meal_tracking`, `saved_meals`,
  `food_items` et `custom_foods`.
- Les plans emploient quatre représentations et plusieurs vocabulaires
  français/anglais ; les repas sauvegardés et recettes sont des JSON sans
  version ni validation partagée.
- Les macros peuvent être par 100 g, par portion ou déjà multipliées ; les
  notions cru/cuit et les unités textuelles ne sont pas conservées partout.
- Plusieurs flux remplacent ou insèrent des lignes séquentiellement sans
  transaction ni idempotence et peuvent laisser un état partiel.
- Les policies coach historiques ne démontrent pas toutes une relation active ;
  `community_foods.created_by` reste optionnel et la route de recherche utilise
  le `service_role` pour des lectures de catalogue.

### Validations exécutées

- Noms des tables, colonnes, policies et formats recoupés entre migrations,
  types générés et usages applicatifs.
- Liens internes du nouveau document vérifiés.
- `git diff --check` vert.
- Périmètre vérifié : seuls le document d'inventaire, la roadmap et ce journal
  appartiennent à la tranche ; aucune route, bibliothèque applicative, suite de
  tests, migration, RLS ou donnée distante n'a été modifiée.
- Les trois fichiers utilisateur protégés sont restés non ouverts, intacts et
  hors staging.

### Risques ou dette restante

- Le schéma distant n'a pas été consulté : les divergences runtime/types sont
  prouvées dans le dépôt, mais leur présence exacte par environnement reste à
  vérifier lors d'une tranche autorisée.
- Aucun modèle de portion, provenance, unité ou arrondi ne fait encore autorité.
- Aucun repository Nutrition ne borne les nombreux accès Supabase directs.

### Mesures

- Phase 4 : 0/17 → 1/17 tâches.
- Progression globale : 70/138 → 71/138, soit environ 51 %.
- Fichiers applicatifs, tests, E2E, migrations ou policies modifiés : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Définir le modèle Nutrition canonique.

---

## Entrée — 2026-07-18 — Modèle Nutrition canonique

### Travail effectué

- Recoupement de l'inventaire Nutrition avec les migrations, types Supabase
  générés et modèles/types applicatifs existants.
- Création de `docs/NUTRITION_CANONICAL_MODEL.md`, sans ajout de type applicatif
  ni schéma SQL.
- Formalisation des aliments, snapshots, densités et montants nutritionnels,
  portions, recettes, repas planifiés/consommés, journées, plans, affectations,
  objectifs, préférences, ownership, traçabilité et versionnement.
- Définition de treize frontières d'adaptation legacy et d'une stratégie de
  migration progressive conservant les formats actuels en lecture.

### Tâches cochées

- Phase 4 : « Définir le modèle Nutrition canonique » — terminée.
- Phase 4 : 1/17 → 2/17 tâches.

### Invariants retenus

- Une densité nutritionnelle et une quantité consommée sont deux objets
  distincts ; toute valeur calculée connaît sa base et son unité.
- Zéro n'est jamais utilisé pour représenter une valeur inconnue.
- Planifié, marqué terminé et consommé restent trois faits distincts.
- Les snapshots historiques ne sont pas réécrits par une correction catalogue.
- Toute conversion impossible reste isolée et rend le calcul partiel ou
  indisponible ; aucun fallback implicite à 100 g n'est autorisé.
- Toute donnée personnelle a un owner explicite issu d'une identité serveur et
  toute affectation coach exige une relation active.
- Les données IA, photo ou fournisseur restent estimées/déclarées tant qu'une
  validation explicite ne les élève pas.

### Adaptations legacy prévues

- Adaptateurs distincts pour plans personnels, plans coach, formats IA français,
  format tolérant `lib/meal-plan`, templates textuels, deux journaux de
  consommation, marqueurs de complétion, repas sauvegardés, catalogues,
  recettes, fournisseurs et préférences FR/EN.
- `daily_food_logs`, `meal_logs` et `meal_tracking` ne seront ni fusionnés ni
  dédupliqués sans clé métier démontrée.
- Les différences de colonnes entre types générés et runtime restent visibles ;
  le document ne désigne aucun environnement comme autorité SQL.

### Validations exécutées

- Concepts recoupés avec `docs/NUTRITION_FORMATS_INVENTORY.md`, les migrations
  Nutrition, `lib/supabase/database.types.ts` et les modèles existants.
- Noms des tables et formats legacy vérifiés.
- Liens internes du nouveau document vérifiés.
- `git diff --check` vert.
- Périmètre vérifié : seuls le modèle documentaire, la roadmap et ce journal
  appartiennent à la tranche ; aucun fichier applicatif, test, E2E, migration,
  RLS ou donnée distante n'a été modifié.
- Les trois fichiers utilisateur protégés sont restés non ouverts, intacts et
  hors staging.

### Risques ou dette restante

- Le schéma déployé n'a pas été consulté ; les divergences types/runtime devront
  être résolues dans une tranche explicitement autorisée.
- Les règles canoniques n'ont pas encore de types purs ni de tests exécutables.
- La future contrainte d'unicité d'un plan actif, les transactions, l'idempotence
  et les policies coach actives restent à concevoir.
- Les conversions cru/cuit, masse/volume et unités textuelles restent
  volontairement fail-closed faute de données fiables.

### Mesures

- Phase 4 : 1/17 → 2/17 tâches.
- Progression globale : 71/138 → 72/138, soit environ 52 %.
- Fichiers applicatifs, tests, E2E, migrations ou policies modifiés : 0.
- Données distantes consultées ou modifiées : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Ajouter les tests d'invariants calories/macros.

---

## Entrée — 2026-07-18 — Invariants calories et macros

### Travail effectué

- Audit des calculs calories, macros, objectifs et agrégats existants ; les
  consommateurs legacy restent inchangés dans cette tranche.
- Création d'un noyau pur `lib/nutrition/invariants.ts` distinguant densité,
  quantité, montant, agrégation, calcul énergétique et arrondi d'affichage.
- Ajout de résultats discriminés `complete`, `partial`, `unavailable` et
  `invalid`, avec valeurs inconnues conservées à `null` et erreurs structurées.
- Ajout de tests unitaires et statiques couvrant bases 100 g/100 ml,
  portion/unité, agrégations repas/journée, erreurs et pureté du module.
- Clarification du modèle canonique : facteurs énergétiques 4/4/9, fibre exclue
  faute de règle définie et tolérance énergétique toujours explicite.

### Tâches cochées

- Phase 4 : « Ajouter les tests d'invariants calories/macros » — terminée.
- Phase 4 : 2/17 → 3/17 tâches.

### Invariants exécutables

- Zéro explicite reste calculable ; une valeur inconnue reste `null`.
- Valeurs négatives, `NaN`, infinis et quantités invalides sont refusés sans
  propagation dans les totaux.
- Masse, volume, portion et unité ne sont compatibles qu'avec leur base exacte ;
  aucune conversion masse/volume ou portion inconnue n'est inventée.
- La précision est conservée pendant les calculs ; l'arrondi est une frontière
  d'affichage séparée et immutable.
- Un agrégat contenant une donnée inconnue ou non calculable est explicitement
  partiel ; un agrégat vide n'est jamais un total zéro.
- L'énergie issue des macros utilise 4/4/9. La fibre reste hors calcul et une
  différence avec l'énergie déclarée n'est évaluée qu'avec une tolérance fournie.

### Validations exécutées

- Tests d'invariants et tests Nutrition ciblés : 44/44 verts.
- Suite Vitest complète : 104 fichiers, 1 005 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé du noyau et des tests : vert.
- Garde statique : aucun import React, Next, Supabase, navigateur ou `app/`.
- `git diff --check` vert.
- Périmètre vérifié : aucune route, migration, RLS, E2E ou donnée distante
  consultée/modifiée.
- Les trois fichiers utilisateur protégés sont restés non ouverts, intacts et
  hors staging.

### Risques ou dette restante

- Le noyau n'est encore branché à aucun composant ; les agrégats legacy peuvent
  toujours employer `|| 0` jusqu'à leur migration contrôlée.
- La fibre ne contribue pas à l'énergie faute de règle métier définie.
- Les conversions cru/cuit, densité masse/volume et unités textuelles restent
  fail-closed.
- Les objectifs BMR/TDEE et répartitions de macros restent plusieurs contrats
  UI distincts, hors périmètre de cette tranche.

### Mesures

- Phase 4 : 2/17 → 3/17 tâches.
- Progression globale : 72/138 → 73/138, soit environ 53 %.
- Nouvelles frontières pures : 1 ; nouvelles suites : 2.
- Routes, migrations, policies RLS ou E2E modifiés : 0.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les repositories nutrition.

---

## Entrée — 2026-07-18 — Repositories Nutrition read-only

### Travail effectué

- Création de quatre repositories typés dans `lib/repositories/nutrition/` :
  catalogues, plans/affectations, journaux et recettes/repas sauvegardés.
- Injection exclusive de `DatabaseClient`, projections explicites, limites
  bornées, scopes owner/client/catalogue et retours `RepositoryResult` expurgés.
- Ajout d'une lecture spécialisée coach/client qui vérifie une relation
  `coach_clients.status = active` avant de lire le dernier plan affecté.
- Conservation brute des JSON legacy de plans, recettes et repas sauvegardés ;
  aucune adaptation canonique ou mutation n'est introduite.
- Documentation des méthodes, scopes, limites d'autorité et divergences dans
  `docs/NUTRITION_REPOSITORIES.md`.

### Tâches cochées

- Phase 4 : « Créer les repositories nutrition » — terminée.
- Phase 4 : 3/17 → 4/17 tâches.

### Méthodes et scopes

- Catalogue global/communautaire et aliments personnalisés owner-scoped.
- Plans personnels owner-scoped, affectations client-scoped et lecture
  coach/client précédée d'une vérification de relation active.
- `daily_food_logs`, `meal_logs`, `meal_tracking` et `water_intake` lus comme
  quatre flux distincts, ordonnés et bornés.
- Recettes privées owner-scoped, recettes publiques globales et repas
  sauvegardés owner-scoped.

### Validations exécutées

- Tests repositories Nutrition et noyau Nutrition ciblés : 42/42 verts.
- Suite Vitest complète : 105 fichiers, 1 015 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert ; projections conformes aux types Supabase générés.
- ESLint ciblé des repositories et tests : vert.
- Gardes statiques : aucun `select('*')`, `createClient`, `service_role`, import
  React/Next/`app/` ou mutation dans les repositories.
- `git diff --check` limité à la tranche : vert.
- Liens documentaires vérifiés.
- Aucun composant, consommateur, route, migration, RLS, E2E ou donnée distante
  consultée/modifiée par les repositories.
- Aucun fichier ajouté au staging.

### Divergences et limites préservées

- Les colonnes runtime absentes des types générés ne sont pas projetées :
  `plan_data/is_active`, cibles coach, complétion enrichie et compteurs legacy.
- Les identifiants filtrent les lectures mais ne prouvent pas l'autorité ; la
  session de la frontière appelante et la RLS du client injecté restent
  obligatoires.
- La vérification active ne répare pas les policies historiques des autres
  méthodes et aucune mutation server-only n'est créée.
- Aucun consommateur applicatif n'utilise encore ces repositories.

### Mesures

- Phase 4 : 3/17 → 4/17 tâches.
- Progression globale : 73/138 → 74/138, soit environ 54 %.
- Repositories : 4 ; méthodes read-only : 18 ; mutations : 0.
- Routes, migrations, policies RLS ou E2E modifiés : 0.

### Changements concurrents

- Tous les fichiers préexistants ou apparus en parallèle restent hors tranche,
  non modifiés par ce travail et hors staging.
- Les trois changements concurrents connus (`scripts/enrich-parent-exercises.mjs`
  et les deux médias `developpe-couche-barre`) restent protégés.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire la génération de repas hors de la route HTTP.

---

## Entrée — 2026-07-18 — Service de génération de repas

### Travail effectué

- Réduction de `POST /api/generate-meal-plan` à une frontière HTTP conservant
  authentification, limites/quota, garde de rôle, validation, observabilité et
  adaptation SSE.
- Extraction de l'orchestration séquentielle des sept jours, du prompt métier,
  du parsing legacy, de la validation Nutrition et de la conversion `DayPlan`
  dans `lib/nutrition/meal-generation/`.
- Isolation du transport Anthropic derrière un port injectable ; modèle
  `claude-opus-4-8`, limite 1 500 tokens et prompts historiques préservés.
- Validation fail-closed des sorties inconnues ou nutritionnellement invalides,
  tout en conservant le fallback legacy d'une journée vide et la poursuite du
  flux.
- Ajout d'une validation Zod bornée de l'entrée et de correlation IDs/logs
  structurés expurgés sur la route.
- Documentation du service, de ses ports, de ses contrats et de ses limites dans
  `docs/NUTRITION_MEAL_GENERATION_SERVICE.md`.

### Tâches cochées

- Phase 4 : « Extraire la génération de repas hors de la route HTTP » — terminée.
- Phase 4 : 4/17 → 5/17 tâches.

### Contrats et autorité

- L'identité utilisée par quotas, usage et garde `invited` provient uniquement
  de `auth.getUser()` ; un `userId` additionnel du corps reste sans autorité.
- Aucun repository n'a été ajouté au flux : la route historique ne collecte pas
  de données Nutrition en base et les producteurs persistent eux-mêmes le plan.
- Les sept événements `progress`, l'événement `done`, les en-têtes SSE et les
  formes canoniques consommées restent inchangés pour les entrées valides.
- Le fournisseur ne retourne au service que du texte ou un code borné ; aucun
  corps Anthropic, prompt, secret ou erreur brute n'atteint réponse ou logs.

### Validations exécutées

- Tests service/route et Nutrition ciblés : 45/45 verts.
- Suite Vitest complète : 107 fichiers, 1 027 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé de la route, du service, des ports et tests : vert.
- Route mesurée à 58 lignes ; garde statique sans prompt, URL Anthropic ni accès
  direct aux tables Nutrition.
- `git diff --check` limité à la tranche : vert ; liens documentaires valides.
- Aucun fichier ajouté au staging ; migrations, RLS, E2E et données distantes
  inchangés.

### Limites préservées

- Un échec fournisseur ou une sortie invalide reste représenté par une journée
  vide ; le protocole SSE public ne signale pas la cause ni le jour fautif.
- Le quota est consommé avant le démarrage du flux, comme dans le comportement
  historique.
- Les écritures de plans réalisées par les producteurs, leur transactionnalité
  et leur idempotence restent hors périmètre.
- Les autres routes IA n'ont pas été migrées.

### Mesures

- Phase 4 : 4/17 → 5/17 tâches.
- Progression globale : 74/138 → 75/138, soit environ 54 %.
- Route concernée : 1 ; autres routes IA migrées : 0 ; migrations/RLS/E2E : 0.

### Changements concurrents

- Tous les changements préexistants ou apparus en parallèle restent hors
  tranche, non modifiés par ce travail et hors staging.
- Les trois changements concurrents connus restent protégés.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Découper hooks journal, plans, recettes et objectifs.

---

## Entrée — 2026-07-18 — Hooks Nutrition par responsabilité

### Travail effectué

- Création de quatre frontières distinctes sous `app/hooks/nutrition/` pour le
  journal, les plans, les recettes/repas sauvegardés et les objectifs.
- Migration des lectures journal/eau et plan/complétions de `NutritionTab` vers
  leurs hooks, avec états `idle/loading/ready/empty/error`, retry et protection
  contre les réponses obsolètes.
- Migration de la lecture de `RecipesSection` vers les repositories Nutrition
  owner/public, avec fusion d'affichage stable et déduplication par identifiant.
- Introduction d'une lecture pure des objectifs dans `NutritionPreferences`, où
  zéro reste distinct d'une valeur inconnue.
- Conservation de `useFoodLog` comme façade historique étalée par
  `useClientDashboard` ; aucun consommateur public n'est modifié.
- Documentation des contrats, autorités, divergences runtime et limites dans
  `docs/NUTRITION_DOMAIN_HOOKS.md`.

### Tâches cochées

- Phase 4 : « Découper hooks journal, plans, recettes et objectifs » — terminée.
- Phase 4 : 5/17 → 6/17 tâches.

### Contrats et scopes

- Journal : owner/date, ordre historique ascendant et eau séparée ; aucune
  fusion avec `meal_logs` ou `meal_tracking`.
- Plans : plan personnel owner-scoped séparé du plan coach transmis par la
  frontière dashboard ; absence et panne restent distinctes.
- Recettes : lectures privées owner-scoped et publiques globales via repository,
  fusion uniquement pour la présentation.
- Objectifs : calories et macros nullable, zéro explicite préservé.
- Les mutations existantes restent aux frontières fonctionnelles actuelles ;
  aucune nouvelle mutation ou autorité n'est ajoutée.

### Validations exécutées

- Tests hooks et Nutrition ciblés : 72/72 verts.
- Suite Vitest complète : 108 fichiers, 1 033 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des quatre nouveaux hooks et de leur suite : vert ; dette historique
  des composants consommateurs laissée visible et non masquée.
- Gardes statiques : quatre hooks présents et consommés, aucune projection `*`,
  nouveau `any`, construction de client ou `service_role` dans ces frontières.
- `git diff --check` limité à la tranche : vert ; liens documentaires valides.
- Routes, repositories, migrations, RLS, E2E et données distantes inchangés ;
  aucun fichier ajouté au staging.

### Divergences et dette préservées

- Le runtime `meal_plans.plan_data/is_active` diverge toujours des types générés
  `plan/active`; le hook conserve explicitement le contrat runtime sans inventer
  de colonne repository.
- `useFoodLog` conserve sa recherche directe par source : le repository catalogue
  actuel ne représente pas encore ce filtre sans changement de comportement.
- Les mutations détaillées de journal, repas sauvegardés et recettes restent
  dans les composants jusqu'à l'extraction de leurs sections visuelles.
- Aucun cache nouveau ; le cache dashboard owner-scoped reste inchangé.

### Mesures

- Phase 4 : 5/17 → 6/17 tâches.
- Progression globale : 75/138 → 76/138, soit environ 55 %.
- Frontières hooks : 4 ; routes/migrations/RLS/E2E modifiés : 0.
- `NutritionTab` : 1 273 → 1 203 lignes ; `RecipesSection` : 265 → 261 ;
  `NutritionPreferences` : 798 → 800 ; façade `useFoodLog` : 79 → 79.
- Nouveaux hooks : journal 63 lignes, plans 61, recettes 47, objectifs 28.

### Changements concurrents

- Tous les changements préexistants ou apparus en parallèle restent hors
  tranche, non modifiés par ce travail et hors staging.
- Les trois changements concurrents connus restent protégés.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire les sections de `NutritionTab`.

---

## Entrée — 2026-07-18 — Sections de présentation de NutritionTab

### Travail effectué

- Extraction de quatre sections typées depuis `NutritionTab` : calendrier du
  journal, synthèse calories/eau/macros, états des plans et repas sauvegardés.
- Conservation dans `NutritionTab` de l'orchestration, des hooks spécialisés,
  des accès et mutations historiques ainsi que des overlays existants.
- Transmission aux nouvelles vues uniquement de données, états, libellés et
  callbacks ; aucune vue ne crée de client ou n'effectue d'accès distant.
- Ajout de tests statiques et de rendu React serveur, sans `jsdom`, couvrant le
  câblage, les états vide/chargement, la priorité des plans, les repas
  sauvegardés et les zéros nutritionnels explicites.
- Documentation de l'architecture et des limites dans
  `docs/NUTRITION_TAB_SECTIONS.md`.

### Tâches cochées

- Phase 4 : « Extraire les sections de `NutritionTab` » — terminée.
- Phase 4 : 6/17 → 7/17 tâches.

### Contrats préservés

- Props publiques et export de `NutritionTab`, textes français, rendu mobile,
  modales et callbacks inchangés.
- Journal, eau, plan personnel, plan coach et repas sauvegardés conservent leurs
  sources et formes legacy ; aucun historique Nutrition n'est fusionné.
- Les valeurs `0` de calories, eau et macros restent distinctes d'une valeur
  inconnue.
- Les quatre hooks `useNutritionJournal`, `useNutritionPlans`,
  `useNutritionRecipes` et `useNutritionGoals` restent les frontières de
  données spécialisées.

### Validations exécutées

- Tests Nutrition ciblés : 5 fichiers, 46/46 tests verts.
- Suite Vitest complète : 110 fichiers, 1 040 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des quatre nouvelles sections et des deux suites : vert.
- `git diff --check` limité à la tranche : vert.
- Routes, repositories, migrations, RLS, E2E et données distantes inchangés ;
  aucun fichier ajouté au staging.

### Mesures et dette restante

- `NutritionTab` : 1 203 → 1 006 lignes (-197).
- Sections : calendrier 50 lignes, plans 18, repas sauvegardés 44, synthèse 50.
- Dette ESLint de la façade après extraction : 38 erreurs et 11 avertissements
  historiques ; les nouveaux fichiers sont verts et aucune désactivation n'a
  été ajoutée.
- Les cartes détaillées du journal, les grandes compositions de plans et les
  overlays restent dans la façade ; elle demeure au-dessus de la cible de 500
  lignes.
- Progression globale : 76/138 → 77/138, soit environ 56 %.

### Changements concurrents

- Les changements concurrents restent hors tranche, non modifiés par ce travail
  et hors staging.
- Les trois fichiers connus du seed et des médias d'exercices restent protégés.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire `NutritionTab` sous 500 lignes.

---

## Entrée — 2026-07-18 — Façade NutritionTab sous 500 lignes

### Travail effectué

- Réduction de `NutritionTab` à une façade de 417 lignes conservant état React,
  hooks spécialisés, ordre des accès legacy et préparation des callbacks.
- Extraction des cartes du journal dans `NutritionJournalMealsSection`, des
  compositions plan personnel/coach dans `NutritionPlanContent` et des modales
  dans `NutritionTabOverlays`.
- Réutilisation des quatre sections et des hooks Nutrition déjà extraits ;
  aucune lecture, mutation, autorité ou source de données supplémentaire.
- Ajout de gardes statiques et de rendus React serveur pour le contrat public,
  les états vides, les formats de plan legacy et les overlays server-safe.
- Mise à jour de `docs/NUTRITION_TAB_SECTIONS.md` avec la façade finale et les
  responsabilités des nouvelles frontières.

### Tâches cochées

- Phase 4 : « Réduire `NutritionTab` sous 500 lignes » — terminée.
- Phase 4 : 7/17 → 8/17 tâches.

### Garanties préservées

- Export et props publics, navigation, journal, eau, macros, plans personnels
  et coach, repas sauvegardés, modales et callbacks conservés.
- Zéro explicite et valeur inconnue restent distincts ; les historiques legacy
  ne sont ni fusionnés ni dédupliqués.
- Les nouvelles vues reçoivent uniquement données, états et callbacks et ne
  contiennent ni client Supabase, repository, `service_role`, `select('*')` ou
  mutation distante.
- Les accès et écritures historiques restent dans la façade et dans leur ordre
  actuel, y compris les comportements partiels connus.

### Validations exécutées

- Tests Nutrition ciblés : 7 fichiers, 52/52 tests verts.
- Suite Vitest complète : 112 fichiers, 1 046 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des trois nouvelles frontières et des nouvelles suites : vert.
- Gardes statiques : façade et frontières sous 500 lignes, contrat public et
  délégations présents, aucun import ou accès interdit.
- `git diff --check` limité à la tranche et liens documentaires vérifiés.
- Routes, repositories, migrations, RLS, E2E et données distantes inchangés ;
  staging vide.

### Mesures et dette restante

- `NutritionTab` : 1 006 → 417 lignes (-589, -58,5 %).
- `NutritionJournalMealsSection` : 81 lignes ; `NutritionPlanContent` : 45 ;
  `NutritionTabOverlays` : 40. Aucune nouvelle frontière ne dépasse 500 lignes.
- Dette ESLint de la façade : 38 erreurs/11 avertissements → 26 erreurs/3
  avertissements, tous historiques ; aucune désactivation ajoutée.
- Les types legacy des props, plans, journaux et payloads de mutation conservent
  encore des `any` dans la façade. Les mutations multi-étapes restent non
  transactionnelles et ne sont pas corrigées dans cette tranche.
- Progression globale : 77/138 → 78/138, soit environ 57 %.

### Changements concurrents

- Les changements concurrents restent hors tranche, non modifiés par ce travail
  et hors staging.
- Le script de seed et les deux médias d'exercice connus restent protégés.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Comparer les totaux anciens et nouveaux.

---

## Entrée — 2026-07-19 — Comparaison des totaux Nutrition legacy/canoniques

### Travail effectué

- Inventaire des calculateurs actifs du journal, des aliments par 100 g, des
  plans coach/IA, des repas sauvegardés et des totaux déclarés.
- Ajout d'un comparateur pur et typé fondé sur les invariants Nutrition, sans
  branchement aux consommateurs ni changement des valeurs affichées.
- Adaptateurs explicites pour `daily_food_logs`, aliments de plan, aliments de
  repas sauvegardé et champs `total_*` ; zéro legacy et valeur inconnue restent
  distingués dans les issues.
- Tolérances documentées (1 kcal, 0,1 g, 0,5 %) et détails par nutriment avec
  écarts absolus/relatifs, sans arrondi intermédiaire.
- Matrice synthétique de 12 cas : 4 équivalents, 2 tolérés, 2 divergents,
  2 partiels, 1 indisponible et 1 invalide.

### Tâches cochées

- Phase 4 : « Comparer les totaux anciens et nouveaux » — terminée.
- Phase 4 : 8/17 → 9/17 tâches.

### Garanties préservées

- Aucun consommateur, affichage, historique ou comportement Nutrition modifié.
- Aucun accès Supabase, réseau, navigateur, React ou Next dans le comparateur.
- Aucune fusion des historiques legacy ; aucune valeur absente corrigée ou
  normalisée silencieusement.
- Erreurs bornées à des codes et chemins stables, sans payload brut.

### Divergences et limites

- Les calculateurs legacy remplacent fréquemment les absences par zéro et
  arrondissent avant l'agrégation ; le canonique conserve l'inconnu et la
  précision jusqu'à la frontière.
- Les fibres ne sont généralement pas persistées dans les journaux/plans.
- Les alias pluriels `proteins/fats` des repas sauvegardés peuvent être ignorés
  par l'affichage fondé sur les champs singuliers.
- Aucun échantillon distant n'a été consulté ; la matrice utilise uniquement
  des fixtures synthétiques représentatives.

### Validations exécutées

- Tests Nutrition ciblés : 4 fichiers, 45/45 tests verts.
- Suite Vitest complète : 114 fichiers, 1 066 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint du comparateur, des fixtures et des deux suites : vert.
- Garde statique : aucune dépendance React, Next, Supabase, navigateur ou
  réseau ; aucun `any` ni arrondi intermédiaire.
- `git diff --check`, liens documentaires et staging vide vérifiés.
- Routes, repositories, migrations, RLS, E2E et données distantes inchangés.
- Progression globale : 78/138 → 79/138, soit environ 57 %.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Documenter les métriques de progression.

---

## Entrée — 2026-07-19 — Catalogue des métriques de progression

### Travail effectué

- Inventaire documentaire de 39 métriques réellement calculées, persistées ou
  affichées dans les domaines Training, records, corps, régularité, Nutrition,
  profil et gamification.
- Recoupement des formules de `ProgressTab`, `AnalyticsSection`, dashboards
  client/coach/desktop, loaders, diagnostic hebdomadaire, migrations et types
  Supabase générés.
- Documentation des sources, unités, périodes, timezones implicites, arrondis,
  comportements d'absence et consommateurs.
- Classement explicite des métriques canoniques, legacy, divergentes, ambiguës
  ou non vérifiables, sans relier `completed_sessions` et `workout_sessions`.
- Ordre proposé pour extraire ensuite les fonctions pures et critères des
  futures fixtures déterministes.

### Tâches cochées

- Phase 4 : « Documenter les métriques de progression » — terminée.
- Phase 4 : 9/17 → 10/17 tâches.

### Répartition et risques principaux

- Training 13, records 3, corps 10, régularité/activité 5, Nutrition 6,
  profil/gamification 2.
- Semaines glissantes et semaines lundi, dates UTC tronquées et dates locales,
  limites de requêtes et arrondis produisent des valeurs concurrentes.
- Trois streaks, plusieurs variations de poids et plusieurs tonnages coexistent.
- Scores IA (`score_semaine`, symétrie, analyses photo) et `fitness_score` ne
  sont pas reproductibles localement.
- Les champs runtime de mensurations divergent des types générés et le schéma
  distant demeure plus étroit que les migrations canoniques.
- Le diagnostic hebdomadaire projette `workout_sessions.date`, absent des types
  et migrations canoniques qui exposent `created_at`.

### Garanties préservées

- Documentation uniquement : aucun calcul, composant, loader, repository,
  schéma, test ou comportement applicatif modifié.
- Aucun accès distant, reset, migration, policy ou E2E.
- Aucun historique fusionné et aucune donnée absente transformée en zéro.

### Validations exécutées

- Tables, colonnes, projections, formules et clés temporelles recoupées contre
  le code, les migrations et `lib/supabase/database.types.ts`.
- Liens internes du nouveau document vérifiés.
- `git diff --check` vert.
- Contrôle de périmètre : seuls le catalogue, la roadmap et le journal sont
  modifiés par la tranche ; staging vide.
- `app/`, `lib/`, `tests/`, `e2e/`, `supabase/`, routes, repositories, migrations
  et RLS inchangés.
- Progression globale : 79/138 → 80/138, soit environ 58 %.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire les fonctions d'agrégation pures.

---

## Entrée — 2026-07-19 — Agrégations pures de progression

### Travail effectué

- Création de `lib/progression/`, noyau pur couvrant périodes calendaires,
  séries/tonnage/durée, regroupement par exercice, poids/mensurations, records,
  régularité, Nutrition et eau.
- Résultats `complete`, `partial`, `unavailable` et `invalid`, collections
  immuables, ordre déterministe, timezone et horloge explicites.
- Conservation séparée des stratégies legacy de tonnage, variation et streak
  coach ; aucune fusion de `workout_sessions`, `completed_sessions` ou
  `scheduled_sessions`.
- Migration représentative et équivalente des calculs e1RM et variation de
  volume d'`AnalyticsSection`, sans modifier ses lectures ni son contrat.
- Ajout de fixtures fixes, de tests par domaine, de gardes de pureté et d'une
  documentation reliant le noyau au catalogue des 39 métriques.

### Tâche cochée

- Phase 4 : « Extraire les fonctions d'agrégation pures » — terminée.
- Phase 4 : 10/17 → 11/17 tâches.

### Garanties et limites

- Aucun nouvel accès Supabase, repository, read model, route, schéma, RLS ou
  E2E ; aucune donnée distante consultée ou modifiée.
- Inconnu et zéro restent distincts ; aucune conversion d'unité implicite.
- Les métriques IA/non reproductibles et les divergences de sources, fenêtres
  et plafonds restent documentées, sans normalisation silencieuse.
- La dette ESLint historique d'`AnalyticsSection` demeure inchangée : 8 erreurs
  et 9 avertissements ; les nouveaux modules et tests sont propres.

### Validations exécutées

- Tests progression ciblés : 5 fichiers, 29 tests verts.
- Tests ciblés progression/Training/Nutrition : 8 fichiers, 113 tests verts.
- Suite Vitest complète : 119 fichiers, 1 095 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert après extraction.
- ESLint du noyau, fixtures et tests : vert ; dette historique du consommateur
  mesurée séparément.
- Garde statique : aucun import React, Next, Supabase, navigateur, stockage ou
  réseau ; aucun `any`, `select('*')` ou `Date.now()` caché.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Créer les read models progression/analytics.

---

## Entrée — 2026-07-19 — Read models progression et analytics

### Travail effectué

- Création de read models typés pour l'analytics, la synthèse progression et
  les historiques, avec ports injectables et résultats `success`, `partial`,
  `unavailable` ou `failure`.
- Centralisation des limites historiques : 50 records, 100 logs Nutrition,
  30 entrées d'eau, 100 poids et contrat optionnel de 500 sets.
- Migration de `useAnalytics` pour les lectures records, Nutrition, eau et
  poids, avec projections explicites et erreurs expurgées.
- Migration de `ProgressTab` pour le volume total et le delta de poids, sans
  modification de sa structure visuelle ni de ses props.
- Conservation documentée du regroupement hebdomadaire `Date` local/UTC comme
  fallback legacy borné, car son équivalence avec la semaine locale explicite
  n'est pas garantie aux frontières de timezone et DST.
- Ajout de tests des ports, limites, scopes owner, données complètes, partielles,
  absentes et en panne, ainsi que de gardes statiques d'architecture.

### Tâche cochée

- Phase 4 : « Créer les read models progression/analytics » — terminée.
- Phase 4 : 11/17 → 12/17 tâches.

### Garanties et limites

- `workout_sessions`, `completed_sessions` et `scheduled_sessions` restent des
  collections distinctes ; aucune jointure ou déduplication implicite.
- Aucun nouveau repository, accès distant, client Supabase dans les read models,
  route, migration, RLS ou E2E.
- La mutation PR historique et son autorité authentifiée restent dans
  `useAnalytics`; seule sa relecture abandonne `select('*')`.
- Les métriques IA et champs runtime non typés ne sont ni inventés ni recalculés.

### Validations exécutées

- Tests ciblés read models/progression/repositories/loaders : 10 fichiers,
  64 tests verts.
- Suite Vitest complète : 121 fichiers, 1 105 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- Gardes statiques : aucun React, Next, Supabase, `app/`, `createClient`,
  `service_role`, `select('*')` ou `any` dans les read models.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Découper `ProgressTab` par section.

---

## Entrée — 2026-07-19 — Sections de ProgressTab

### Travail effectué

- Extraction de quatre frontières de présentation sous
  `app/components/tabs/progression/` : synthèse/navigation, poids, records et
  mensurations.
- Conservation dans `ProgressTab` de l'orchestration, des refs, des read models,
  des effets, des mutations, des photos, du bien-être, d'`AnalyticsSection` et
  des overlays.
- Contrats typés sans nouveau `any`, Supabase, repository, read model,
  `createClient`, `service_role`, `select('*')` ou mutation dans les vues.
- Ajout de rendus serveur pour les états vide/rempli, zéro explicite, valeurs
  visibles et de gardes statiques pour l'ordre et les callbacks.

### Tâche cochée

- Phase 4 : « Découper `ProgressTab` par section » — terminée.
- Phase 4 : 12/17 → 13/17 tâches.

### Mesures et dette

- `ProgressTab.tsx` : 1 159 → 998 lignes.
- Nouvelles frontières : 49, 53, 40 et 30 lignes ; types partagés : 23 lignes.
- Dette ESLint de `ProgressTab` : 35 erreurs / 28 avertissements → 35 erreurs /
  23 avertissements. Les nouvelles vues et leurs tests sont propres.
- Le contrat legacy ne transporte pas les statuts read-model `partial`,
  `unavailable` et `failure`; ils restent indistinguables dans l'UI plutôt que
  d'être simulés par un nouveau rendu.

### Garanties

- Aucun redesign, changement de formule, de valeur visible, de texte, de prop
  publique ou de callback.
- `AnalyticsSection` et ses calculs ne sont pas modifiés.
- Aucun nouvel accès ou mutation Supabase, repository, route, migration, RLS,
  E2E, reset ou donnée distante.
- Les historiques Training restent séparés.

### Validations exécutées

- Tests Progression ciblés : 9 fichiers, 46 tests verts avant validation
  complète.
- Suite Vitest complète : 123 fichiers, 1 112 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des nouvelles sections et tests : vert.
- Gardes statiques : frontières sous 250 lignes, imports et accès interdits
  absents, ordre et callbacks conservés.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Extraire les calculs d'`AnalyticsSection`.

---

## Entrée — 2026-07-19 — Calculs d'AnalyticsSection

### Travail effectué

- Extraction des calculs e1RM, volume/RIR musculaire, séries poids,
  calories/macros/eau, synthèse 30 jours et export CSV vers deux modules purs.
- Réutilisation de `estimatedOneRepMax` et `percentageChangeLegacy`.
- Extraction du regroupement hebdomadaire mixte local/UTC de `useAnalytics`
  sans modifier la limite de 500 sets ni la fenêtre de 28 jours.
- Horloge et timezone rendues explicites ; calculs invalides isolés sans `NaN`.
- Conservation dans la vue des labels, traductions, couleurs, tooltips et
  transformations strictement visuelles.

### Tâche cochée

- Phase 4 : « Extraire les calculs d'`AnalyticsSection` » — terminée.
- Phase 4 : 13/17 → 14/17 tâches.

### Mesures et dette

- `AnalyticsSection.tsx` : 553 → 448 lignes.
- Dette ESLint : 8 erreurs / 9 avertissements → 0 erreur / 2 avertissements.
- Les avertissements restants concernent deux props publiques historiques non
  consommées : `weightHistory30` et `currentWeight`.

### Garanties et limites

- Aucun changement visuel, de formule, de période, d'arrondi ou de contrat
  public.
- La divergence DST/semaine du fallback local/UTC est testée et documentée ;
  elle n'est pas remplacée par la semaine locale canonique.
- Aucun nouvel accès ou mutation Supabase, route, repository, migration, RLS,
  E2E, reset ou donnée distante.
- Le chargement du mapping muscles et la mutation PR restent hors du noyau pur.

### Validations exécutées

- Tests ciblés calculs/read models/dates : 5 fichiers, 33 tests verts avant
  validation complète.
- Suite Vitest complète : 125 fichiers, 1 123 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint des modules purs et de leurs tests : vert.
- Gardes statiques : aucun React, Next, Supabase, navigateur, stockage, réseau,
  `Date.now()` ou `any` dans les nouveaux modules.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Réduire `ProgressTab` sous 500 lignes.

---

## Entrée — 2026-07-19 — Façade ProgressTab sous 500 lignes

### Travail effectué

- Réduction de `ProgressTab.tsx` de 998 à 72 lignes en conservant son export,
  son contrat public et son rôle de façade.
- Extraction des vues photos, analyse corporelle, bien-être, export, saisies
  poids/mensurations et comparaison photo.
- Extraction de la coordination historique dans `useProgressTabController` :
  états, effets, transformations locales, export et mutations existantes.
- Conservation dans la façade des refs de navigation et de composition des
  sections, afin de ne pas exposer les refs pendant le rendu.
- Ajout de gardes statiques de taille, d'imports interdits et d'accès aux
  données, ainsi que de caractérisations par rendu serveur.

### Tâche cochée

- Phase 4 : « Réduire `ProgressTab` sous 500 lignes » — terminée.
- Phase 4 : 14/17 → 15/17 tâches.

### Mesures et dette

- `ProgressTab.tsx` : 998 → 72 lignes.
- Nouvelles frontières : photos 32, analyse corporelle 30, bien-être 42,
  saisies 20, comparaison 24, export 8, contrôleur 85 et types 42 lignes.
- Dette ESLint de la façade : 35 erreurs / 23 avertissements → 0 / 0.
- Ensemble des nouvelles frontières : 0 erreur et 4 avertissements
  `no-img-element`, hérités des images photo déjà rendues auparavant.

### Garanties et limites

- Aucun changement volontaire de contrat public, d'ordre des sections,
  d'arrondi visible, de texte, de callback ou d'ordre d'écriture.
- Aucun nouvel accès ou mutation Supabase ; les deux lectures wildcard
  historiques de `body_analyses` et `daily_checkins` restent cantonnées au
  contrôleur.
- Les vues n'importent ni Supabase, ni repository, ni read model et ne mutent
  aucune donnée.
- Les statuts `partial`, `unavailable` et `failure` restent absents du contrat
  public legacy ; cette dette n'est pas masquée par la présentation.
- Aucun route, repository, migration, RLS, E2E, reset ou service distant n'a
  été touché.

### Validations exécutées

- Tests ciblés Progression : 7 fichiers, 30 tests verts avant validation
  complète.
- Suite Vitest complète : 127 fichiers, 1 130 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` vert.
- ESLint ciblé : 0 erreur ; 4 avertissements historiques `no-img-element`.
- Gardes statiques : façade et frontières sous 500 lignes, vues sans accès
  données, aucun nouvel `any`, `createClient`, `service_role` ou wildcard.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Tester fuseaux horaires, semaines et unités.

---

## Entrée — 2026-07-19 — Fuseaux, semaines et unités

### Travail effectué

- Ajout d'une matrice table-driven de 48 cas couvrant les frontières
  temporelles et unités de Progression, Training et Nutrition.
- Caractérisation d'UTC, Europe/Zurich et America/New_York, des deux bascules
  DST 2026, des jours locaux différents du jour UTC, des semaines lundi, mois,
  années, année bissextile et fenêtres 7/28/30 jours.
- Caractérisation séparée de la semaine locale canonique et du fallback legacy
  « lundi local puis troncature UTC ».
- Vérification des unités kg/lb opaques, cm, durées, séries/répétitions, bases
  100 g/100 ml, portions et unités Nutrition.
- Vérification fail-closed des conversions ambiguës, nombres invalides et
  valeurs inconnues, sans confondre zéro et absence.
- Ajout d'une garde statique de pureté sur les noyaux testés.

### Tâche cochée et phase

- Phase 4 : « Tester fuseaux horaires, semaines et unités » — terminée.
- La checklist réelle contient 16 tâches : Phase 4 corrigée de 15/17 à 16/16
  et clôturée ; activation de la Phase 5.

### Résultats

- 48 nouveaux cas : 25 temporels, 22 unités/précision et 1 garde statique.
- Divergence confirmée à `2026-03-29T22:30:00Z` à Zurich : semaine canonique
  `2026-03-30`, semaine legacy mixte `2026-03-29`.
- Aucun bug de fonction pure révélé ; aucun code de production corrigé.
- Les kg/lb restent des séries séparées ; aucune conversion pounds/kg,
  pouces/cm ou masse/volume n'est inventée.

### Garanties et limites

- Aucun changement d'interface, de données, de formule legacy ou d'historique.
- Les heures civiles inexistantes/répétées ne sont pas des entrées du contrat :
  les fonctions projettent des instants absolus dans un timezone IANA.
- Les kg et litres Nutrition sont exprimés par facteurs explicites 1000 g et
  1000 ml ; le noyau ne définit pas d'unité kg/l native.
- `workout_sessions`, `completed_sessions` et `scheduled_sessions` restent
  indépendants.
- Aucun accès distant, route, repository, migration, RLS, E2E ou reset.

### Validations exécutées

- Matrice ciblée : 3 fichiers, 48 tests verts.
- Tests ciblés Progression/Training/Nutrition : 8 fichiers, 99 tests verts
  avant validation complète.
- Matrice exécutée sous `TZ=UTC` et `TZ=America/Los_Angeles` : 47 tests verts
  dans chaque environnement système.
- Suite Vitest complète : 130 fichiers, 1 178 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit`, ESLint ciblé et `git diff --check` verts.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés,
  intacts par cette tranche et hors staging.

### Temps passé

Non fourni par l'utilisateur.

### Prochaine action unique

Phase 5 — Écrire les E2E coach/client de caractérisation.

---

## Entrée — 2026-07-19 — E2E coach/client de caractérisation

### Travail effectué

- Ajout de deux parcours Playwright locaux : coach desktop et client mobile.
- Ajout de fixtures uniques et déterministes couvrant coach, client actif,
  second coach/client étrangers, client inactif et persona invité, avec un
  programme, un poids, une complétion, un repas, une séance planifiée et un
  message synthétiques.
- Traversée réelle de Supabase Auth, PostgREST, RLS, `coach_clients`,
  `active_related_profiles`, des dashboards et de `/client/[id]`, sans
  interception Playwright ni fournisseur externe.
- Ajout des commandes `test:e2e:coach-journey`,
  `test:e2e:client-journey` et `test:e2e:coach-client`.
- Documentation des frontières, refus, fixtures, nettoyages et limites dans
  `docs/E2E_COACH_CLIENT_HARNESS.md`.

### Tâche cochée

- Phase 5 : « Écrire les E2E coach/client de caractérisation » — terminée.
- Prochaine tâche ouverte : extraire le repository des relations coach/client.

### Parcours et autorisations caractérisés

- Coach lié : client visible, détail ouvert, six onglets représentatifs
  navigables, données étrangères absentes et champs d'autorité non rendus.
- Coach anonyme ou sans relation : accès direct protégé ou profil non visible.
- Client lié : dashboard, Training, Nutrition, Compte, Profil, relation active
  et rechargement de session.
- Client inactif, client d'un autre coach et invité : aucune attribution du
  coach fixture.
- L'unicité de la relation active est imposée par
  `coach_clients_one_active_per_client_idx`; aucune fixture invalide n'est
  fabriquée pour contourner cet invariant.

### Validations exécutées

- Garde locale démontrée : URL distante et projet lié refusés avant reset.
- Reset local : 139/139 migrations ; empreinte
  `96e08867f266a1a36fa8f2b94ef78fc6` ; contrat vérifié.
- Coach individuel : 2 tests verts en 20,3 s.
- Client individuel : test principal vert en 12,0 s ; suite complète 2 tests
  verte en 28,2 s.
- Harnais combiné deux fois consécutivement : 4 tests verts en 42,5 s puis
  38,8 s.
- Vitest complet : 130 fichiers, 1 178 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit`, ESLint ciblé et `git diff --check` verts.
- Reset final et audit : zéro compte, profil, relation, message, séance
  planifiée ou donnée métier synthétique ; Mailpit vide ; ports temporaires
  fermés ; staging vide.

### Limites et dettes observées

- Pour un profil non visible, `/client/[id]` affiche le message technique
  legacy `Cannot coerce the result to a single JSON object` au lieu d'un
  libellé produit ; le refus reste fail-closed.
- Le profil client affiche le nom de coach fallback `Coach` malgré une relation
  active ; le statut actif est correct.
- Les lectures historiques de feedback renvoient localement 500 et
  `default-assignment` 503 lorsque le coach par défaut global n'est pas seedé ;
  ces erreurs préexistantes ne bloquent pas les parcours caractérisés.
- Le harnais n'a pas été ajouté à la suite critique globale dans cette tranche
  afin de ne pas élargir sa durée et son contrat sans décision dédiée.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus sont restés protégés,
  intacts par cette tranche et hors staging.

### Prochaine action unique

Extraire le repository des relations coach/client.

---

## Entrée — 2026-07-19 — Repository des relations coach/client

### Travail effectué

- Création d'un repository read-only injecté pour les relations par paire, le
  coach actif d'un client, les clients actifs d'un coach et la projection
  `active_related_profiles`.
- Ajout d'une détection fail-closed de relations actives multiples, malgré
  l'index SQL qui impose déjà l'unicité, et d'un mapping d'erreurs expurgé via
  `RepositoryResult`.
- Migration des lectures représentatives des dashboards coach/client, des
  analytics coach et du contrôle de relation Nutrition.
- Réduction de l'inventaire direct hors repository de 11 fichiers/12 appels à
  7 fichiers/7 appels, dont la mutation de déconnexion et six lecteurs legacy
  explicitement documentés.

### Tâche cochée

- Phase 5 : « Extraire le repository des relations coach/client » — terminée.

### Garanties préservées

- L'identité provient toujours de la session ; un ID de paramètre borne la
  requête mais n'accorde aucun droit.
- La RLS conserve l'anti-énumération : relation absente et étrangère restent
  indistinguables par `not_found`.
- Aucun `createClient`, `service_role`, `select('*')`, import React/Next ou
  mutation n'existe dans le repository.
- Invitation, affectation par défaut, déconnexion, RPC et policies sont
  inchangées. Les lecteurs Billing spécialisés restent inchangés.

### Validations exécutées

- Tests ciblés repository, consommateurs et gardes statiques : 7 fichiers,
  45 tests verts et 3 `todo`; sous-ensemble repository : 7 tests verts.
- Suite Vitest complète : 132 fichiers, 1 188 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` et vérification des types Supabase canoniques verts.
- ESLint des nouveaux fichiers vert. Dette historique inchangée pour
  `useCoachDashboard` : 21 erreurs et 6 avertissements avant/après; les deux
  autres consommateurs migrés restent verts.
- Reset local : 139/139 migrations, empreinte
  `96e08867f266a1a36fa8f2b94ef78fc6`; matrice RLS et PostgREST vertes.
- E2E coach/client : 4 tests verts en 41,1 s. E2E affectation du coach par
  défaut : 1 test vert en 11,6 s.
- Reset final local propre, liens documentaires et `git diff --check` verts;
  staging vide.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus restent protégés et
  hors staging.

### Prochaine action unique

Extraire le module calendrier/appointments.

---

## Entrée — 2026-07-19 — Module calendrier/appointments

### Travail effectué

- Création du module `lib/coaching/calendar` : types, validation Zod, modèle
  temporel pur, repository injecté, service d'autorisation, port de
  notification et adaptateur navigateur.
- Migration des seuls consommateurs équivalents de `coach_appointments` :
  semaine/création/suppression dans `useCoachDashboard` et prochains
  rendez-vous dans `HomeTab`.
- Conservation explicite de `scheduled_sessions` comme domaine Training
  séparé ; ses cinq fichiers consommateurs et quatorze appels directs restent
  inchangés.
- Documentation des contrats, scopes, états réellement observés, fuseaux,
  notification, limites et frontière Training dans
  `docs/COACHING_CALENDAR_MODULE.md`.

### Tâche cochée

- Phase 5 : « Extraire le module calendrier/appointments » — terminée.

### Garanties et mesures

- Accès applicatifs directs à `coach_appointments` : 2 fichiers/4 appels avant,
  0 fichier/0 appel après. Les cinq opérations Supabase sont centralisées dans
  le repository avec projection explicite.
- Identité coach/client issue de la session ; création et suppression coach
  soumises à la relation active et à la RLS du client injecté.
- Notification legacy préservée exactement (`/api/send-notification`, titre,
  corps et URL) et toujours non bloquante après une insertion réussie.
- États inconnus, fuseaux invalides et heures DST ambiguës/inexistantes sont
  refusés ; périodes et listes sont bornées et triées de façon déterministe.
- Aucun `createClient`, `service_role`, `select('*')`, import React/Next ou
  message SQL brut dans le module.

### Validations exécutées

- Tests calendrier et consommateurs ciblés : 10 fichiers, 78 tests verts ;
  noyau calendrier seul : 5 fichiers, 25 tests verts.
- Suite Vitest complète : 137 fichiers, 1 213 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit` et types Supabase canoniques verts.
- ESLint du module et de ses tests vert. Dette combinée des deux consommateurs
  migrés : 64 erreurs/49 avertissements avant, 62/49 après ; aucune nouvelle
  dette, deux erreurs historiques supprimées par le typage du rendez-vous.
- Reset Supabase local : 139/139 migrations, empreinte
  `96e08867f266a1a36fa8f2b94ef78fc6`; matrice RLS/PostgREST existante verte.
- E2E coach/client : 4 tests verts en 42,0 s.
- Reset et vérification finaux verts ; Mailpit vide ; `git diff --check` et
  liens documentaires verts ; staging vide.

### Limites et dettes observées

- La matrice RLS générique ne possède pas encore d'assertions dédiées à
  `coach_appointments`; les deux policies historiques sont inchangées et les
  tests repository/service couvrent leurs scopes attendus.
- Pas de chevauchement, update, annulation logique, complétion, transaction
  notification/insertion ou pagination au-delà des bornes actuelles.
- La lecture client est maintenant bornée à 366 jours ; un rendez-vous au-delà
  d'un an n'apparaîtrait pas dans la carte des prochains rendez-vous.
- Les alertes E2E historiques sur feedback, affectation par défaut et
  `getSession()` restent hors périmètre.

### Changements concurrents

- Le script de seed et les deux médias d'exercice connus sont restés protégés,
  intacts par cette tranche et hors staging.

### Prochaine action unique

Extraire le module messaging et realtime.

---

## Entrée — 2026-07-19 — Audit messaging/realtime bloqué par schéma et RLS

### Travail effectué

- Inventaire de la table `messages`, de ses types, migrations, policies, trois
  hooks consommateurs, notifications, polling et cinq channels realtime.
- Ajout d'un test de caractérisation exécutable couvrant forme canonique,
  divergence `image_url`, compteurs lifecycle et absence de scope relationnel
  dans les policies.
- Documentation du premier blocage et de la correction préalable minimale dans
  `docs/COACHING_MESSAGING_REALTIME.md`.

### Tâche laissée ouverte

- Phase 5 : « Extraire le module messaging et realtime » — non terminée.
- Aucune frontière de production ni aucun consommateur n'a été migré : le
  faire aurait imposé un changement de comportement ou un contournement de
  schéma/RLS interdit.

### Blocages confirmés

- `messages.image_url` est produit et rendu par les trois interfaces mais est
  absent des 139 migrations, du schéma local et des types générés.
- Les sept policies effectives ne vérifient pas `coach_clients.status = active`;
  un utilisateur authentifié peut cibler n'importe quel profil avec son propre
  `sender_id`.
- La policy `messages_coach_rw FOR ALL` et les grants historiques exposent une
  autorité DELETE navigateur non utilisée par l'UI.

### Mesures avant/après

- Accès directs `messages` : 12 → 12.
- Channels : 5 → 5 ; subscriptions : 5 → 5 ; nettoyages `removeChannel` :
  5 → 5 ; handlers `postgres_changes` : 7 → 7.
- Compteurs volontairement inchangés puisque la migration sûre est bloquée.

### Validations exécutées

- Caractérisation messaging et contrat notification : 2 fichiers, 43 tests
  verts.
- Suite Vitest complète : 138 fichiers, 1 218 tests actifs verts et 3 `todo`.
- `npx tsc --noEmit`, ESLint ciblé et types Supabase canoniques verts.
- Inspection PostgreSQL locale read-only : six colonnes `messages`, aucune
  `image_url`, sept policies sans relation active et grants navigateur larges.
- Matrice RLS/PostgREST existante verte ; elle ne couvre pas encore `messages`.
- E2E coach/client : 4 tests verts en 42,0 s ; aucune notification externe.

### Prochaine action unique

Autoriser une tranche séparée de correction du schéma `messages` et de
durcissement RLS, puis reprendre l'extraction messaging/realtime.

---

## Entrée — 2026-07-19 — Schéma et RLS `messages` sécurisés

### Travail effectué

- Ajout additif de `messages.image_url text NULL`, conforme aux chemins storage
  déjà produits par les trois interfaces, sans réécriture de données.
- Suppression des sept policies historiques et création de trois policies
  SELECT/INSERT/UPDATE exigeant une relation `coach_clients` active, une paire
  coach/client compatible et un participant authentifié.
- Grants navigateur réduits à SELECT, INSERT et UPDATE de la seule colonne
  `read`; DELETE et mutation des colonnes de contenu/identité refusés.
- Ajout d'une matrice SQL dédiée et d'une preuve PostgREST avec JWT locaux;
  types Supabase régénérés depuis 140 migrations.

### Contrat et validations

- Le destinataire actif peut uniquement passer `read` de faux à vrai. Le helper
  SECURITY DEFINER est booléen, à `search_path` vide et inaccessible à anon.
- Reset local vert : 140/140 migrations; empreinte
  `07fd93ad1995b031822be222179c83bc`.
- Matrice RLS existante, 30 assertions SQL messages et sept preuves PostgREST
  messages vertes. Aucune fixture persistante après rollback/finally.
- Tests ciblés : 46 verts; suite Vitest : 138 fichiers, 1 218 tests verts et
  3 `todo`; TypeScript, ESLint ciblé et types Supabase verts.
- E2E coach/client : 4 scénarios verts; E2E push : 1 scénario vert. Les alertes
  historiques feedback/assignment et `getSession()` restent hors périmètre.
- Vérification locale finale verte; Auth, profiles, relations et messages à
  zéro, Mailpit vide, liens documentaires et `git diff --check` verts.
- Les consommateurs, channels realtime, notifications, `chat_ai_messages`,
  routes, migrations historiques et données distantes restent inchangés.

### État roadmap et prochaine action unique

- « Extraire le module messaging et realtime » reste volontairement ouverte;
  son prérequis schéma/RLS est maintenant levé.
- Prochaine action : reprendre l'extraction du module messaging et realtime.

---

## Entrée — 2026-07-19 — Module messaging/realtime extrait

### Travail effectué

- Création de `lib/coaching/messaging` : types, Zod, modèle pur, repository
  injecté, service, port/adaptateur realtime Supabase et contrôleur de cycle de
  vie idempotent.
- Migration bornée de `useMessages`, `useCoachDashboard` et `useClientDetail`.
  Aucun accès direct à `public.messages` ni lifecycle de channel ne subsiste
  dans ces consommateurs.
- Auteur dérivé de `auth.getUser()`, paire active vérifiée avant insert, RLS
  conservée comme autorité, projections explicites et erreurs expurgées.
- Validation fail-closed des payloads realtime, filtrage de paire,
  déduplication par ID et ordre `created_at + id`.

### Mesures et comportements préservés

- Accès directs consommateurs : 12 → 0.
- Channels/subscriptions/removeChannel au runtime : 5/5/5 → 5/5/5 via
  l'adaptateur; handlers instanciés : 7 → 7 via trois déclarations centrales.
- Polling 30 s et 120 s, optimistic UI, `image_url`, scroll, compteurs non lus,
  read receipts et contrats de notification sont préservés.
- `chat_ai_messages`, calendrier, routes, migrations, RLS et E2E specs restent
  inchangés.

### Validations

- Tests ciblés messaging/notifications : 6 fichiers, 56 tests verts.
- Suite Vitest : 142 fichiers, 1 231 tests verts et 3 `todo`.
- TypeScript, types Supabase et ESLint du module/`useMessages` verts.
- Matrice SQL/RLS et preuves PostgREST messages vertes.
- E2E coach/client : 4 scénarios verts; E2E push : 1 scénario vert.

### Dette et prochaine action unique

- Les gros hooks conservent leur dette ESLint historique hors messaging.
- Les cycles approfondis de reconnexion, changements rapides et détection de
  channels orphelins restent volontairement ouverts.
- Prochaine tâche : « Tester abonnement, reconnexion et nettoyage realtime ».
## Entrée — 2026-07-19 — Lifecycle realtime messaging couvert

### Travail effectué

- Caractérisation des cycles start/stop, Strict Mode, changements rapides
  d'identité/relation, statuts Realtime, payloads hostiles et déduplication.
- L'adaptateur expose les statuts `SUBSCRIBED`, `CLOSED`, `CHANNEL_ERROR` et
  `TIMED_OUT`, neutralise messages/statuts tardifs après stop et conserve une
  destruction idempotente par channel.
- Les trois consommateurs invalident leurs chargements obsolètes ; les deux
  compteurs realtime ignorent désormais un INSERT déjà compté pendant le cycle.
- Aucun contrat UI, accès repository, notification, migration ou policy changé.

### Validation et limites

- Nouvelle matrice lifecycle : 20 scénarios déterministes ; tests ciblés
  messaging/notification : 8 fichiers, 74 tests verts.
- Suite Vitest : 144 fichiers, 1 249 tests verts et 3 `todo`; TypeScript et
  ESLint ciblé verts, sans erreur ni avertissement.
- Types Supabase, matrice RLS/PostgREST messages et E2E coach/client (4/4)
  verts. Pile finale vérifiée à 140 migrations et empreinte
  `07fd93ad1995b031822be222179c83bc`; Mailpit vide.
- `git diff --check` et liens documentaires verts; staging vide.
- La reconnexion réseau reste pilotée par Supabase sur le channel existant :
  aucun retry concurrent n'a été ajouté.
- La relation active reste vérifiée par le repository et la RLS. L'E2E local ne
  simule pas une coupure WebSocket physique ; les statuts le sont de manière
  déterministe au niveau du port.
- Les changements concurrents du seed et des deux médias restent protégés et
  hors staging.

### Prochaine action unique

Extraire clients, programmes, revenus et analytics de `useCoachDashboard`.
## Entrée — 2026-07-19 — Domaines du dashboard coach extraits

- Frontières typées Clients, Programmes, Revenus et Analytics créées sous
  `lib/coaching/dashboard`; contrat public du hook préservé.
- Relations actives/projections autorisées centralisées, calculs revenus et
  résumés de séances extraits avec bornes et projections explicites.
- Programmes caractérisé comme handoff des clients actifs : aucune requête
  programme n'existait dans le hook et `CoachPrograms` reste inchangé.
- Tests ciblés : 53 verts; suite complète : 146 fichiers, 1 255 tests verts et
  3 `todo`; TypeScript, types Supabase et ESLint des nouvelles frontières verts.
- E2E coach/client : 4/4 verts; `git diff --check` vert.
- Dette préservée : lecture séquentielle `workout_sessions`, domaines profil,
  food, Stripe et feedback encore dans la façade.
- Changements concurrents du seed et des deux médias protégés, hors staging.

### Prochaine action unique

Réduire `useCoachDashboard` sous 250 lignes.
## Entrée — 2026-07-19 — Façade `useCoachDashboard` réduite

- Façade publique réduite de 683 à 11 lignes, contrat/constants séparés et
  contrôleur ramené sous 500 lignes.
- Lifecycle messaging extrait dans un hook de 84 lignes réutilisant repository,
  service et adaptateur realtime existants; polling et ressources nettoyés.
- Tailles finales : façade 11, contrat 29, contrôleur 432, messaging 84;
  aucune frontière ne dépasse 500 lignes.
- Dette ESLint passée de 11 erreurs/7 avertissements à 9 erreurs/3
  avertissements historiques dans le seul contrôleur; les nouvelles frontières
  sont propres.
- Tests ciblés : 70 verts; suite complète : 147 fichiers, 1 259 tests verts et
  3 `todo`; TypeScript et types Supabase verts; E2E coach/client : 4/4 verts.
- `git diff --check` et liens documentaires verts; aucune requête/mutation,
  autorité, route, migration, RLS ou spécification E2E ajoutée.
- Changements concurrents du seed et des deux médias protégés et hors staging.

### Prochaine action unique

Extraire profil, programme, nutrition et progression de `useClientDetail`.
## Entrée — 2026-07-19 — Domaines du détail client extraits

- Frontières Profil, Training, Nutrition et Progression créées sous
  `lib/coaching/client-detail`; contrat public de `useClientDetail` préservé.
- Identité coach dérivée par `auth.getUser()`, relation active vérifiée avant la
  projection `active_related_profiles`; cible URL jamais utilisée comme
  autorité et erreurs expurgées.
- Repositories Training et read models Progression réutilisés; formats
  Nutrition distants divergents isolés explicitement sans fusion legacy.
- Chargements concurrents coordonnés et réponses obsolètes invalidées au
  changement de client ou au démontage.
- Mesures : hook 847 → 810 lignes, accès directs 35 → 11, dette ESLint
  33 erreurs/3 avertissements → 30 erreurs/2 avertissements historiques.
- Compatibilité vérifiée : programmes personnels triés par `created_at DESC`
  avec limite 10 et progression chargée sans bloquer la fin du chargement
  profil/Training/Nutrition.
- Tests ciblés : 9 fichiers, 81 tests verts; suite Vitest complète : 149
  fichiers, 1 268 tests verts et 3 `todo`; TypeScript et types Supabase verts.
- Matrice RLS/PostgREST locale et E2E coach/client (4/4) verts; Mailpit vide et
  pile locale arrêtée après validation.
- ESLint des nouvelles frontières/tests vert; seule la dette historique du hook
  demeure. `git diff --check` et liens documentaires verts.
- Aucun changement de route, page, composant métier, migration, RLS ou E2E;
  changements concurrents protégés et hors staging.

### Prochaine action unique

Réduire `useClientDetail` sous 250 lignes.
## Entrée — 2026-07-19 — Façade `useClientDetail` réduite

- Façade publique réduite de 810 à 5 lignes sans modifier son consommateur;
  types/constants, coordination, IA et ressources ont des responsabilités
  distinctes.
- Tailles finales : contrat 69, contrôleur 456, IA 129, ressources 88; aucune
  frontière ne dépasse 500 lignes.
- Les quatre domaines, la progression non bloquante, les programmes personnels
  `created_at DESC` limités à 10 et les formats Nutrition legacy restent
  inchangés.
- Messaging réutilise repository/service/realtime existants avec invalidation
  des réponses obsolètes, cleanup du channel et debounce nettoyé.
- Dette ESLint passée de 30 erreurs/2 avertissements à 13 erreurs historiques
  dans le contrôleur; les nouvelles frontières sont propres.
- Tests ciblés useClientDetail/domaines/messaging : 9 fichiers, 78 tests verts;
  suite Vitest complète : 150 fichiers, 1 271 tests verts et 3 `todo`.
- TypeScript, types Supabase, matrice RLS/PostgREST et E2E coach/client (4/4)
  verts. Mailpit vide et pile Supabase locale arrêtée après validation.
- `git diff --check`, liens documentaires, gardes de tailles et d'architecture
  verts; staging resté vide.
- Page consommatrice, routes, migrations, RLS et E2E inchangés; changements
  concurrents protégés et hors staging.

### Prochaine action unique

Découper `coach/page.tsx` en sections chargées à la demande.
## Entrée — 2026-07-19 — Sections différées de la page coach

- Page réduite de 803 à 76 lignes; compositions desktop (289) et mobile (381),
  wheel picker (38), fallback (5) et contrat (27) extraits, tous sous 500.
- Huit sections réelles conservées. Clients, calendrier, messages, analytics,
  programmes, aliments, profil et détail de séance sont chargés via
  `next/dynamic` avec fallback stable et sans `ssr: false`.
- `accueil` reste dans chaque layout car section initiale; `CoachStyles` et
  `BugReport` restent statiques car globaux/toujours montés.
- Imports statiques de présentation de la page : 12 → 2 légers. Aucun import
  statique ne duplique une section dynamique.
- Contrat `useCoachDashboard`, navigation, modales, responsive, lifecycle
  messaging/calendrier, requêtes et mutations inchangés.
- Dette ESLint de la page : 17 erreurs/12 avertissements → 0 erreur/1
  avertissement historique `no-img-element`; nouvelles vues sans erreur.
- Tests ciblés page/dashboard/calendrier/messaging : 7 fichiers, 27 tests verts;
  suite Vitest complète : 151 fichiers, 1 275 tests verts et 3 `todo`.
- TypeScript vert; E2E coach/client 4/4 verts. Mailpit vide et pile locale
  arrêtée après validation.
- Build local lancé mais bloqué uniquement par le téléchargement réseau des
  cinq polices Google historiques; aucun gain en kilo-octets n'est revendiqué.
- `git diff --check`, liens documentaires, tailles et gardes d'imports verts;
  staging resté vide.
- Changements concurrents du seed et des deux médias protégés et hors staging.

### Prochaine action unique

Découper `client/[id]/page.tsx` en orchestrateur mince.

## Entrée — 2026-07-19 — Page détail client réduite en orchestrateur mince

- `client/[id]/page.tsx` réduit de 660 à 31 lignes sans modifier son export,
  son URL ni le contrat public de `useClientDetail`.
- Composition des six onglets extraite dans `ClientDetailPageView` (314
  lignes); overlays profil, catalogue, IA et confirmation template isolés dans
  `ClientDetailPageOverlays` (315 lignes); états globaux dans une vue de 15
  lignes et contrat partagé de 8 lignes.
- Priorité et ordre aperçu/programme/progression/nutrition/messages/notes,
  textes français, responsive, animations, callbacks, notifications,
  chargements et erreurs conservés.
- Autorité relationnelle, requêtes, mutations, ordres d'écriture et lifecycle
  Messaging restent exclusivement dans les frontières existantes; aucune
  lecture Supabase ou dépendance repository ajoutée aux vues.
- Dette ESLint de la page : 4 erreurs/3 avertissements → 0/0; aucune nouvelle
  frontière ne dépasse 500 lignes.
- Tests statiques et rendu serveur ajoutés pour tailles, architecture, ordre,
  overlays, callbacks de fallback et imports interdits.
- Tests ciblés : 3 fichiers, 9 tests verts; suite Vitest complète : 152
  fichiers, 1 279 tests verts et 3 `todo`; TypeScript, types Supabase et ESLint
  ciblé verts.
- E2E coach/client : 4/4 verts; Mailpit vide et pile Supabase locale arrêtée
  après validation. `git diff --check` et liens documentaires verts; staging
  resté vide.

### Prochaine action unique

Ajouter la pagination aux listes coach importantes.

## Entrée — 2026-07-19 — Pagination des listes coach importantes

- Inventaire des clients, templates, affectations, paiements, rendez-vous,
  sessions, aliments, exercices et feedbacks réalisé; Messaging realtime exclu
  conformément à son contrat séparé.
- Templates Training sélectionnés comme seule liste visible extensible : page
  20, maximum 50, ordre `created_at DESC NULLS LAST, id ASC`, curseur opaque et
  rejet fail-closed des curseurs invalides.
- Repository paginé injecté, accumulation dédupliquée, verrou anti-double clic,
  invalidation des réponses obsolètes, retry initial/incrémental et conservation
  des pages déjà chargées ajoutés.
- Recherche et filtres locaux préservés en épuisant les pages après changement;
  UI mobile/desktop commune enrichie d'un bouton accessible « Charger plus ».
- Section Programmes : 2 requêtes initiales avant/après; maximum de lignes
  initiales 250 → 220 (templates 50 → 20, catalogue exercices 200 inchangé).
- Clients laissés complets et bornés à 100 car transversaux à messaging,
  calendrier et affectations; rendez-vous bornés par semaine, paiements et
  sessions conservés comme agrégats bornés, sans changement Stripe/Billing.
- Tests ciblés : 5 fichiers, 23 tests verts; suite Vitest complète : 154
  fichiers, 1 287 tests verts et 3 `todo`; TypeScript, types Supabase et
  nouvelles frontières ESLint verts.
- Dette ESLint historique de `CoachPrograms` : 14 erreurs/4 avertissements →
  12 erreurs/1 avertissement; aucun nouvel `any`, `select('*')`, client ou accès
  privilégié introduit.
- Matrice RLS/PostgREST verte et E2E coach/client 4/4 verts; Mailpit vide et
  pile locale arrêtée. `git diff --check` et liens documentaires verts;
  staging resté vide et changements concurrents hors périmètre.
- Checklist Phase 5 : 12/12. La phase reste formellement active car sa
  définition de terminé exige encore de démontrer une baisse globale d'au
  moins 20 % des requêtes initiales du dashboard; cette pagination à la demande
  réduit les lignes de la section Programmes mais pas les requêtes initiales du
  dashboard.

### Prochaine action unique

Valider puis atteindre la baisse de 20 % des requêtes initiales exigée par la
définition de terminé de Phase 5; la checklist est complète mais la phase reste
active tant que cette mesure globale n'est pas démontrée.

## Entrée — 2026-07-19 — Requêtes initiales du dashboard coach réduites

- Protocole Playwright local ajouté : connexion synthétique vers `/coach`,
  attente de Home stable, assets exclus, Auth/PostgREST/Realtime/routes Next
  classés séparément et trois fenêtres indépendantes.
- Baseline HTTP stable : 31/31/31; avec 2/2/3 ouvertures Realtime inchangées,
  total complet 33/33/34. PostgREST représentait 22 requêtes,
  dont des doubles lancements Strict Mode, une lecture relations redondante et
  le détail messaging non requis par Home.
- Coordination initiale rendue idempotente par coach avec génération; le
  compteur d'abonnés réutilise les relations actives et les réponses obsolètes
  sont ignorées.
- Compteurs non lus, polling et channel global restent eager. Le dernier
  message par contact passe par une frontière `idle/loading/success/empty/error`
  idempotente, réessayable et invalidée au changement de coach.
- Le calendrier reste chargé pour le planning Home mais n'est plus relu à
  chaque navigation de section; mutations et changement de semaine gardent
  leur refresh explicite.
- Mesure finale : 18/18/19 requêtes, dont 10 PostgREST, 2 Auth, 2/2/3
  Realtime, 3 routes Next et 1 navigation locale. Réduction par run :
  **45,455 % / 45,455 % / 44,118 %**, supérieure au seuil de 20 %.
- Tests ciblés : 13 fichiers, 64 tests verts; suite complète : 156 fichiers,
  1 294 tests verts et 3 `todo`; TypeScript, types Supabase, nouvelles
  frontières ESLint et matrice RLS/PostgREST verts.
- Rapport E2E de mesure vert avec première ouverture Messages = une lecture et
  retour = zéro lecture; E2E coach/client : 4/4 verts.
- Dette ESLint historique du contrôleur : 9 erreurs/3 avertissements avant,
  7 erreurs/4 avertissements après; avertissement `img` desktop historique.
- Liens et `git diff --check` verts; Mailpit vide, pile Supabase locale saine
  puis arrêtée sans reset, aucun serveur E2E sur le port 3210 et staging resté
  vide.
- Aucun changement d'autorité, route, migration, RLS ou donnée distante;
  fichiers concurrents du seed et médias protégés hors périmètre et staging.

### Prochaine action unique

Inventorier prompts, modèles et contrats de sortie.

## Entrée — 2026-07-20 — Inventaire des prompts, modèles et sorties IA

- Inventaire exhaustif de 15 points d'entrée IA runtime, 14 expressions
  d'appel fournisseur runtime et un appel SDK opérationnel hors runtime.
- Trois modèles runtime confirmés : `claude-haiku-4-5-20251001`,
  `claude-sonnet-4-6` et `claude-opus-4-8`; le backfill hors runtime conserve
  un `claude-opus-4-7` divergent.
- Contrats classés sur deux axes : 3 frontières à outil forcé, 8 endpoints à
  JSON extrait du texte, 2 endpoints à texte libre et 2 transports SSE MoovX;
  aucun streaming SDK Anthropic n'est utilisé.
- Pour chaque flux, route, consommateur, prompts, données envoyées, modèle,
  parseur, validation, autorité, quota, résilience, logs et couverture de test
  ont été recoupés avec le code réel.
- Les risques principaux sont l'absence de provider/registre communs, les
  sorties insuffisamment validées, les timeouts et erreurs hétérogènes, les
  journaux potentiellement sensibles et plusieurs décisions d'autorité ou
  usages service role à isoler.
- Les frontières locales existantes restent limitées au port Nutrition, au
  transport Athena, au mock Vitest partagé et au faux serveur E2E du chat;
  aucun appel fournisseur ou donnée distante n'a été utilisé.
- Documentation uniquement : aucune route, prompt, modèle, application, test,
  migration, policy ou tâche Phase 8 modifié; staging resté vide et fichiers
  concurrents protégés hors périmètre.

### Prochaine action unique

Définir l'interface commune du provider IA.

## Entrée — 2026-07-20 — Interface commune du provider IA

- Noyau `lib/ai/provider` créé sans dépendance React, Next.js, Supabase,
  Anthropic, navigateur, réseau ou `app/`; aucun des 15 flux runtime n'a été
  migré.
- API discriminée définie pour texte, JSON, outil et streaming, avec modèle
  demandé/réel, raison d'arrêt, usage tokens optionnel et correlation ID
  technique borné.
- Erreurs normalisées en sept codes expurgés : refus, quota, timeout, réseau,
  sortie invalide, inattendue et annulation; aucun contenu brut ne peut entrer
  dans le résultat public.
- Entrées bornées, validateur structuré injectable et fail-closed, scheduler et
  signal d'annulation injectés, aucun retry implicite ni fallback silencieux de
  modèle.
- Cycle de flux pur ajouté : sortie partielle suivie d'un unique terminal,
  annulation et nettoyage idempotents; le câblage réseau annulable reste la
  responsabilité du futur adaptateur.
- 13 tests ciblés verts pour variantes, bornes, validation, métadonnées,
  timeout, annulation, nettoyage et streaming; gardes statiques d'imports,
  confidentialité et absence de retry vertes.
- Suite Vitest complète : 158 fichiers, 1 307 tests verts et 3 `todo`;
  TypeScript et ESLint ciblé verts. Liens documentaires et `git diff --check`
  vérifiés; staging resté vide.
- Aucune route, consommateur, prompt, modèle, quota, migration, RLS, E2E ou
  donnée distante modifié; tâche Phase 8 restée décochée et changements
  concurrents protégés hors périmètre.

### Prochaine action unique

Centraliser timeouts, retries et erreurs.

## Entrée — 2026-07-20 — Politique commune de résilience IA

- Audit des 15 flux confirmé : aucun timeout/retry fournisseur serveur commun;
  seule l'analyse corporelle possède un retry 429 côté consommateur, et le port
  Nutrition ne fait que classifier un éventuel `AbortError`.
- Politique injectable créée avec budgets distincts par tentative/global,
  maximum 1 à 10 tentatives, backoff exponentiel plafonné, jitter déterministe
  et Retry-After en secondes ou date HTTP avec horloge injectée.
- Matrice fail-closed : refus, sortie invalide, inattendu et annulation jamais
  rejoués; quota uniquement avec Retry-After valide et autorisé; timeout/réseau
  uniquement pour une opération idempotente.
- JSON et outils exigent une clé d'idempotence pour tout retry; stream ayant
  émis un delta, opération non idempotente ou changement de modèle arrêtent la
  chaîne sans replay.
- Orchestrateur explicite `executeAiWithResilience`, contrôleur d'annulation,
  métadonnées primitives par tentative et sept terminaisons bornées ajoutés;
  `AiProvider` reste strictement mono-tentative.
- Timeout et annulation interrompent tentative ou backoff via ports injectés;
  timers/listeners sont nettoyés à terminaison unique et toute erreur inconnue
  devient `unexpected_error` sans contenu brut.
- Tests ciblés : 4 fichiers, 33 tests verts; suite Vitest complète : 160
  fichiers, 1 327 tests verts et 3 `todo`; TypeScript, ESLint ciblé, gardes
  d'architecture, liens et `git diff --check` verts.
- Aucun des 15 flux, route, consommateur, prompt, modèle, quota, mock, faux
  serveur, migration, RLS ou E2E modifié; staging vide, Phase 8 décochée et
  changements concurrents protégés hors périmètre.

### Prochaine action unique

Créer le registre des modèles et coûts.

## Entrée — 2026-07-20 — Registre des modèles et coûts IA

- Registre pur `lib/ai/models` créé pour les trois modèles runtime actifs
  (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `claude-opus-4-8`) et le
  modèle Opus 4.7 legacy du script opérationnel hors runtime.
- Identifiants logiques stables, identifiants fournisseur exacts, statuts,
  capacités, limites connues, usages observés et absence de remplacement
  décidé sont désormais centralisés sans modifier les 15 flux IA.
- Tarifs Anthropic officiels vérifiés le 20 juillet 2026 pour entrée, sortie,
  cache et batch; date d'effet, tarifs séparés outil/image et sortie maximale
  Opus 4.7 conservés explicitement à `null` faute de preuve suffisante.
- API publique ajoutée pour lister, obtenir et résoudre un modèle sans
  fallback, valider les usages, contrôler la fraîcheur des prix et estimer un
  coût `complete`, `partial`, `unavailable` ou `invalid`.
- Calcul monétaire déterministe en micros USD et `bigint`, avec reliquat exact
  sous le micro; zéro reste valide et les volumes négatifs, fractionnaires,
  non finis ou non sûrs sont refusés.
- Registre profondément immuable, doublons logique/fournisseur refusés,
  catégories cache/batch/outil/image séparées et erreurs sans prompt, secret
  ou contenu utilisateur.
- 14 tests ciblés verts, dont inventaire statique des trois identifiants
  runtime; suite Vitest complète : 162 fichiers, 1 341 tests verts et 3
  `todo`. TypeScript et ESLint ciblé verts.
- Liens documentaires, pureté, architecture et `git diff --check` vérifiés;
  aucune route, consommateur, prompt, modèle runtime, quota, migration, RLS ou
  E2E modifié. Staging vide, Phase 8 décochée et changements concurrents
  protégés hors périmètre.

### Prochaine action unique

Séparer les prompts du transport HTTP.

## Entrée — 2026-07-20 — Frontières de prompts IA

- Les 15 points d'entrée IA délèguent désormais la construction exacte de
  leurs prompts, messages, blocs multimodaux, outils et paramètres à
  `lib/ai/prompts`, sans migration vers `AiProvider` ni registre logique.
- Builders par domaine créés pour Athena, recettes et plan Nutrition
  séquentiel, analyse de repas, programmes Training legacy/moderne,
  suggestions/instructions/surcharge, analyses corporelles/photos et
  diagnostic hebdomadaire.
- Les paires programme Training route/cron et diagnostic manuel/cron partagent
  chacune le même builder parce qu'elles appellent réellement le même service;
  les branches photo bilan, simple et comparaison restent explicitement
  distinctes.
- Modèles, `max_tokens`, température, outil forcé, schémas, ordre des messages,
  media types, encodage, SSE, parsing, quotas, écritures et contrats HTTP sont
  préservés. Aucun retry, timeout, fallback ou fournisseur commun ajouté.
- Le builder Nutrition reçoit explicitement le jour et les protéines déjà
  utilisées; les sept journées, sorties vides et comportements partiels restent
  gérés par le service historique.
- Contrats profondément immuables, entrées non mutées, erreurs sans contenu
  brut et gardes interdisant fetch, SDK Anthropic, React, Next.js, Supabase,
  navigateur, environnement et `app/` dans le domaine pur.
- Tests ciblés : 4 fichiers, 27 tests verts; suite Vitest complète : 164
  fichiers, 1 356 tests verts et 3 `todo`. TypeScript et ESLint du noyau/tests
  verts.
- Liens documentaires et `git diff --check` vérifiés; aucune migration, RLS,
  E2E, modèle, quota ou service externe modifié/appelé. Staging vide, Phase 8
  décochée et changements concurrents protégés hors périmètre.

### Prochaine action unique

Définir les schémas Zod de sortie.

## Entrée — 2026-07-20 — Schémas Zod de sortie IA

- Frontière pure `lib/ai/schemas` créée par domaines Chat, Nutrition,
  Training, Progression et diagnostic, sans modifier les 15 points d'entrée.
- Contrats typés avec `z.infer` pour texte Athena et métadonnées, recette,
  journée Nutrition, photo repas, six sorties Training, analyse corporelle,
  trois variantes photo textuelles et diagnostic hebdomadaire.
- Objets structurés stricts, chaînes/tableaux bornés, nombres finis et plages
  métier; JSON tronqué, clés inconnues, valeurs négatives et non finies sont
  refusés sans coercition ni réparation silencieuse.
- Validation discriminée et expurgée ajoutée : seulement code, nombre d'issues
  et chemins bornés; aucun message Zod, prompt, payload ou contenu brut.
- Adaptateur vers `AiOutputValidator<T>` du provider commun et enveloppe outil
  exacte avec compatibilité du double `input` legacy caractérisé.
- Les divergences des parseurs actuels sont documentées; aucun parsing runtime,
  prompt, modèle, quota, route, consommateur, migration, RLS ou E2E modifié.
- Tests ciblés : 2 fichiers, 10 tests verts; contrat provider élargi : 4
  fichiers, 23 tests verts; suite complète : 166 fichiers, 1 366 tests verts
  et 3 `todo`. TypeScript et ESLint ciblé verts. Staging vide et changements
  concurrents protégés hors périmètre.

### Prochaine action unique

Centraliser parsing et validation structurée.

## Entrée — 2026-07-20 — Parsing et validation structurée IA

- Onze parseurs structurés inventoriés : sept JSON texte en routes, un JSON
  Nutrition séquentiel et trois outils partagés par routes/cron; Athena,
  photos de progression et framing SSE confirmés hors périmètre structuré.
- Noyau pur `lib/ai/parsing` créé avec décodage borné à 200 000 caractères,
  scanner JSON équilibré, fences optionnelles, validation Zod et résultats
  discriminés expurgés.
- Extraction outil stricte : nom exact, un seul bloc, absence/ambiguïté
  refusées; un wrapper `input` legacy accepté et double wrapper refusé.
- Recette, plan Nutrition, photo repas, suggestions/instructions, programmes
  legacy/moderne, adaptation, surcharge, corps et diagnostic migrés; les
  services modernes couvrent aussi leurs routes et cron respectifs.
- Contrats HTTP/SSE, plan Nutrition partiel, arrondis recette, jours de repos,
  résolution catalogue, ordre des écritures et notifications préservés.
- Durcissements documentés : clés/types/nombres invalides, JSON tronqué,
  sorties outil ambiguës ou partielles sont refusés sans fallback silencieux
  ni contenu brut dans les nouvelles erreurs ou logs.
- Tests ciblés parsing/schémas/services : 9 fichiers, 49 tests verts; suite
  complète : 169 fichiers, 1 378 tests verts et 3 `todo`; TypeScript, ESLint
  du noyau/tests et gardes d'architecture verts. Les consommateurs touchés
  conservent 17 erreurs `no-explicit-any` historiques, sans nouveau `any`.
- Aucun prompt, modèle, température, tokens, quota, timeout, retry, transport,
  migration, RLS ou E2E modifié; staging vide et changements concurrents
  protégés hors périmètre.

### Prochaine action unique

Unifier quotas et journalisation d'usage.

## Entrée — 2026-07-20 — Audit quotas et contrat d'usage IA (tâche ouverte)

- Matrice des 15 flux établie : 7 limites horaires DB, 4 quotas lourds
  glissants 30 jours, 1 flux journalisé sans limite effective et 7 flux sans
  quota DB; limites IP, rôles et principaux cron documentés séparément.
- Blocage confirmé : `ai_usage_logs` exécute `COUNT` puis `INSERT`, sans
  correlation ID, statut réservé ni finalisation; deux appels concurrents
  peuvent être autorisés et les insertions pré-fournisseur valent succès.
- Noyau pur `lib/ai/usage` créé avec 15 features stables, policies exactes,
  décisions discriminées, ports injectés, réservation/finalisation, horloge,
  événements bornés et coûts `bigint` issus du registre.
- Contrat testé pour concurrence à la dernière place, correlation dupliquée,
  double finalisation, panne fail-closed, périodes, tokens complets/partiels/
  absents, zéro explicite, modèle inconnu, coût et expurgation.
- Aucun adaptateur Supabase ni migration ajouté : la garantie atomique du port
  serait fausse avec le schéma courant. La migration additive/RPC minimale et
  ses exigences SECURITY DEFINER/RLS sont documentées sans backfill risqué.
- Tests ciblés usage/coûts : 4 fichiers, 24 tests verts; suite complète : 171
  fichiers, 1 388 tests verts et 3 `todo`; TypeScript et ESLint ciblé verts.
- La tâche roadmap reste ouverte; aucun quota, statut HTTP, endpoint
  `/api/ai-quota`, prompt, modèle, parsing, transport, migration, RLS ou E2E
  modifié. Staging vide et changements concurrents protégés.

### Prochaine action unique

Valider et implémenter la réservation atomique des usages IA, puis migrer les
consommateurs sans modifier leurs limites.

## Entrée — 2026-07-20 — Quotas et journalisation d'usage IA unifiés

- Migration additive `20260720190000_atomic_ai_usage.sql` appliquée sur les
  141 migrations locales : correlation, feature/policy, principal, statut,
  expiration, modèles, tokens, durée, tentatives et coût entier ajoutés sans
  modifier ni supprimer les colonnes ou lignes legacy.
- `reserve_ai_usage` sérialise par advisory locks transactionnels le couple
  utilisateur/feature et le quota lourd partagé. Les limites restent 7
  horaires historiques et 6 usages lourds sur 30 jours glissants; les lignes
  historiques continuent de compter via `endpoint`/`created_at`.
- Réservation répétée identique idempotente; correlation réutilisée avec une
  autre autorité, feature, policy ou modèle refusée. Les réservations orphelines
  comptent 15 minutes puis expirent.
- `finalize_ai_usage` accepte success/failed/cancelled, vérifie toute
  l'autorité et les métadonnées, distingue zéro et inconnu et rend une
  répétition identique idempotente, une contradiction conflictuelle.
- RLS/grants : anon sans accès; authenticated en SELECT propriétaire et RPC
  utilisateur seulement, sans mutation directe; fonctions internes et RPC
  serveur réservées à service-role; `search_path=''` sur SECURITY DEFINER.
- Adaptateur Supabase injecté, façade runtime, extraction sûre des métadonnées
  fournisseur et estimation en micros USD ajoutés sous `lib/ai/usage`. Aucun
  prompt, réponse, image, e-mail, body, secret ou erreur SQL brute n'est
  persisté ou propagé.
- Les 15 features sont raccordées : 13 flux utilisateur et les deux cron avec
  principal serveur explicite et utilisateur cible. Les limites IP, auth,
  rôles, modèles, prompts, sorties et ordres métier restent distincts; les flux
  sans quota sont journalisés sans limite ajoutée.
- Preuve SQL : succès, échec, annulation, expiration, lignes legacy,
  idempotence, contradictions, bornes et RLS verts. Preuve concurrente réelle :
  à 19/20, deux transactions produisent exactement un `allowed` et un
  `denied`; zéro fixture de correlation subsiste après nettoyage.
- Reset local reproductible vert, empreinte canonique
  `c91f7f48af4912cee446308775ccc717`; types Supabase régénérés et conformes;
  matrice RLS/PostgREST complète verte.
- Tests ciblés usage/routes verts; suite Vitest complète : 172 fichiers,
  1 395 tests verts et 3 `todo`; TypeScript vert. ESLint du nouveau module,
  des tests et du runner vert; l'audit des consommateurs retrouve 24 erreurs
  `no-explicit-any` historiques, sans nouvelle occurrence dans le diff. Phase
  8 reste décochée et
  les trois changements concurrents restent hors périmètre et hors staging.

### Dettes préservées

- `/api/ai-quota` reste un lecteur de compatibilité des succès lourds;
- tokens absents du transport restent inconnus; aucun zéro n'est inventé;
- la réponse métier n'est pas mise en cache par correlation ID;
- la migration des transports vers `AiProvider` commun reste volontairement
  séparée.

### Prochaine action unique

Migrer Chat, Recipes et Suggest Exercise.
