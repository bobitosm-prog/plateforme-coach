# Audit complet MOOVX — 17 septembre 2026

## 1. Verdict exécutif

**Statut recommandé : NO-GO commercial en l'état.**

L'application est nettement plus avancée que ne le laisse penser l'ancien audit d'avril. Le socle fonctionnel existe, la compilation de production passe, 1 606 tests automatisés passent et les parcours modernes d'onboarding, de génération d'entraînement, de génération nutritionnelle et d'Athena sont cohérents dans leur intention.

En revanche, quatre catégories de risques empêchent encore de considérer le produit comme prêt à vendre :

1. **Sécurité critique des paiements** : deux routes Stripe sensibles ne vérifient pas l'identité de l'appelant et font confiance aux identifiants envoyés par le navigateur.
2. **Intégrité des données** : plusieurs modèles concurrents décrivent le même concept, les migrations locales et la base distante ont dérivé, et certaines écritures ne sont ni atomiques ni contraintes en base.
3. **Sécurité nutritionnelle et scientifique** : le calcul calorique n'impose pas de plancher de sécurité et l'onboarding ne collecte pas assez de contre-indications de santé.
4. **Preuve de fonctionnement réel insuffisante** : la base contient très peu d'usage réel et presque aucune donnée nutritionnelle ou Athena. Les tests unitaires sont excellents, mais le parcours complet utilisateur et le paiement Stripe LIVE ne sont pas prouvés.

### Score de maturité

| Domaine | Score | Verdict |
|---|---:|---|
| Produit et parcours client | 78/100 | Fonctionnel, quelques parcours hérités à retirer |
| Entraînement | 82/100 | Bon moteur et bonne persistance, atomicité à renforcer |
| Calories et nutrition | 68/100 | Génération robuste, garde-fous et suivi incomplets |
| Athena et gouvernance scientifique | 72/100 | Bonne architecture de contexte, preuves et traçabilité à élargir |
| Données et architecture Supabase | 55/100 | RLS généralisée, mais duplication et dérive importantes |
| Sécurité applicative | 52/100 | Plusieurs anciens problèmes corrigés, deux failles Stripe P0 |
| Qualité et tests | 76/100 | Tests/build/i18n verts, lint très rouge |
| Observabilité et exploitation | 60/100 | Fondations présentes, protections et procédures incomplètes |
| Préparation commerciale | 54/100 | Bêta contrôlée possible après P0, vente publique prématurée |
| **Score global pondéré** | **65/100** | **Produit prometteur, pas encore commercialisable** |

Le score n'est pas une mesure scientifique. Il sert à prioriser le risque : une seule faille P0 suffit à maintenir le verdict NO-GO, même avec une moyenne correcte.

Ce score porte sur le code actuel audité à `8f506a96` (`origin/main`), pas sur
la branche historique `phase-6-staging` utilisée pour les validations des
Phases 9 et 10.

## 2. Périmètre et preuves examinées

L'audit couvre :

- le dépôt applicatif réel `/Users/marcoferreira/plateforme-coach-app` ;
- le dépôt média séparé `/Users/marcoferreira/Documents/ChatGPT/plateforme-coach-app` ;
- le schéma et les politiques de la base Supabase distante ;
- les routes serveur Next.js/Vercel ;
- l'onboarding client V2 et les anciens parcours ;
- les données profil, poids, calories, entraînement, nutrition et Athena ;
- les tests, le build, les traductions, la qualité statique et la documentation projet ;
- les avertissements Security Advisor et Performance Advisor Supabase.

### Validations exécutées

| Validation | Résultat |
|---|---|
| Tests automatisés | **PASS** — 168 fichiers, 1 606 tests |
| Build de production Next.js | **PASS** — compilation, TypeScript et génération des pages |
| Cohérence i18n | **PASS** — 3 158 clés × 3 langues |
| Lint | **FAIL** — 895 problèmes : 627 erreurs et 268 avertissements |
| Schéma/RLS Supabase | **Inspecté** — 62 tables publiques, RLS activée sur les 62 |
| Test E2E navigateur sur compte vierge | **Non exécuté** — pas de compte de test dédié et aucune écriture de production autorisée |
| Paiement Stripe LIVE | **Non exécuté** — aucune transaction réelle effectuée pendant l'audit |

La branche auditée est alignée sur `origin/main` et l'arbre de travail était propre avant la création de ce rapport.

## 3. Architecture réellement en place

Le backend applicatif n'est pas constitué d'Edge Functions Supabase. Il repose principalement sur **58 routes API Next.js déployées sur Vercel**, avec Supabase pour l'authentification, PostgreSQL, RLS et le stockage. L'absence d'Edge Functions n'est donc pas une anomalie en soi.

```text
Navigateur / PWA
  ├─ Auth Supabase
  ├─ lectures/écritures directes protégées par RLS
  └─ routes API Next.js / Vercel
       ├─ Anthropic : plans, recettes, Athena
       ├─ Stripe : checkout, Connect, webhooks
       └─ Supabase service_role : opérations serveur privilégiées

Supabase
  ├─ 62 tables publiques avec RLS
  ├─ Storage : photos et médias exercices
  └─ fonctions SQL / triggers / politiques
```

Le modèle est viable, à condition que chaque route Vercel privilégiée impose authentification, autorisation métier, validation d'entrée et limitation de débit. Ce contrat n'est pas encore respecté partout.

## 4. Parcours client complet

### 4.1 Inscription et routage

Le routage post-authentification différencie :

- client récent incomplet → `/onboarding-v2` ;
- ancien client incomplet → ancien enchaînement fitness, profil, photo ;
- coach incomplet → `/onboarding-coach` ;
- profil complet → application ;
- super administrateur → exemption d'onboarding.

Le serveur valide l'identité auprès de Supabase avec `getUser()` avant les décisions protégées. C'est le bon pattern.

**Faiblesses :**

- les anciens parcours restent présents et peuvent continuer à produire des données avec une sémantique différente ;
- l'exemption administrateur conserve un fallback d'adresse e-mail dans le code, au lieu de s'appuyer exclusivement sur un rôle ;
- le garde de route côté client utilise la session locale, même si les écritures restent protégées par RLS ;
- les documents de parcours sont plus anciens que le code et ne constituent plus une source fiable.

### 4.2 Onboarding V2 solo

Le parcours solo actuel comporte cinq étapes :

| Étape | Données principales enregistrées |
|---|---|
| Objectif | objectif canonique, identifiant d'objectif initial, version du contrat Athena |
| Profil | nom, naissance, genre, poids actuel/départ/cible, taille, premier journal de poids |
| Entraînement | séances/semaine, expérience, activité, lieu et équipement |
| Nutrition | type alimentaire, habitudes, préférences par repas, aliments refusés, restrictions libres |
| Cibles | TDEE, calories, protéines, glucides, lipides, onboarding terminé, génération initiale demandée |

Une photo corporelle est facultative et stockée séparément. Le flux coaché ne déclenche pas les générations automatiques : le coach garde la responsabilité du programme, ce qui est cohérent.

**Points forts :**

- objectif original préservé en plus de l'objectif normalisé ;
- contexte Athena construit à partir des données serveur, pas à partir d'un contexte arbitraire envoyé par le navigateur ;
- reprise d'étape et sauvegarde progressive ;
- distinction nette entre client autonome et client géré par un coach ;
- tests importants autour du routage et des transformations.

**Faiblesses et améliorations :**

| Gravité | Constat | Amélioration |
|---|---|---|
| P0 | Aucun écran ne recueille grossesse, troubles alimentaires, pathologie, médicament, blessure/douleur ou contre-indication avant de produire des recommandations | Ajouter un screening de sécurité, un refus explicite d'automatisation et une orientation professionnelle en cas de drapeau rouge |
| P1 | Les cinq étapes ne forment pas une transaction ; un profil peut être marqué complet malgré un héritage incomplet | Ajouter une validation serveur finale et une fonction atomique de finalisation |
| P1 | Le genre est binaire et sert directement au calcul Mifflin | Distinguer identité de genre et paramètre physiologique de calcul, avec option de calcul encadrée |
| P1 | Les restrictions alimentaires sont du texte libre injecté dans un prompt | Normaliser les valeurs, limiter la taille, filtrer et isoler strictement ces données dans le prompt |
| P1 | Les anciens parcours peuvent écrire un `tdee` qui représente en réalité les calories ajustées | Rendre les anciennes routes inaccessibles après migration, corriger les données historiques |
| P2 | Version de consentement insuffisamment traçable | Stocker versions CGU, confidentialité, consentement IA/santé et horodatage |
| P2 | Plusieurs anciens composants d'onboarding restent dans le dépôt | Supprimer seulement après migration et preuve de non-utilisation |

### 4.3 Cohérence réelle des profils

La base observée contient **3 comptes confirmés et 3 profils marqués onboarding terminé**, mais :

- aucune ligne TDEE dans la table dédiée ;
- 3 profils avec objectif calorique ;
- aucun profil avec le jeu complet de macros détecté par l'audit ;
- une seule relation coach-client.

Cela montre que `onboarding_completed = true` n'est pas une preuve suffisante de complétude métier. Un contrat de complétude doit être validé côté serveur avant d'autoriser les générations.

## 5. Calories et objectifs macro

Le calcul principal utilise Mifflin–St Jeor, un facteur d'activité, puis :

- perte de graisse : environ −400 kcal ;
- maintien : 0 kcal ;
- prise de masse : environ +300 kcal ;
- protéines : 1,8 à 2,2 g/kg selon l'objectif ;
- lipides : 0,8 à 1,0 g/kg ;
- glucides : solde calorique.

### Risques

1. **Pas de plancher calorique** relatif au métabolisme basal ni de seuil absolu prudent. Un profil extrême peut recevoir une cible trop basse.
2. **Pas de traitement du poids corporel ajusté** pour les cas d'obésité importante ; les protéines calculées uniquement au poids réel peuvent être inadaptées.
3. **Trois doctrines concurrentes** existent : ancienne onboarding, onboarding V2 et modal BMR, avec des déficits/surplus différents.
4. **Pas de validation médicale** pour les cas à risque.
5. **Pas de version du moteur de calcul** attachée aux cibles enregistrées ; il sera difficile d'expliquer pourquoi une cible historique a été produite.

### Cible recommandée

Créer un service unique versionné `calorie_target_engine`, utilisé par l'onboarding, le recalcul et Athena. Il doit produire : résultat, hypothèses, formule, version, avertissements, bornes appliquées et motif de refus éventuel. Les seuils exacts doivent être validés par un professionnel compétent avant commercialisation.

## 6. Entraînement

### Ce qui est solide

- génération uniquement après authentification, capacité d'abonnement et quota ;
- contexte profil rechargé côté serveur ;
- politique explicite contre les stéréotypes de genre ;
- contraintes de volume, nombre de jours, exercices, séries, tempo et technique ;
- tentative de correspondance avec le catalogue d'exercices ;
- persistance locale d'une séance en cours, réutilisation de l'identifiant distant et finalisation prudente ;
- progression fondée sur les séances précédentes, les répétitions et le RIR ;
- bonne couverture de tests sur les règles sensibles.

### Données observées

La base contient 1 séance, 9 séries, 6 records personnels, 1 badge utilisateur et 1 ligne d'XP. Cela confirme le fonctionnement minimal, mais pas la robustesse à l'échelle.

### Faiblesses

| Gravité | Constat | Impact |
|---|---|---|
| P1 | Remplacement d'un programme en plusieurs écritures non transactionnelles | Deux programmes actifs possibles en concurrence ou après panne |
| P1 | Pas de contrainte unique garantissant un seul plan actif par utilisateur | L'intégrité dépend du code applicatif |
| P1 | Plusieurs familles de tables représentent les programmes | Risque de lecture/écriture dans le mauvais modèle |
| P1 | `program_days.program_id` référence `training_programs`, alors que certaines politiques consultent `custom_programs` | Chemin normalisé incohérent ou partiellement abandonné |
| P1 | Beaucoup de références d'exercice restent textuelles | Renommage, historique et média fragiles |
| P1 | Les seuils de progression RIR ne sont pas encore validés formellement par un coach | Risque de recommandations trop agressives ou trop conservatrices |
| P2 | Un exercice généré peut rester sans `exercise_id` | Média, consignes et statistiques non garantis |

### Médias exercices

Le catalogue distant contient 176 exercices. Au moment de l'audit :

- 25 exercices disposent d'une image ;
- 26 disposent d'une URL vidéo ;
- 151 n'ont pas d'image ;
- aucun exercice n'est marqué approuvé ;
- 26 objets seulement sont présents dans le stockage, pour environ 4,15 Mo.

Le dépôt média documente également des doublons et incohérences d'équipement. **Le catalogue n'est pas prêt pour une expérience premium.** Le bucket public et la politique de lecture large doivent aussi être assumés explicitement ou resserrés.

## 7. Nutrition

### Génération de plan

Le nouveau moteur est l'un des points forts du produit :

- authentification, quota et capacité d'abonnement ;
- sept journées générées puis contrôlées ;
- recalcul déterministe des calories et macros à partir de 77 aliments de référence ;
- rejet des aliments inconnus et des allergènes détectés ;
- ajustement des quantités et nouvelle tentative en cas d'écart ;
- lecture de confirmation après persistance.

### Limites importantes

1. **Référentiel étroit** : 77 aliments ne suffisent pas pour une expérience multiculturelle, végétalienne variée ou durable sur plusieurs semaines.
2. **Provenance nutritionnelle faible** : le fichier mentionne CIQUAL/USDA, mais chaque valeur ne porte ni source, ni version, ni date.
3. **Suivi des repas débranché** : le modèle du dashboard initialise actuellement `tracking` à une liste vide au lieu de charger `meal_tracking`. Le statut “repas réalisé” ne reflète donc pas la base.
4. **Chemin hérité probablement cassé** : le hook historique de journal alimentaire ignore l'erreur d'insertion avant d'afficher un succès ; il écrit aussi d'anciens noms de colonnes pour les aliments personnalisés, incompatibles avec le schéma actuel.
5. **Plusieurs implémentations d'ajout d'aliment** coexistent, avec des validations et comportements d'erreur différents.
6. **Remplacement non atomique** : le nouveau plan est créé, puis les anciens sont désactivés. L'échec du nettoyage est toléré et peut laisser plusieurs plans actifs.
7. **Compatibilité de schéma dans le code** : la persistance essaie à la fois `plan_data/is_active` et `plan/active`. C'est une preuve de dérive non résolue entre environnements.
8. **Données de production absentes** : aucune ligne significative n'a été observée dans les tables de plan, repas, eau ou catalogue utilisateur.

## 8. Athena

### Architecture actuelle

Athena applique plusieurs principes sains :

- authentification serveur ;
- contexte déclaré reconstruit depuis le profil ;
- contexte observé séparé sur des fenêtres explicites : entraînement 28 jours, nutrition 14 jours, poids 28 jours, bien-être 14 jours ;
- avertissements lorsque la couverture est insuffisante ;
- historique stocké côté serveur ;
- l'utilisateur ne peut écrire que ses messages, l'assistant est écrit par un chemin de confiance ;
- politique de sécurité avec drapeaux rouges et interdiction de diagnostic médical ;
- base de preuves versionnée.

### Faiblesses

| Gravité | Constat | Amélioration |
|---|---|---|
| P1 | Base scientifique limitée à quatre grandes sources | Élargir par domaine, versionner, dater la revue et nommer le validateur |
| P1 | Réponse finale libre, sans schéma structuré | Ajouter recommandation, niveau de confiance, sources, limites, données manquantes et red flags |
| P1 | Les citations demandées au modèle ne sont pas validées | Vérifier que chaque citation appartient à la bibliothèque autorisée |
| P1 | Pas de conversation/session explicite ; historique limité aux derniers messages globaux | Ajouter `conversation_id`, résumé et politique de rétention |
| P1 | Les diagnostics hebdomadaires peuvent être écrits/modifiés par l'utilisateur propriétaire | Réserver l'écriture au serveur/coach de confiance |
| P1 | La limitation IP est en mémoire et donc locale à une instance serverless | Utiliser un store partagé et compter aussi les appels fournisseur échoués |
| P2 | Peu de données observées de santé, douleur, blessure ou médicaments | Étendre le contrat de contexte avec consentement et minimisation des données |
| P2 | Aucune donnée Athena réelle en base au moment de l'audit | Lancer une bêta instrumentée avant de conclure sur la qualité |

Athena est une bonne fondation, mais pas encore un système de recommandation auditable au sens fort. Aujourd'hui, il peut expliquer en langage naturel ; il ne peut pas encore prouver systématiquement quelle règle et quelle source ont conduit à chaque conseil.

## 9. Données, schéma et migrations

### État général

- 62 tables publiques ;
- RLS activée sur les 62 ;
- 15 versions présentes dans l'historique de migrations distant ;
- environ 130 fichiers de migrations dans le dépôt applicatif ;
- les migrations média récentes du dépôt séparé ne figurent pas dans l'historique distant, alors que certaines colonnes/données sont présentes.

**Conclusion : la base et les dépôts ont dérivé.** Des changements ont vraisemblablement été appliqués manuellement. Une restauration reproductible depuis les migrations n'est pas prouvée.

### Duplications structurantes

| Concept | Modèles concurrents |
|---|---|
| Analyse corporelle | `body_analyses`, `body_assessments` |
| Profil physique | `birth_date/date_of_birth`, `height/height_cm`, `start_weight/starting_weight/current_weight` |
| Programmes | `client_programs`, `custom_programs`, `training_programs`, `user_programs`, `workouts` |
| Plans nutritionnels | `client_meal_plans`, `meal_plans`, `nutrition` |
| Journal alimentaire | `daily_food_logs`, `meal_logs`, `meal_tracking` |
| Catalogue aliments | `fitness_foods`, `food_items`, `community_foods`, `custom_foods` |

D'autres incohérences persistent : mélange de timestamps avec/sans fuseau, références d'exercices par texte et par UUID, JSONB et tables normalisées pour le même domaine.

### RLS et fonctions SQL

**Positif :** toutes les tables publiques ont RLS et les relations coach-client récentes vérifient une relation active.

**À corriger :**

- nombreuses politiques doublées ou superposées ;
- une politique d'administration repose sur une adresse e-mail codée en base au lieu du rôle `super_admin` ;
- `app_logs` accepte des insertions anonymes lorsque `user_id` est nul ;
- certaines données dérivées par l'IA sont modifiables par leur propriétaire ;
- 19 fonctions `SECURITY DEFINER` sont signalées avec des droits d'exécution trop larges ;
- trois fonctions ont un `search_path` mutable ou non fixé ;
- la protection Supabase contre les mots de passe compromis est désactivée.

Supabase remonte **26 avertissements de sécurité**, **639 avertissements de performance** et **82 suggestions**. Une part importante de la dette performance vient des politiques qui appellent `auth.uid()` directement au lieu de `(select auth.uid())`, ainsi que de politiques redondantes et de clés étrangères potentiellement non indexées.

## 10. Sécurité API et paiements

### P0 — bloquants absolus

#### `/api/stripe/checkout`

La route ne vérifie pas l'utilisateur connecté et fait confiance à `clientId` et `coachId` reçus dans le corps. Elle utilise ensuite les privilèges serveur pour créer une session Stripe et une ligne de paiement.

**Risque :** création de sessions et de données de paiement pour un autre utilisateur, pollution de la comptabilité et confusion d'identité.

#### `/api/stripe/connect`

La route ne vérifie pas l'utilisateur connecté et fait confiance à `coachId`, à l'e-mail et à un éventuel identifiant de compte Stripe. Elle peut créer un compte Connect, modifier le profil ciblé et créer un lien d'onboarding.

**Risque :** modification du compte Stripe d'un coach arbitraire et détournement du parcours Connect.

### Autres écarts

| Gravité | Route/surface | Problème |
|---|---|---|
| P1 | `/api/stripe/setup-products` | Un abonnement `lifetime` suffit ; l'autorisation devrait être `super_admin` uniquement |
| P1 | `/api/vitals` | Pas d'authentification, de limite de débit ou de bornes strictes d'entrée |
| P1 | `/api/log-error` | Journalisation anonyme + limitation mémoire seulement, pollution possible |
| P1 | Invitation publique | Validation sans limite de débit partagée |
| P1 | Rate limiting IA | Certaines limites échouent en mode ouvert ; la couche IP mémoire ne couvre pas plusieurs instances |

### Anciennes failles désormais corrigées

L'ancien audit d'avril n'est plus une photographie fiable. Ont notamment été renforcés : suppression de compte, désactivation de l'ancienne affectation de coach, authentification des notifications, autorisation de la route Athena et séparation des écritures utilisateur/assistant. Il ne faut donc pas réutiliser son score de 62/100 comme score actuel.

## 11. Qualité logicielle, performance et maintenabilité

### Forces

- 1 606 tests passent ;
- build production et TypeScript passent ;
- traductions cohérentes sur trois langues ;
- composants et services sensibles disposent de tests ciblés ;
- le dépôt principal possède un historique et un remote propres.

### Dette

- lint : 627 erreurs et 268 avertissements ;
- nombreux `any`, variables inutilisées, mises à jour d'état dans des effets, images non optimisées et erreurs JSX ;
- plusieurs fichiers entre 800 et 1 400 lignes ;
- logique dashboard, nutrition et builder trop concentrée ;
- documentation `ROADMAP`, `NEXT` et `SESSION_LOG` partiellement obsolète ou contradictoire ;
- dépôt média séparé sans remote ni historique applicatif commun.

Le build vert n'annule pas le lint rouge. Le build prouve que la maison tient debout ; le lint montre que de nombreux câbles restent exposés. Pour éviter une refactorisation massive et risquée, il faut corriger d'abord les fichiers du périmètre réconcilié et imposer zéro nouvelle erreur.

## 12. Phases 9 et 10 officielles retrouvées

### Correction du premier constat

Codex avait bien créé une roadmap précise. Elle se trouve dans l'historique et
sur la branche `phase-6-staging`, notamment dans `ROADMAP_CODEX.md`,
`SESSION_LOG_CODEX.md`, `docs/PHASE_9_FINAL_BASELINE.md` et
`docs/ROADMAP_NEXT.md`. Ces fichiers ne sont pas présents sur la branche
`origin/main` auditée, d'où leur absence lors de la première recherche limitée
au worktree courant.

### Divergence de branches à traiter en premier

| Référence | SHA observé | Situation |
|---|---|---|
| Code applicatif audité / `origin/main` | `8f506a96` | 175 commits propres après la base commune |
| Roadmap et travaux Phase 9/10 / `phase-6-staging` | `3000c574` | 416 commits propres après la base commune |
| Base commune | `8b566f3f` | Dernier ancêtre partagé |

Ces branches ne sont pas une simple avance/retard : elles ont divergé. Des
correctifs déclarés terminés dans la roadmap staging, notamment autour de
Stripe, ne sont pas présents dans la route correspondante de `origin/main`.
Inversement, les évolutions récentes nutritionnelles de `origin/main` ne sont
pas automatiquement couvertes par les preuves Phase 9 historiques.

**Conséquence :** les preuves Phase 9 restent valides pour le SHA et
l'environnement qu'elles documentent, mais elles ne peuvent pas être
transférées automatiquement au code actuel. La priorité est un audit de
promotion entre les deux lignées, pas la recréation d'une nouvelle Phase 9.

## Phase 9 officielle — Industrialisation et équipe future

**Statut versionné : `PHASE_9_COMPLETE_WITH_MONITORING_PENDING`.** Les travaux
structurels étaient déclarés terminés ; deux preuves dépendantes du temps ou de
données organiques restaient ouvertes.

### Les 15 travaux enregistrés

| # | Travail Phase 9 | État documenté |
|---:|---|---|
| 1 | Étendre la suite à 15 parcours E2E critiques | Terminé sur la branche staging |
| 2 | Tester toutes les migrations depuis une base vide | Terminé, 149/149 sur deux reconstructions locales |
| 3 | Vérifier l'alignement migrations locales/staging | Terminé, 145/145 selon le contrat staging de l'époque |
| 4 | Définir la procédure de release | Terminé |
| 5 | Définir et répéter le rollback | Terminé en Preview, environ 177 secondes |
| 6 | Créer la checklist de revue de code | Terminé |
| 7 | Finaliser l'onboarding développeur | Terminé |
| 8 | Finaliser les ADR et la carte des domaines | Terminé |
| 9 | Ajouter les quality gates CI progressifs | Structure terminée, preuve statistique en monitoring |
| 10 | Supprimer les feature flags expirés | Terminé dans le périmètre démontré |
| 11 | Supprimer les adaptateurs legacy sans trafic | Terminé dans le périmètre démontré |
| 12 | Établir la coexistence Training canonique/legacy | Technique terminée, runtime revenu à `legacy-only` |
| 13 | Retirer les dépendances inutilisées | Terminé, 55 → 41 dépendances directes |
| 14 | Exécuter un test de charge ciblé | Terminé pour deux scénarios locaux bornés |
| 15 | Produire la baseline finale et la roadmap suivante | Terminé |

### Ce qui restait ouvert après la Phase 9

1. **Stabilité CI statistique** : atteindre une fenêtre conforme de 150 runs
   primaires sur au moins 7 jours UTC, p95 strictement inférieur à 20 minutes,
   flaky rate inférieur à 2 %, sans échec non résolu ni classification
   `UNKNOWN`.
2. **Training sur corpus organique** : observer au moins un vrai template coach
   staging hors fixture, puis effectuer l'assessment read-only avec zéro
   mismatch critique, projection UI identique et fallback maîtrisé.

Le contrat V2 et le scheduler horaire ont ensuite été ajoutés sur la branche
staging. Le registre versionné contient 20 observations V1, mais aucun document
versionné examiné ne déclare la fenêtre V2 achevée ni le statut `CI_STABLE`.

### État GitHub Actions observé le 17 septembre 2026

La capture transmise est cohérente avec
[l'historique public du workflow](https://github.com/bobitosm-prog/plateforme-coach/actions/workflows/phase-9-observation-scheduler.yml). Le
scheduler résout correctement la cible, puis une gate interne peut échouer. Sur
les 76 exécutions planifiées visibles entre le 5 et le 17 septembre :

- 48 exécutions sont terminées avec succès ;
- 28 exécutions sont terminées en échec, soit 36,8 % des runs ;
- aucun run n'est marqué annulé ;
- parmi les jobs en échec, 17 concernent `Gate C2 - Browser Heavy` et 14
  concernent `Gate C1 - Database Heavy` ; certains runs échouent sur les deux ;
- pour C1, les échecs observés se répartissent entre génération des types
  Supabase, reconstruction des migrations et reset/cleanup de la base locale ;
- les runs 75 et 76 sont revenus au vert, ce qui montre un comportement
  intermittent, pas une résolution démontrée.

Exemple vérifié : [le run 74](https://github.com/bobitosm-prog/plateforme-coach/actions/runs/35195618903) réussit la résolution de cible ainsi que les gates
A, B et C1, puis échoue dans C2 à l'étape des parcours navigateur critiques.
Le job de collecte produit tout de même son artefact d'observation.

**Conclusion :** la fenêtre CI n'est pas seulement incomplète à 76/150. Sa
population contient de nombreux échecs et ne satisfait ni l'absence d'échec
non résolu ni l'objectif de stabilité. Les succès suivants ne doivent pas
effacer les échecs précédents. Il faut classifier les causes, corriger les
déterminismes C1/C2, puis ouvrir une nouvelle fenêtre V2 sur un SHA canonique
figé conformément au contrat.

## Phase 10 officielle — Stabilisation et préparation rollout

**Statut versionné : `OPEN`.** Son objectif est de transformer les preuves
techniques de Phase 9 en autorisation d'activation contrôlée.

| Sous-phase | Résultat versionné | Conclusion |
|---|---|---|
| 10.1 CI Stability Monitoring | `CI_STABILITY_CANDIDATE` | Migration Node 24 et premiers runs valides, preuve statistique incomplète |
| 10.2 REAL_CORPUS_VALIDATION Training | `REAL_CORPUS_VALIDATION_BLOCKED` | 172 tests synthétiques passent, aucun corpus organique disponible |
| 10.3 Staging Readiness Audit | `STAGING_NOT_READY` | Gardes, fallback, rollback et monitoring prêts ; deux bloqueurs subsistent |
| 10.4 Unlock Conditions | `UNLOCK_PATH_DEFINED` | Conditions de levée formalisées, aucune activation autorisée |

### Conditions officielles de déblocage

- **CI** : 150 runs primaires complets, 7 jours UTC, p95 < 20 minutes, flaky
  rate < 2 %, zéro échec non résolu, zéro `UNKNOWN` ;
- **Training** : au moins un template coach staging organique, assessment
  read-only complet, zéro mismatch critique, UI identique et fallback legacy
  maîtrisé.

Tant que ces conditions ne sont pas prouvées, les documents interdisent
l'activation canonique, l'opt-in staging, la création artificielle du corpus et
l'utilisation de données Production. Le statut officiel reste donc
`STAGING_NOT_READY` dans les dernières preuves versionnées examinées.

## Correctifs supplémentaires révélés par l'audit actuel

Ces travaux ne doivent pas être renommés « nouvelle Phase 9 » ou « nouvelle
Phase 10 ». Ils constituent une **réconciliation post-divergence** à intégrer
au pilotage existant.

### P0 — avant toute promotion ou bêta externe

- déterminer quelle branche est la source de vérité et produire un diff de
  promotion `origin/main` ↔ `phase-6-staging` par domaine ;
- réintégrer ou réimplémenter les contrôles d'authentification et
  d'autorisation Stripe, puis les retester sur le SHA candidat ;
- comparer le schéma de la base réellement ciblée avec les migrations de la
  branche candidate ;
- ajouter les garde-fous caloriques et le screening santé minimal ;
- ne conserver aucune preuve Phase 9 dont le SHA ou l'environnement ne
  correspond plus au candidat de release.

### P1 — intégrité et fonctionnement

- garantir un seul plan actif et un remplacement transactionnel pour
  entraînement et nutrition ;
- reconnecter `meal_tracking` au dashboard ;
- corriger ou retirer le journal alimentaire hérité ;
- résoudre l'incohérence
  `program_days/custom_programs/training_programs` ;
- renforcer Athena : citations vérifiées, conversations et écritures serveur
  des diagnostics ;
- corriger le lint au minimum sur tout le périmètre promu.

### Validation 4/4 du candidat réconcilié

1. **Traçabilité :** SHA candidat unique, matrice des commits promus et preuves
   historiques explicitement reconduites ou invalidées.
2. **Sécurité/données :** contrôles d'autorisation, RLS et migrations validés
   sur l'environnement exact ciblé.
3. **Runtime :** les 15 E2E critiques et le parcours utilisateur actuel sont
   rejoués sur ce même SHA, sans données ou mocks masquant le comportement.
4. **Release :** les deux conditions officielles de Phase 10 sont levées et un
   nouveau verdict staging est enregistré avant toute décision Production.

## 13. Ordre des sous-batches et commits recommandés

Chaque ligne doit produire un commit isolé et bisect-friendly.

| Ordre | Sous-batch | Livrable | Dépendance |
|---:|---|---|---|
| 1 | `security/stripe-authz` | Checkout et Connect authentifiés/autorisés + tests | Aucune |
| 2 | `security/admin-routes` | setup-products, vitals, logs, invitation durcis | 1 |
| 3 | `db/schema-baseline` | Inventaire et migration de réconciliation idempotente | Sauvegarde |
| 4 | `db/active-plan-integrity` | Contraintes et remplacement transactionnel | 3 |
| 5 | `nutrition/tracking-repair` | Suivi repas et journal alimentaire unifiés | 3 |
| 6 | `health/calorie-guardrails` | Moteur unique, screening et refus sûrs | Validation métier |
| 7 | `training/model-alignment` | Modèle canonique et seuils RIR validés | 3 |
| 8 | `athena/auditability` | Schéma de réponse, citations et conversations | 3 |
| 9 | `quality/lint-touched-files` | Zéro dette nouvelle + documentation actualisée | 1–8 |
| 10 | `release/e2e-beta` | Matrice E2E, paiement LIVE, runbooks et GO/NO-GO | Candidat réconcilié et conditions Phase 10 levées |

## 14. Priorités finales

### À faire avant toute bêta externe

- corriger les deux routes Stripe P0 ;
- sécuriser setup-products ;
- ajouter les garde-fous caloriques minimaux ;
- réconcilier migrations et base distante ;
- empêcher plusieurs plans actifs ;
- réparer le suivi nutritionnel ;
- exécuter un E2E complet sur compte vierge.

### À faire avant commercialisation

- réconcilier `origin/main` avec les acquis de Phase 9 et lever les deux conditions officielles de Phase 10 ;
- tester un paiement LIVE complet ;
- faire valider entraînement, calories et nutrition par les professionnels responsables ;
- obtenir des données réelles de bêta et corriger les incidents ;
- rendre Athena traçable et évaluable ;
- réduire les avertissements Supabase et mettre en place les runbooks.

### Peut attendre après la bêta fermée

- enrichissement massif des médias d'exercices, à condition d'indiquer clairement les contenus manquants ;
- refactorisation générale des gros composants non touchés ;
- extension internationale complète du catalogue alimentaire ;
- optimisations esthétiques secondaires.

## 15. Conclusion

MOOVX n'est pas un prototype vide : le produit possède un vrai moteur, une architecture moderne et une base de tests supérieure à beaucoup de projets au même stade. Le principal danger serait de confondre cette profondeur technique avec une preuve de préparation commerciale.

La prochaine étape n'est pas d'ajouter davantage de fonctionnalités. Elle est de **choisir une lignée de référence, réconcilier les acquis staging avec le code actuel, fermer les frontières de sécurité et rejouer les preuves sur un SHA unique**. La Phase 9 structurelle est documentée comme terminée avec monitoring restant ; la Phase 10 demeure bloquée tant que la stabilité CI et le corpus Training organique ne sont pas prouvés sur le candidat réellement destiné au rollout.

## 16. Suivi de remédiation

Le premier sous-batch P0 a été réalisé sur la branche
`codex/release-reconciliation`, à partir du SHA Production `8f506a96`.

Commit : `3f260ec3 fix(stripe): bind privileged flows to server identities`.

Résultats :

- checkout plateforme lié à l'identité serveur ;
- checkout coach lié au client connecté et à sa relation coach active ;
- Connect limité au coach connecté, avec e-mail et compte Stripe lus côté
  serveur ;
- création de produits limitée au rôle `super_admin` ;
- limitation de débit ajoutée aux quatre routes ;
- 8 tests d'autorisation dédiés réussis ;
- suite complète : 1 614 tests réussis ;
- build de production et contrôle i18n réussis ;
- test runtime local : quatre appels anonymes refusés avec HTTP 401.

Ce commit n'est ni poussé ni déployé au moment de cette mise à jour. Le constat
de vulnérabilité reste donc valable pour le SHA Production audité jusqu'à
promotion explicite d'un candidat validé.
