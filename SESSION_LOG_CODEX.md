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
