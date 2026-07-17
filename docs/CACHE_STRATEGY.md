# Stratégie de cache MoovX

> État audité le 16 juillet 2026. Ce document définit un contrat cible; il ne signifie pas que tous les consommateurs actuels l'appliquent déjà. Le registre déclaratif correspondant est [`lib/cache-policy.ts`](../lib/cache-policy.ts).

## Objectif et vocabulaire

Un cache accélère un affichage ou conserve temporairement une saisie. Il ne remplace jamais Supabase Auth, PostgreSQL/RLS, une RPC contrôlée, Stripe ou une autre autorité serveur. Une donnée affichée depuis un cache peut être fraîche, périmée mais encore présentable, ou expirée. Ces états sont distincts d'une erreur réseau et d'une absence confirmée.

- `freshForMs` : durée pendant laquelle une valeur peut être lue sans signal de péremption selon la stratégie du domaine.
- `retainForMs` : limite absolue après laquelle l'enveloppe doit être rejetée et purgée.
- `network_only` : aucun résultat applicatif conservé.
- `network_first` : le réseau est essayé en premier; un instantané autorisé peut servir d'état de repli.
- `cache_first` : le cache frais est lu en premier; le réseau est requis en cas de miss ou d'expiration.
- `stale_while_revalidate` : une valeur publique conservée peut être affichée pendant sa revalidation.
- cache négatif : mémorisation d'une absence confirmée. Une erreur, un timeout ou un refus RLS n'est jamais une absence.

Le registre est indépendant de React et de Supabase. Il décrit les règles, valide les invariants et fournit un format d'enveloppe et de clé. Il n'accède à aucun stockage et ne remplace pas encore [`lib/cache.ts`](../lib/cache.ts).

## État réel inventorié

L'inventaire statique du code applicatif et du service worker donne actuellement :

| Mécanisme | Occurrences mesurées | Usage réel principal |
|---|---:|---|
| `sessionStorage` | 12 | helper `lib/cache.ts`, dashboard client, jeton d'invitation |
| `localStorage` | 29 | préférences, brouillon/séance active, séries, courses et rappels |
| appels au helper `cache` | 18 | lecture, écriture et purge du cache dashboard |
| API Cache Storage | 2 | énumération puis suppression pendant l'activation du service worker |
| directives HTTP/Next explicites | 19 | `no-store`, routes dynamiques, SSE sans cache et métadonnées HTML |

Les `Map` mémoire de `useSignedUrl`, du rate limiter et du rapporteur d'erreurs sont des caches ou mécanismes de déduplication de durée de vie processus. Les états React des dashboards, relations, messages et analytics sont également temporaires mais ne constituent pas un contrat partagé. Les cookies Supabase Auth, `NEXT_LOCALE` et consentement ne sont pas des caches d'autorisation applicatifs.

Le service worker [`public/sw.js`](../public/sw.js) gère les notifications push. Il n'a aucun handler `fetch`; à l'activation, il supprime les Cache Storage existants. Il n'existe donc pas encore de cache offline applicatif.

### Cache dashboard client actuel

`useClientDashboard` utilise la clé `dashboard_${uid}` avec le préfixe `moovx_` ajouté par `lib/cache.ts`. L'enveloppe legacy contient `{ data, expiry }`, et `data` contient exactement :

- `ownerUserId` ;
- `profileData`, `weightsData`, `sessData`, `measureData`, `photosData` ;
- `coachProgData`, `coachMealData`, `customProgData` ;
- `sessionDatesData`, `hasTrainedBeforeVal`.

La lecture et l'écriture sont symétriques pour ces champs. Une lecture vérifie `ownerUserId` avant restauration; une enveloppe étrangère est supprimée. Le TTL est de cinq minutes. Un rafraîchissement forcé contourne le cache. Les complétions d'onboarding, générations initiales et diagnostics invalident la clé; la déconnexion purge tout le préfixe MoovX. Une erreur de lecture de profil conserve le dernier profil confirmé et ne devient pas une absence.

Limites connues : la clé et l'enveloppe n'ont pas de version de schéma, la purge est globale au préfixe, le helper accepte `any`, et le cache ne distingue pas fraîcheur de durée de rétention. Le registre cible formalise une clé versionnée, un propriétaire obligatoire et une horloge injectable sans modifier ce comportement dans cette tranche.

### Persistances locales actuelles

- `moovx_coach_invitation` conserve temporairement un jeton dans `sessionStorage`. Cela contredit le contrat cible « invitations : network-only » et doit être migré séparément sans exposer le jeton.
- `moovx_workout_draft` expire fonctionnellement après 24 heures grâce à `savedAt`, mais sa clé n'est ni versionnée ni liée à l'utilisateur.
- `moovx_active_workout`, les clés `moovx-sets-*`, `moovx-inputs-*`, `moovx-shopping-*` et `moovx-reminder-*` n'intègrent pas systématiquement propriétaire, version et expiration.
- `timerSound` est une préférence de terminal non sensible et sans TTL; elle ne doit pas devenir une preuve d'identité.
- le cache mémoire des URL signées utilise le chemin comme clé et anticipe l'expiration de 60 secondes; l'isolation par propriétaire dépend actuellement du caractère non partageable du chemin.

Ces écarts sont documentés, pas corrigés ici. Les tests d'inventaire dans [`tests/unit/cache-strategy-inventory.test.ts`](../tests/unit/cache-strategy-inventory.test.ts) empêchent de présenter silencieusement le legacy comme conforme au contrat cible.

## Registre par domaine

Les durées sont des maxima initiaux, à réviser à partir de mesures. « Affichage seul » signifie que toute opération sensible revalide l'autorité serveur.

| Domaine | Source de vérité | Stockage autorisé | Frais / rétention max. | Stratégie | Invalidation principale | Offline et erreur | Autorité |
|---|---|---|---:|---|---|---|---|
| Identité/session | Supabase Auth serveur, JWT vérifié | aucun | 0 / 0 | réseau seul | logout, changement Auth/identité | indisponible, échec fermé | serveur |
| Profil | `profiles` sous RLS/repository | mémoire, session utilisateur | 5 min / 5 min | cache d'abord (état actuel) | logout, identité, profil, onboarding | instantané affichable; erreur ≠ absence | serveur, affichage seul |
| Abonnement/rôle/autorisation | profil, abonnement, relation active vérifiés serveur | mémoire | 30 s / 1 min | réseau d'abord | rôle, abonnement, relation, identité | opérations protégées fermées | serveur |
| Dashboard client | tables profil/training/mesures/plans sous RLS | mémoire, session utilisateur | 5 min / 5 min | cache d'abord | onboarding, génération, diagnostic, refresh, logout | instantané marqué périmé; mutations serveur | serveur, affichage seul |
| Dashboard coach/relations | `coach_clients` actifs et lectures liées | mémoire | 30 s / 2 min | réseau d'abord | relation, identité, refresh | affichage processus seulement; écritures fermées | serveur |
| Programmes/séances/progression | tables serveur; brouillon local avant synchro | mémoire, local utilisateur | 1 j / 7 j | réseau d'abord | fin/abandon séance, programme, identité | brouillon versionné « non synchronisé » | serveur pour persisté, saisie locale pour brouillon |
| Nutrition/référentiel privé | tables nutrition et plans sous RLS | mémoire | 5 min / 30 min | réseau d'abord | plan/log nutrition, identité | lecture périmée signalée; erreur ≠ plan vide | serveur |
| Messaging/Athena | messages autorisés et frontière fournisseur serveur | mémoire | 0 / 5 min | réseau d'abord | message, suppression, identité | aucun prompt/conversation persistant | serveur |
| Invitations | contrat serveur à usage unique et RPC | aucun | 0 / 0 | réseau seul | consommation, expiration, révocation | aucune vérification offline; erreur distincte d'invalide | serveur |
| Push | PushManager et `push_subscriptions` autorisées | aucun cache applicatif | 0 / 0 | réseau seul | logout, révocation, 404/410 | livraison navigateur uniquement | serveur/navigateur |
| Paiements/Stripe | Stripe et données réconciliées serveur | aucun | 0 / 0 | réseau seul | checkout, webhook, abonnement, remboursement | état inconnu, jamais « payé » par défaut | serveur |
| Catalogues publics | catalogues versionnés exercices/recettes/i18n | mémoire, cache serveur, Cache Storage | 1 h / 1 j | stale-while-revalidate | version catalogue, déploiement | version publique retenue possible | source publique |

Le détail exécutable (scope, sensibilité, erreurs et événements complets) se trouve dans `CACHE_POLICY_REGISTRY`. Les douze domaines sont obligatoires et uniques.

## Clés, enveloppes et isolation

La forme cible d'une clé est :

```text
moovx-cache:v<version>:<domain>:<user-id|public>:<resource-encodée>
```

Une enveloppe cible porte `keyVersion`, `ownerUserId` pour tout domaine utilisateur, `storedAt`, `freshUntil`, `expiresAt`, `kind` et `data`. À la lecture :

1. rejeter une version différente ;
2. rejeter un propriétaire absent ou différent ;
3. rejeter toute enveloppe de type `error` ;
4. n'accepter `confirmed_not_found` que si le domaine l'autorise ;
5. rejeter une chronologie incohérente ou expirée ;
6. distinguer `fresh` de `stale` à partir d'une horloge injectée.

Une donnée privée persistante est purgée au logout et au changement d'identité, y compris après expiration. Un changement de version rend les anciennes clés illisibles; une migration explicite est requise si un brouillon utilisateur doit être conservé.

## Règles de sécurité

- Ne jamais stocker en cache applicatif : mot de passe, cookie/session brute, JWT, clé service-role, secret fournisseur, jeton d'invitation, payload push chiffré ou données de carte.
- Les décisions de rôle, abonnement, relation coach/client, paiement, entitlement et administration sont toujours recalculées côté serveur. Un cache peut afficher un libellé mais ne peut autoriser une route, une mutation ou une navigation protégée.
- Aucun domaine critique ne persiste dans `sessionStorage`, `localStorage` ou Cache Storage.
- Toute donnée privée est liée à un utilisateur vérifié. Les clés anonymes sont réservées aux données réellement publiques.
- Le cache négatif est interdit après erreur réseau, timeout, erreur Supabase/RLS ou réponse fournisseur malformée. Seule une absence confirmée par la source de vérité peut être retenue, pour une durée bornée.
- Les erreurs et journaux ne doivent pas inclure contenu de profil complet, conversation, cookie, jeton, endpoint push complet ou référence de paiement sensible.
- Cache Storage et service worker ne peuvent servir que des ressources publiques versionnées tant qu'un contrat d'isolation privée dédié n'existe pas.
- Une politique sans événement d'invalidation doit fournir une justification explicite; le registre la refuse sinon.

## Validation automatisée

[`tests/unit/cache-policy.test.ts`](../tests/unit/cache-policy.test.ts) vérifie :

- couverture et unicité des domaines ;
- TTL finis, positifs et ordonnés ;
- scope utilisateur des données privées ;
- absence de persistance navigateur critique ;
- autorité serveur pour identité, rôle/abonnement, relations et paiements ;
- événements de purge des caches utilisateurs persistants ;
- refus du cross-user, des versions obsolètes, des erreurs mises en cache et des négatifs interdits ;
- clés versionnées et horloge injectable.

Commandes ciblées :

```bash
npx vitest run tests/unit/cache-policy.test.ts tests/unit/cache-strategy-inventory.test.ts
npx eslint lib/cache-policy.ts tests/unit/cache-policy.test.ts tests/unit/cache-strategy-inventory.test.ts
npx tsc --noEmit
```

## Adoption progressive

Cette tranche ne migre aucun consommateur. L'ordre recommandé est :

1. ajouter une enveloppe typée compatible autour du dashboard client et mesurer les hits/miss sans changer le TTL ;
2. lier et versionner les brouillons training avant toute évolution de leur rétention ;
3. retirer le jeton d'invitation du stockage navigateur avec un parcours de transition testé ;
4. spécialiser les caches mémoire coach, nutrition et messaging après extraction de leurs repositories ;
5. introduire un cache public service worker seulement après inventaire des ressources et budget offline ;
6. ne jamais introduire de cache client pour l'autorité Billing ou les autorisations.

Chaque migration doit ajouter des tests de propriétaire, version, expiration, invalidation et erreur réseau, puis comparer le comportement avant/après. Une stratégie n'est pas une permission implicite de conserver davantage de données.

## Liens associés

- [Factories Supabase typées](SUPABASE_CLIENT_FACTORIES.md)
- [Repositories Supabase](SUPABASE_REPOSITORIES.md)
- [Migration des accès représentatifs](SUPABASE_ACCESS_MIGRATION.md)
- [Stratégie de tests](TESTING_STRATEGY.md)
- [Matrice RLS](RLS_TEST_MATRIX.md)
