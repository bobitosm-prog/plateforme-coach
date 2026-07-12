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
