# ROADMAP CODEX — MoovX

> Feuille de route officielle du projet.  
> Contexte de réalisation : **1 développeur assisté par Codex et ChatGPT**.  
> Dernière mise à jour : **11 juillet 2026**.  
> Référence initiale : commit `aa53a6e`.
> Phase active : **Phase 1 — Stabilisation et sécurité**.  
> Suivi de session : **obligatoire dans `SESSION_LOG_CODEX.md`**.

---

## Mode d'emploi

Ce document pilote les travaux techniques des prochains mois. Il doit être mis à jour à la fin de chaque semaine : cases cochées, indicateurs, décisions et journal de progression.

Règles d'utilisation :

1. Ne garder qu'une tâche structurante en cours à la fois.
2. Terminer et vérifier une tranche verticale avant d'en ouvrir une autre.
3. Interrompre la roadmap uniquement pour un incident, une correction P0/P1 ou une nécessité produit explicite.
4. Replanifier les estimations après chaque phase à partir du temps réellement observé.
5. Une case n'est cochée que lorsque sa définition de terminé est satisfaite.
6. Au début de chaque session, lire cette roadmap, lire la dernière entrée de `SESSION_LOG_CODEX.md`, puis vérifier la branche, le commit et `git status`.
7. À la fin de chaque session, mettre à jour l'avancement réel ici et ajouter une entrée complète à `SESSION_LOG_CODEX.md`, même si la tâche reste incomplète.
8. Chaque session possède une seule tâche principale et se termine par une prochaine étape unique, prioritaire et directement exécutable.

Les estimations sont données en **jours de travail concentré** pour une personne assistée par l'IA. Elles incluent l'implémentation et les tests directs, mais pas une marge générale de 25 % pour les imprévus et le développement produit parallèle.

---

# 1. Vision du projet

## Résumé

MoovX est une plateforme de fitness destinée aux pratiquants et aux coachs. Elle réunit authentification, profils, programmes d'entraînement, exécution de séances, progression, nutrition, recettes, messagerie, analyses IA, paiements Stripe, PWA, notifications, médias d'exercices et administration.

Le socle technique principal est :

- Next.js App Router et React ;
- TypeScript ;
- Supabase/PostgreSQL, RLS, RPC, Storage et Realtime ;
- Stripe et Stripe Connect ;
- Anthropic ;
- Web Push, SMTP et PWA.

## Objectifs produit

- Offrir une expérience client fiable sur mobile pendant toute la pratique sportive.
- Permettre aux coachs de suivre plusieurs clients sans complexité opérationnelle.
- Fournir des programmes, recommandations et plans nutritionnels cohérents.
- Monétiser clairement les offres client, coach et invité.
- Conserver une identité visuelle premium et une expérience rapide.
- Faire évoluer le produit continuellement sans interruption longue.

## Objectifs techniques

- Protéger tous les flux critiques avant les refactorings.
- Rendre les règles métier testables indépendamment de React et des services externes.
- Réduire la taille des composants et hooks centraux.
- Centraliser les accès Supabase et les contrats TypeScript.
- Transformer les routes API en adaptateurs HTTP minces.
- Exploiter davantage Server Components, Suspense et le chargement différé.
- Rendre Billing, Training, Nutrition et IA observables et prévisibles.
- Disposer de tests d'intégration et E2E avant chaque changement sensible.

## Vision à long terme

MoovX doit rester un monolithe modulaire Next.js/Supabase tant que ce modèle répond aux besoins. L'objectif n'est pas de créer prématurément des microservices, mais de construire des frontières métier assez nettes pour qu'un module puisse évoluer sans modifier toute l'application.

À terme, une fonctionnalité normale doit pouvoir être développée en intervenant principalement dans un seul domaine, avec un contrat de données stable, des tests ciblés et un déploiement réversible.

---

# 2. État actuel

## Synthèse des audits

Les audits de sécurité, d'exploitabilité et d'architecture ont confirmé :

- une application riche et déjà fonctionnelle ;
- un modèle Supabase avancé avec RLS, RPC et migrations ;
- de bons noyaux métier pour l'entraînement, la progression, Stripe et les quotas IA ;
- plusieurs flux externes nécessitant une sécurisation prioritaire ;
- une architecture React fortement concentrée dans quelques fichiers ;
- un App Router utilisé surtout comme routeur, avec peu de Server Components et de streaming UI ;
- une dépendance importante de l'interface au schéma Supabase ;
- une couverture de tests insuffisante pour les parcours critiques.

## Forces

- Choix technologiques pérennes.
- TypeScript compile sans erreur.
- 93 tests unitaires existants et réussis au moment de la baseline.
- Modèle relationnel riche et adapté au fitness.
- RLS largement activée et migrations documentées.
- Webhook Stripe signé et dédupliqué.
- Quotas IA persistants.
- Streaming pour certaines générations longues.
- Domaine `lib/training` déjà partiellement structuré.
- Design system et traductions centralisés.
- Documentation produit et performance abondante.

## Faiblesses mesurées

| Indicateur initial | Valeur |
|---|---:|
| Fichiers TypeScript/TSX analysés | 370 |
| Modules `use client` | 218 |
| Créations de clients Supabase | 122 dans 61 fichiers |
| Routes API | 47 |
| Routes avec validation structurée | environ 4 |
| Composants de plus de 1 000 lignes | 5 |
| Hooks de plus de 500 lignes | 3 |
| `loading.tsx` | 0 |
| `error.tsx` | 1 |
| Parcours E2E intégrés | 0 |
| Médias publics images/vidéos | environ 154 Mo |

## Principales dettes

- `TrainingTab`, `WorkoutSession`, `ProgramBuilder`, `NutritionTab` et `ProgressTab` dépassent 1 000 lignes.
- `useClientDetail`, `useCoachDashboard` et `useClientDashboard` cumulent plusieurs domaines.
- Les composants et hooks appellent directement de nombreuses tables Supabase.
- Les route handlers mélangent HTTP, validation, métier, fournisseur et persistance.
- Les erreurs et formats de réponse ne suivent pas un contrat commun.
- Zod est peu utilisé.
- Stripe, IA et notifications sont répartis entre plusieurs couches.
- Plusieurs générations d'onboarding coexistent.
- Les médias et le bundle client sont lourds.
- L'historique de migrations contient des opérations appliquées manuellement ou versionnées après coup.

## Risques prioritaires

1. Régression fonctionnelle pendant le découpage de la séance ou de la nutrition.
2. Divergence entre migrations versionnées et base réellement déployée.
3. Évolution commerciale difficile si Billing reste dispersé.
4. Coût et instabilité si les sorties IA restent hétérogènes.
5. Ralentissement du développement par concentration du code.
6. Régressions invisibles en l'absence de tests d'intégration et E2E.

---

# 3. Principes permanents de développement

## Limites de taille

- Composant de présentation cible : **moins de 250 lignes**.
- Composant orchestrateur cible : **moins de 400 lignes**.
- Hook cible : **moins de 200 lignes** et une responsabilité principale.
- Route handler cible : **moins de 80 lignes**.
- Service métier cible : **moins de 300 lignes**, sauf algorithme cohérent et testé.

Une limite dépassée n'impose pas un découpage mécanique. Elle déclenche une revue de responsabilités.

## Règles d'architecture

1. Aucun gros refactoring sans tests de caractérisation préalables.
2. La logique métier ne dépend pas d'un composant React.
3. Une route API valide l'entrée, appelle un service et mappe le résultat HTTP.
4. L'identité est déterminée côté serveur pour toute opération sensible.
5. Les accès Supabase passent progressivement par une factory et une couche typée.
6. Queries et mutations sont séparées.
7. Les types de base sont générés ou centralisés ; aucun nouvel objet métier important en `any`.
8. Les migrations utilisent le modèle expand/contract et restent rétrocompatibles pendant la transition.
9. Les changements critiques utilisent un feature flag ou un mécanisme de rollback équivalent.
10. Un nouveau domaine ne doit pas importer directement les détails internes d'un autre domaine.
11. Les anciennes API publiques restent compatibles pendant au moins une release de transition.
12. Les performances sont mesurées avant et après chaque optimisation.
13. Aucun changement simultané de structure, contrat métier et design dans une même PR sensible.
14. Toute nouvelle route possède validation structurée, erreurs typées et tests.
15. Toute décision structurante est enregistrée dans un ADR court.

---

# 4. Priorités

| Priorité | Définition | Traitement |
|---|---|---|
| **P0** | Risque immédiat pour les comptes, paiements, données ou capacité à déployer | Avant tout refactoring risqué |
| **P1** | Forte réduction du risque ou prérequis à plusieurs phases | Dans le trimestre courant |
| **P2** | Amélioration structurante d'un domaine central | Après filet de sécurité et contrats |
| **P3** | Optimisation, confort ou industrialisation avancée | Lorsque les P0–P2 dépendants sont stables |

---

# 5. Roadmap par phases

## Phase 1 — Stabilisation et sécurité

**Durée cible : 4 à 6 semaines**  
**Priorité : P0**

**Statut : En cours — 3 tâches sur 15 terminées**

### Pourquoi

Les refactorings importants ne doivent pas commencer tant que les flux externes critiques et leurs tests ne sont pas stabilisés.

### Prérequis

- Environnements Supabase et Stripe de test identifiés.
- Sauvegarde Git propre.
- Aucun test ne contacte la production.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [x] Écrire les tests d'autorisation de `/api/stripe/connect` | 1,5 j | Élevée | Faible | Critique | — |
| [x] Lier Stripe Connect à l'identité coach serveur | 1,5 j | Élevée | Élevé | Critique | Tests Connect |
| [x] Écrire les tests d'autorisation de `assign-coach` | 1,5 j | Élevée | Faible | Critique | — |
| [ ] Créer le contrat d'invitation coach à usage unique | 2 j | Élevée | Moyen | Critique | Tests assignation |
| [ ] Ajouter la migration d'invitation rétrocompatible | 2 j | Élevée | Élevé | Critique | Contrat invitation |
| [ ] Migrer le parcours `/join` vers l'invitation vérifiée | 2 j | Élevée | Élevé | Critique | Migration invitation |
| [ ] Tester checkout plateforme et coach avec identités étrangères | 2 j | Élevée | Faible | Critique | — |
| [ ] Lier tous les checkouts à l'identité et aux relations serveur | 2,5 j | Élevée | Élevé | Critique | Tests checkout |
| [ ] Tester les metadata et le replay du webhook Stripe | 2 j | Élevée | Moyen | Élevé | Mocks Stripe |
| [ ] Restreindre les notifications aux relations autorisées | 2 j | Élevée | Moyen | Élevé | Tests push |
| [ ] Contraindre les URLs de notification à des chemins internes | 1 j | Moyenne | Faible | Moyen | Contrat push |
| [ ] Remplacer l'autorisation lifetime de `setup-products` par le contrat admin | 1 j | Moyenne | Moyen | Élevé | Tests admin |
| [ ] Restreindre et limiter les invitations SMTP | 1,5 j | Moyenne | Moyen | Élevé | Tests SMTP |
| [ ] Assainir le rendu Markdown du chat et ajouter les tests hostiles | 2 j | Élevée | Moyen | Élevé | — |
| [ ] Ajouter des journaux structurés aux rejets critiques | 1 j | Moyenne | Faible | Moyen | Contrat logs |

### Risques

Inscription, invitation coach, paywall, paiements, notifications et chat peuvent régresser.

### Réduction du risque

- Tests avant modification.
- Stripe test uniquement.
- Migrations additives.
- Activation progressive par flux.
- Ancien contrat accepté pendant la transition lorsque nécessaire.

### Bénéfices

Base suffisamment sûre pour modifier les frontières métier et les accès aux données.

### Définition de terminé

- Toutes les matrices anonyme/client/coach/admin sont vertes.
- Aucun identifiant critique ne provient uniquement du navigateur.
- Les parcours invitation, checkout, push et chat passent en E2E de test.
- Le rollback applicatif est documenté.

---

## Phase 2 — Filet de sécurité et fondations d'architecture

**Durée cible : 5 à 7 semaines**  
**Priorité : P1**

### Pourquoi

Une personne ne peut découper sereinement les grands domaines sans tests reproductibles, contrats partagés et accès aux données centralisés.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Documenter la pyramide de tests MoovX | 0,5 j | Faible | Faible | Moyen | Phase 1 |
| [ ] Créer les fixtures client, coach, invited, lifetime et admin | 1,5 j | Moyenne | Faible | Élevé | — |
| [ ] Rendre le reset Supabase local déterministe | 2 j | Élevée | Moyen | Élevé | Fixtures |
| [ ] Créer les mocks Stripe, Anthropic, SMTP et Web Push | 2,5 j | Élevée | Faible | Élevé | — |
| [ ] Ajouter les premières matrices RLS automatisées | 2 j | Élevée | Moyen | Élevé | Supabase local |
| [ ] Intégrer 5 parcours E2E critiques | 3 j | Élevée | Moyen | Élevé | Fixtures |
| [ ] Générer ou centraliser les types Supabase | 1,5 j | Moyenne | Faible | Élevé | — |
| [ ] Définir le contrat commun de réponse API | 1 j | Moyenne | Moyen | Élevé | — |
| [ ] Définir la taxonomie d'erreurs | 1 j | Moyenne | Faible | Élevé | Contrat API |
| [ ] Créer le helper commun Zod → erreur HTTP | 1,5 j | Moyenne | Faible | Élevé | Contrat API |
| [ ] Définir les factories Supabase browser/server/admin | 2 j | Élevée | Moyen | Critique | Types DB |
| [ ] Créer les repositories profil, identité et abonnement | 3 j | Élevée | Élevé | Critique | Factories |
| [ ] Migrer 10 accès Supabase représentatifs | 3 j | Moyenne | Moyen | Élevé | Repositories |
| [ ] Définir une stratégie de cache par domaine | 1 j | Élevée | Faible | Moyen | Repositories |
| [ ] Migrer 8 routes simples vers le contrat route/service/schema | 4 j | Élevée | Moyen | Élevé | Zod + erreurs |
| [ ] Ajouter correlation IDs et logs structurés | 1,5 j | Moyenne | Faible | Moyen | Erreurs |
| [ ] Créer les premiers ADR et le guide de contribution | 1,5 j | Faible | Faible | Moyen | Conventions stabilisées |

### Travaux parallélisables

- Fixtures/mocks et contrats TypeScript.
- Types Supabase et documentation.
- E2E après disponibilité des fixtures.

### Définition de terminé

- Tests unitaires, intégration et E2E possèdent des commandes distinctes.
- Aucun test n'utilise une configuration production.
- Au moins 8 routes utilisent validation et erreurs communes.
- Les nouvelles fonctionnalités doivent utiliser les factories Supabase.
- Les 10 accès migrés donnent exactement les mêmes résultats.

---

## Phase 3 — Domaine Training et exécution de séance

**Durée cible : 8 à 12 semaines**  
**Priorité : P2**

### Pourquoi

L'entraînement est le cœur du produit et contient les composants les plus volumineux. Il doit être découpé après stabilisation des contrats, jamais avant.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Cartographier les formats de programme existants | 1,5 j | Élevée | Faible | Élevé | Phase 2 |
| [ ] Définir le modèle Training canonique | 2 j | Élevée | Moyen | Critique | Cartographie |
| [ ] Créer les adaptateurs legacy ↔ canonique | 3 j | Élevée | Élevé | Critique | Modèle canonique |
| [ ] Renforcer les tests de progression et normalisation | 2 j | Moyenne | Faible | Élevé | Modèle canonique |
| [ ] Créer les repositories programmes, séances et exercices | 3 j | Élevée | Moyen | Élevé | Phase 2 |
| [ ] Extraire session/profil de `useClientDashboard` | 1,5 j | Moyenne | Moyen | Moyen | Repositories |
| [ ] Extraire programmes et séances de `useClientDashboard` | 2 j | Élevée | Moyen | Élevé | Repositories training |
| [ ] Extraire nutrition et mesures de `useClientDashboard` | 2 j | Moyenne | Moyen | Moyen | Repositories |
| [ ] Réduire la façade `useClientDashboard` sous 250 lignes | 2 j | Élevée | Moyen | Élevé | Extractions précédentes |
| [ ] Écrire les tests de caractérisation de `TrainingTab` | 2 j | Élevée | Faible | Élevé | E2E disponibles |
| [ ] Extraire programme actif et navigation des jours | 2,5 j | Élevée | Moyen | Élevé | Modèle canonique |
| [ ] Extraire bibliothèque et recherche d'exercices | 2 j | Moyenne | Moyen | Moyen | Repositories |
| [ ] Extraire historique et séances récentes | 1,5 j | Moyenne | Faible | Moyen | Queries training |
| [ ] Extraire les modales de `TrainingTab` | 1,5 j | Moyenne | Faible | Moyen | Tests caractérisation |
| [ ] Réduire `TrainingTab` sous 500 lignes | 2 j | Élevée | Moyen | Élevé | Extractions précédentes |
| [ ] Décrire les états et transitions de `WorkoutSession` | 1,5 j | Élevée | Faible | Critique | Modèle training |
| [ ] Écrire les tests de transitions de séance | 3 j | Élevée | Faible | Critique | Modèle de transitions |
| [ ] Extraire le modèle pur de session | 3 j | Élevée | Élevé | Critique | Tests transitions |
| [ ] Extraire timer, audio et wake lock | 2 j | Élevée | Élevé | Élevé | Modèle session |
| [ ] Extraire sauvegarde et synchronisation | 2,5 j | Élevée | Élevé | Critique | Modèle session |
| [ ] Extraire les composants de présentation par phase | 2,5 j | Élevée | Moyen | Élevé | Modèle session |
| [ ] Tester interruption, reprise et arrière-plan mobile | 2,5 j | Élevée | Moyen | Critique | Implémentation complète |
| [ ] Réduire `WorkoutSession` sous 600 lignes | 1,5 j | Élevée | Élevé | Élevé | Toutes extractions |
| [ ] Écrire les tests de caractérisation de `ProgramBuilder` | 1,5 j | Élevée | Faible | Élevé | Modèle canonique |
| [ ] Extraire modèle d'édition, DnD et validation | 4 j | Élevée | Élevé | Élevé | Tests builder |
| [ ] Extraire persistance et présentation du builder | 3 j | Élevée | Moyen | Élevé | Modèle d'édition |
| [ ] Réduire `ProgramBuilder` sous 500 lignes | 1 j | Moyenne | Moyen | Moyen | Extractions builder |

### Risques

Perte de séance, divergence de programme, régression mobile, historique incomplet et records incorrects.

### Réduction du risque

- Un seul sous-chantier actif à la fois.
- Feature flag pour le nouveau moteur de séance.
- Format de sauvegarde compatible.
- Double calcul silencieux avant bascule.
- Tests sur des fixtures réelles anonymisées.

### Définition de terminé

- `TrainingTab` <500 lignes.
- `WorkoutSession` <600 lignes.
- `ProgramBuilder` <500 lignes.
- `useClientDashboard` <250 lignes.
- Aucune perte lors des scénarios interruption/reprise.
- Modèle canonique stable sur toutes les fixtures.

---

## Phase 4 — Domaine Nutrition et progression

**Durée cible : 6 à 9 semaines**  
**Priorité : P2**

### Pourquoi

Nutrition et progression contiennent des calculs sensibles, plusieurs représentations de données et des composants très volumineux.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Cartographier les formats repas, plans et aliments | 1,5 j | Élevée | Faible | Élevé | Phase 2 |
| [ ] Définir le modèle Nutrition canonique | 2 j | Élevée | Moyen | Critique | Cartographie |
| [ ] Ajouter les tests d'invariants calories/macros | 2,5 j | Élevée | Faible | Critique | Modèle nutrition |
| [ ] Créer les repositories nutrition | 3 j | Élevée | Moyen | Élevé | Phase 2 |
| [ ] Extraire la génération de repas hors de la route HTTP | 3 j | Élevée | Élevé | Élevé | Modèle nutrition |
| [ ] Découper hooks journal, plans, recettes et objectifs | 3 j | Élevée | Moyen | Élevé | Repositories |
| [ ] Extraire les sections de `NutritionTab` | 4 j | Élevée | Élevé | Élevé | Hooks spécialisés |
| [ ] Réduire `NutritionTab` sous 500 lignes | 1,5 j | Moyenne | Moyen | Élevé | Extractions |
| [ ] Comparer les totaux anciens et nouveaux | 1,5 j | Élevée | Faible | Critique | Double calcul |
| [ ] Documenter les métriques de progression | 1,5 j | Moyenne | Faible | Élevé | — |
| [ ] Extraire les fonctions d'agrégation pures | 2,5 j | Élevée | Moyen | Élevé | Catalogue métriques |
| [ ] Créer les read models progression/analytics | 3 j | Élevée | Moyen | Élevé | Repositories |
| [ ] Découper `ProgressTab` par section | 3 j | Élevée | Moyen | Élevé | Read models |
| [ ] Extraire les calculs d'`AnalyticsSection` | 2 j | Moyenne | Moyen | Moyen | Agrégations pures |
| [ ] Réduire `ProgressTab` sous 500 lignes | 1 j | Moyenne | Faible | Moyen | Extractions |
| [ ] Tester fuseaux horaires, semaines et unités | 2 j | Élevée | Faible | Élevé | Fonctions pures |

### Travaux parallélisables

Les fonctions de progression peuvent avancer pendant la stabilisation des repositories nutrition, mais les deux interfaces ne doivent pas être refactorées simultanément.

### Définition de terminé

- Les calculs nutritionnels sont testés avec des bornes et tolérances explicites.
- Les composants ciblés respectent les seuils.
- Les agrégations ne sont plus recalculées dans plusieurs composants.
- Les nouvelles et anciennes métriques concordent sur les fixtures.

---

## Phase 5 — Coaching et messagerie

**Durée cible : 6 à 8 semaines**  
**Priorité : P2**

### Pourquoi

Les dashboards coach et client detail concentrent données, calendrier, messages, programmes, nutrition et analytics.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Écrire les E2E coach/client de caractérisation | 2,5 j | Élevée | Faible | Critique | Phase 2 |
| [ ] Extraire le repository des relations coach/client | 2 j | Élevée | Moyen | Critique | Identité centralisée |
| [ ] Extraire le module calendrier/appointments | 2,5 j | Élevée | Moyen | Élevé | Repository relations |
| [ ] Extraire le module messaging et realtime | 3 j | Élevée | Élevé | Critique | Contrats notifications |
| [ ] Tester abonnement, reconnexion et nettoyage realtime | 2 j | Élevée | Faible | Élevé | Module messaging |
| [ ] Extraire clients, programmes, revenus et analytics de `useCoachDashboard` | 5 j | Élevée | Élevé | Élevé | Domaines précédents |
| [ ] Réduire `useCoachDashboard` sous 250 lignes | 1,5 j | Élevée | Moyen | Élevé | Extractions |
| [ ] Extraire profil, programme, nutrition et progression de `useClientDetail` | 5 j | Élevée | Élevé | Élevé | Phases Training/Nutrition |
| [ ] Réduire `useClientDetail` sous 250 lignes | 1,5 j | Élevée | Moyen | Élevé | Extractions |
| [ ] Découper `coach/page.tsx` en sections chargées à la demande | 3 j | Élevée | Moyen | Élevé | Hooks spécialisés |
| [ ] Découper `client/[id]/page.tsx` en orchestrateur mince | 2,5 j | Élevée | Moyen | Élevé | Hooks spécialisés |
| [ ] Ajouter pagination aux listes coach importantes | 2 j | Moyenne | Moyen | Moyen | Repositories |

### Définition de terminé

- Les deux hooks principaux sont sous 250 lignes.
- Chaque section coach peut être testée indépendamment.
- Aucun abonnement Realtime orphelin n'est observé.
- Les requêtes initiales du dashboard coach diminuent d'au moins 20 %.

---

## Phase 6 — Billing et subscriptions

**Durée cible : 5 à 7 semaines**  
**Priorité : P1**

### Pourquoi

La facturation est un domaine critique et évoluera avec les offres, commissions, renouvellements et réconciliations.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Définir le modèle métier Billing | 2 j | Élevée | Faible | Critique | Phases 1–2 |
| [ ] Séparer paiement, abonnement et accès produit | 2,5 j | Élevée | Élevé | Critique | Modèle Billing |
| [ ] Extraire le service Checkout | 2,5 j | Élevée | Élevé | Critique | Tests Stripe |
| [ ] Extraire le service Stripe Connect | 2 j | Élevée | Élevé | Critique | Tests Connect |
| [ ] Extraire les handlers métier du webhook | 3 j | Élevée | Élevé | Critique | Modèle Billing |
| [ ] Centraliser metadata et idempotence | 2 j | Élevée | Moyen | Élevé | Services Stripe |
| [ ] Créer la réconciliation Stripe/base | 3 j | Élevée | Élevé | Critique | Services Billing |
| [ ] Tester replay, concurrence et événements désordonnés | 3 j | Élevée | Faible | Critique | Mocks Stripe |
| [ ] Réduire les routes Stripe à des adaptateurs HTTP | 2 j | Moyenne | Moyen | Élevé | Services complets |
| [ ] Documenter le cycle de vie des abonnements | 1 j | Moyenne | Faible | Élevé | Modèle final |

### Définition de terminé

- Chaque événement Stripe supporté possède un test.
- Le replay ne produit aucune double mutation.
- La réconciliation ne signale aucune divergence en préproduction.
- Les routes Stripe ne contiennent plus de logique métier substantielle.

---

## Phase 7 — Plateforme IA

**Durée cible : 5 à 8 semaines**  
**Priorité : P2**

### Pourquoi

L'IA est un avantage produit, mais les providers, modèles, prompts, parseurs, quotas et erreurs sont encore hétérogènes.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Inventorier prompts, modèles et contrats de sortie | 1,5 j | Moyenne | Faible | Élevé | Phase 2 |
| [ ] Définir l'interface commune du provider IA | 2 j | Élevée | Moyen | Élevé | Inventaire |
| [ ] Centraliser timeouts, retries et erreurs | 2 j | Élevée | Moyen | Élevé | Provider |
| [ ] Créer le registre des modèles et coûts | 1,5 j | Moyenne | Faible | Élevé | Provider |
| [ ] Séparer les prompts du transport HTTP | 2 j | Moyenne | Moyen | Élevé | Inventaire |
| [ ] Définir les schémas Zod de sortie | 3 j | Élevée | Moyen | Critique | Contrats métier |
| [ ] Centraliser parsing et validation structurée | 2 j | Élevée | Moyen | Élevé | Schémas |
| [ ] Unifier quotas et journalisation d'usage | 2,5 j | Élevée | Moyen | Élevé | Provider |
| [ ] Migrer Chat, Recipes et Suggest Exercise | 3 j | Moyenne | Moyen | Élevé | Provider complet |
| [ ] Migrer génération Training | 2,5 j | Élevée | Élevé | Critique | Phase Training |
| [ ] Migrer génération Nutrition | 2,5 j | Élevée | Élevé | Critique | Phase Nutrition |
| [ ] Ajouter golden fixtures et tests de contrat | 3 j | Élevée | Faible | Critique | Endpoints migrés |
| [ ] Définir et tester les fallbacks | 2 j | Élevée | Moyen | Élevé | Provider |

### Définition de terminé

- Tous les appels Anthropic passent par le provider commun.
- Toutes les sorties structurées sont validées.
- Chaque endpoint expose durée, modèle, tokens/coût estimé et résultat.
- Aucun changement de prompt n'est mélangé à une migration technique non mesurée.

---

## Phase 8 — React, App Router et performance

**Durée cible : 5 à 7 semaines**  
**Priorité : P2/P3**

### Pourquoi

Le dashboard principal charge beaucoup de JavaScript et les médias publics sont lourds. L'optimisation doit intervenir après stabilisation des domaines.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Capturer bundle, LCP, INP, CLS et requêtes de référence | 1,5 j | Moyenne | Faible | Élevé | — |
| [ ] Définir les budgets de performance | 0,5 j | Moyenne | Faible | Moyen | Baseline |
| [ ] Créer une coque serveur pour le dashboard | 3 j | Élevée | Élevé | Élevé | Domaines stabilisés |
| [ ] Ajouter `loading.tsx` par segment important | 1,5 j | Moyenne | Faible | Moyen | Coque serveur |
| [ ] Ajouter `error.tsx` par domaine critique | 1,5 j | Moyenne | Faible | Moyen | Contrats erreurs |
| [ ] Charger onglets et modales secondaires à la demande | 3 j | Élevée | Moyen | Élevé | Composants découpés |
| [ ] Différer Recharts, MediaPipe, QR et XLSX | 2 j | Moyenne | Moyen | Élevé | Dynamic imports |
| [ ] Réduire progressivement les modules `use client` | 4 j | Élevée | Moyen | Élevé | Coque serveur |
| [ ] Inventorier et optimiser images/vidéos lourdes | 3 j | Moyenne | Moyen | Élevé | Manifest médias |
| [ ] Définir posters et chargement vidéo différé | 2 j | Moyenne | Moyen | Moyen | Médias optimisés |
| [ ] Étudier puis déployer un stockage/CDN média | 3 j | Élevée | Élevé | Élevé | Chemins compatibles |
| [ ] Réduire et auto-héberger les polices nécessaires | 1,5 j | Moyenne | Faible | Moyen | Baseline |
| [ ] Comparer les Core Web Vitals avant/après | 1 j | Moyenne | Faible | Élevé | Optimisations |

### Définition de terminé

- Bundle principal réduit d'au moins 25 %.
- LCP p75 mobile amélioré d'au moins 20 %.
- Médias publics du déploiement réduits d'au moins 50 %.
- Aucun média manquant.
- Les pages critiques possèdent chargement et erreur dédiés.

---

## Phase 9 — Industrialisation et équipe future

**Durée cible : 4 à 6 semaines**  
**Priorité : P1/P3**

### Pourquoi

La roadmap n'est réussie que si les pratiques restent reproductibles lorsque le projet accueille d'autres développeurs.

### Checklist

| Tâche | Estimation | Difficulté | Risque | Impact | Dépend de |
|---|---:|---|---|---|---|
| [ ] Étendre la suite à 15 parcours E2E critiques | 4 j | Élevée | Moyen | Critique | Domaines stabilisés |
| [ ] Tester toutes les migrations depuis une base vide | 2 j | Élevée | Moyen | Critique | Supabase local |
| [ ] Vérifier l'alignement migrations locales/distantes | 1,5 j | Élevée | Moyen | Critique | Accès environnements |
| [ ] Définir la procédure de release | 1 j | Moyenne | Faible | Élevé | CI stable |
| [ ] Définir et répéter la procédure de rollback | 1,5 j | Élevée | Faible | Critique | Release |
| [ ] Créer la checklist de revue de code | 0,5 j | Faible | Faible | Moyen | Conventions |
| [ ] Finaliser le guide d'onboarding développeur | 1 j | Faible | Faible | Moyen | Architecture stable |
| [ ] Finaliser les ADR et cartes de domaines | 1,5 j | Moyenne | Faible | Élevé | Domaines stabilisés |
| [ ] Ajouter les quality gates CI progressifs | 2 j | Moyenne | Moyen | Élevé | Tests stables |
| [ ] Supprimer les feature flags arrivés à expiration | 1 j | Moyenne | Moyen | Moyen | Métriques de trafic |
| [ ] Supprimer les adaptateurs legacy sans trafic | 2 j | Élevée | Élevé | Moyen | Coexistence terminée |
| [ ] Retirer les dépendances réellement inutilisées | 1 j | Faible | Faible | Faible | Vérification imports |
| [ ] Exécuter un test de charge ciblé | 2 j | Élevée | Faible | Élevé | Observabilité |
| [ ] Produire la baseline finale et la roadmap suivante | 1 j | Moyenne | Faible | Élevé | Toutes phases retenues |

### Définition de terminé

- CI complète inférieure à 20 minutes et flaky rate <2 %.
- La base peut être reconstruite depuis les migrations.
- Un rollback applicatif est réalisable en moins de 30 minutes.
- Un nouveau développeur peut lancer, tester et comprendre le projet avec la documentation seule.

---

# 6. Dépendances générales

```text
Phase 1 — Stabilisation
  → Phase 2 — Tests, contrats et données
      → Phase 3 — Training
      → Phase 4 — Nutrition/Progression
      → Phase 6 — Billing
      → Phase 7 — IA

Phase 3 + Phase 4
  → Phase 5 — Coaching/Client detail

Phases 3 à 7 suffisamment stabilisées
  → Phase 8 — App Router/Performance
      → Phase 9 — Consolidation finale
```

Travaux réalisables en parallèle à faible risque :

- documentation et ADR ;
- baseline de performance ;
- inventaire des médias ;
- enrichissement des tests unitaires purs ;
- définition des fixtures et contrats avant implémentation.

Travaux à ne pas exécuter simultanément :

- `WorkoutSession` et `TrainingTab` ;
- `NutritionTab` et `ProgressTab` ;
- webhook Stripe et modèle d'abonnement ;
- structure d'un domaine et changement fonctionnel majeur dans ce même domaine.

---

# 7. Définition globale de terminé

Une tâche importante est terminée uniquement lorsque :

- [ ] le comportement attendu est écrit ;
- [ ] les tests de caractérisation existaient avant le refactoring ;
- [ ] les nouveaux tests unitaires/intégration pertinents passent ;
- [ ] les E2E concernés passent ;
- [ ] TypeScript passe ;
- [ ] le lint ciblé ne régresse pas ;
- [ ] le build de production passe dans un environnement réseau approprié ;
- [ ] les performances ne régressent pas ;
- [ ] la migration est rétrocompatible lorsqu'il y en a une ;
- [ ] le rollback est possible et documenté ;
- [ ] la documentation et le tableau de bord sont mis à jour ;
- [ ] le code legacy possède une date de suppression ou est supprimé ;
- [ ] aucun nouveau `any`, accès Supabase direct ou client externe ad hoc n'est introduit sans justification.

---

# 8. Règles Codex

1. Toujours commencer par lire les fichiers concernés et leurs tests.
2. Toujours vérifier `git status` avant et après une intervention.
3. Ne jamais écraser une modification utilisateur non liée.
4. Utiliser une branche courte et une tâche bornée.
5. Créer ou adapter les tests avant un gros refactoring.
6. Ne modifier qu'un domaine principal par tâche.
7. Ne pas mélanger déplacement mécanique, changement fonctionnel et nouveau design.
8. Préserver les contrats publics pendant la période de coexistence.
9. Préférer un adaptateur temporaire à une migration big bang.
10. Pour les migrations, appliquer expand → migrate → contract.
11. Pour les flux sensibles, utiliser un feature flag et documenter le rollback.
12. Ne jamais appeler un service production depuis un test.
13. Mocker Stripe, Anthropic, SMTP et Web Push.
14. Utiliser Supabase local ou un environnement explicitement dédié aux tests.
15. Vérifier lint ciblé, TypeScript, tests et build avant fusion.
16. Mesurer bundle ou Web Vitals avant et après une optimisation.
17. Ne pas déclarer une tâche terminée si les critères de sortie ne sont pas remplis.
18. Après chaque modification, résumer fichiers touchés, tests exécutés et risques restants.
19. Limiter une PR à environ 400 lignes modifiées ; jusqu'à 800 pour un déplacement mécanique clairement isolé.
20. Mettre à jour ce document et le journal à la fin de chaque tranche livrée.

## Ordre recommandé des commits

1. Tests de caractérisation.
2. Types et contrats.
3. Nouvelle implémentation parallèle.
4. Bascule ou feature flag.
5. Documentation et métriques.
6. Suppression legacy dans un commit ou une PR ultérieure.

---

# 9. Plan de travail hebdomadaire pour une personne

Le rythme doit privilégier les tranches terminées plutôt qu'une spécialisation rigide par jour.

## Lundi — Cadrage et filet de sécurité

- Choisir une seule tâche principale de la roadmap.
- Vérifier les dépendances et la définition de terminé.
- Lire le flux complet concerné.
- Capturer la baseline.
- Écrire ou compléter les tests de caractérisation.

## Mardi — Implémentation principale

- Construire le nouveau contrat ou service.
- Garder l'ancien chemin fonctionnel.
- Utiliser Codex pour les changements mécaniques bornés.
- Utiliser ChatGPT pour challenger le modèle, les invariants et les cas limites.

## Mercredi — Intégration verticale

- Connecter le nouveau chemin à un seul consommateur.
- Ajouter les tests d'intégration.
- Comparer ancien et nouveau comportement.
- Éviter d'ouvrir un deuxième chantier.

## Jeudi — Validation et robustesse

- Exécuter TypeScript, lint ciblé, tests et E2E concernés.
- Tester erreurs, reprise, concurrence et rollback selon le domaine.
- Mesurer les performances si nécessaire.
- Corriger uniquement les régressions liées à la tâche.

## Vendredi — Livraison et capitalisation

- Déployer progressivement ou préparer la PR.
- Examiner les métriques.
- Mettre à jour l'ADR, la roadmap et le journal.
- Supprimer le flag uniquement si ses critères sont atteints.
- Préparer la tâche de la semaine suivante sans commencer son implémentation.

## Allocation de capacité

- 60 % : tâche structurante de roadmap.
- 25 % : produit et corrections courantes.
- 10 % : tests, documentation et observabilité.
- 5 % : marge immédiate.

Si une urgence produit consomme plus de 40 % de la semaine, la tâche de roadmap est reportée explicitement ; elle ne reste pas artificiellement « en cours ».

---

# 10. Tableau de bord

Mettre à jour ce tableau chaque vendredi.

| Indicateur | Baseline | Cible intermédiaire | Cible finale | Valeur actuelle | Statut |
|---|---:|---:|---:|---:|---|
| Progression globale de la roadmap | 0 % | 50 % | 100 % | ≈3 % | 🟠 |
| Tâches P0 restantes | 15 | 0 | 0 | 12 | 🔴 |
| Composants >1 000 lignes | 5 | 3 | 0–1 | 5 | 🔴 |
| Hooks >500 lignes | 3 | 2 | 0 | 3 | 🔴 |
| Modules `use client` | 218 | ≤200 | ≤165 | 218 | 🟠 |
| Créations de clients Supabase | 122 | ≤85 | ≤45 | 122 | 🔴 |
| Routes avec validation structurée | ≈4/47 | ≥20/47 | ≥35/47 | ≈4/47 | 🔴 |
| Tests unitaires | 93 | ≥160 | ≥250 | 119 | 🟠 |
| Tests d'intégration | 0 identifié | ≥20 | ≥50 | 0 | 🔴 |
| Parcours E2E intégrés | 0 | ≥8 | ≥15 | 0 | 🔴 |
| Poids médias publics | ≈154 Mo | ≤120 Mo | ≤70 Mo | ≈154 Mo | 🟠 |
| Bundle principal | À mesurer | −15 % | −30 % | À mesurer | ⬜ |
| LCP p75 mobile | À mesurer | −10 % | −20 % | À mesurer | ⬜ |
| Taux de tests instables | À mesurer | <3 % | <2 % | À mesurer | ⬜ |
| Régressions par release | À mesurer | −25 % | −50 % | À mesurer | ⬜ |

## Backlog des gros fichiers

| Fichier | Baseline | Cible | Phase | Statut |
|---|---:|---:|---:|---|
| `TrainingTab.tsx` | 1 721 lignes | <500 | 3 | ⬜ |
| `WorkoutSession.tsx` | 1 639 | <600 | 3 | ⬜ |
| `ProgramBuilder.tsx` | 1 330 | <500 | 3 | ⬜ |
| `NutritionTab.tsx` | 1 273 | <500 | 4 | ⬜ |
| `ProgressTab.tsx` | 1 151 | <500 | 4 | ⬜ |
| `useClientDetail.ts` | 845 | <250 | 5 | ⬜ |
| `useCoachDashboard.ts` | 840 | <250 | 5 | ⬜ |
| `useClientDashboard.ts` | 644 | <250 | 3 | ⬜ |

## Dette restante par domaine

| Domaine | Dette initiale | Cible | Statut actuel |
|---|---|---|---|
| Sécurité préalable | Critique | Aucun P0 ouvert | 🔴 |
| Tests | Élevée | Filet unit/intégration/E2E | 🔴 |
| Données/Supabase | Élevée | Accès centralisés et typés | 🔴 |
| Training | Élevée | Modèle et UI modulaires | 🔴 |
| Nutrition | Élevée | Modèle canonique testé | 🔴 |
| Progression | Moyenne | Agrégations centralisées | 🟠 |
| Coaching/Messaging | Élevée | Hooks et services spécialisés | 🔴 |
| Billing | Élevée | Domaine central et réconciliation | 🔴 |
| IA | Moyenne | Provider et contrats communs | 🟠 |
| Performance/Médias | Élevée | Budgets respectés | 🔴 |
| PWA/Notifications | Moyenne | Tests et observabilité | 🟠 |
| Documentation/Release | Moyenne | Processus reproductible | 🟠 |

---

# 11. Journal de progression

Copier le modèle ci-dessous pour chaque entrée.

## Entrée — AAAA-MM-JJ

**Travail effectué :**  

**Tâches cochées :**  

**Décisions prises :**  

**Problèmes rencontrés :**  

**Risques ou dette restante :**  

**Tests exécutés :**  

**Mesures avant/après :**  

**Temps passé :**  

**Prochaine action :**  

---

# 12. Objectif final

Une fois la roadmap terminée, MoovX doit présenter les caractéristiques suivantes.

## Architecture

- Monolithe modulaire organisé autour de Training, Nutrition, Progression, Coaching, Messaging, Billing, AI, Notifications, Administration et Media.
- Frontières métier explicites et documentées.
- Route handlers minces.
- Services externes accessibles par des adaptateurs testables.
- Accès aux données typés, centralisés et compatibles avec RLS.

## React et Next.js

- Aucun composant central au-dessus de 1 000 lignes.
- Aucun hook-orchestrateur au-dessus de 500 lignes.
- Coque serveur et îlots clients ciblés.
- Chargements et erreurs par segment.
- Fonctionnalités lourdes chargées à la demande.
- Logique métier indépendante du rendu.

## Qualité

- Tests unitaires sur les algorithmes et règles métier.
- Tests d'intégration sur API, RLS, Stripe et services.
- Au moins 15 parcours E2E couvrant client, coach, paiement, séance et nutrition.
- Migrations reproductibles depuis une base vide.
- Release et rollback documentés et répétés.

## Performance

- Bundle initial réduit d'environ 30 % par rapport à la baseline.
- Médias déployés réduits d'au moins 50 %.
- Core Web Vitals suivis par version.
- Requêtes dashboard réduites et agrégations déplacées côté serveur lorsque pertinent.

## Maintenabilité et évolutivité

- Une nouvelle fonctionnalité touche principalement un domaine.
- Un changement de table n'oblige plus à modifier de nombreux composants.
- Billing et IA peuvent évoluer sans réécrire les écrans.
- Le produit peut accueillir de nouveaux développeurs sans dépendre uniquement de la connaissance du créateur.
- L'application reste adaptée aux premières dizaines de milliers d'utilisateurs, avec des points de montée en charge mesurés et identifiés.

---

# 13. Ordre d'exécution recommandé pour une seule personne

La roadmap complète représente plus de six mois de travail à temps partiellement partagé avec le produit. L'ordre suivant est non négociable :

1. Phase 1 — sécurité et flux externes.
2. Phase 2 — tests, contrats et Supabase.
3. Phase 6 — socle Billing critique, au minimum.
4. Phase 3 — Training et WorkoutSession.
5. Phase 4 — Nutrition puis progression.
6. Phase 5 — Coaching et messaging.
7. Phase 7 — plateforme IA.
8. Phase 8 — performance structurelle.
9. Phase 9 — industrialisation finale.

Périmètre réaliste sur six mois pour une personne avec développement produit parallèle :

- Phase 1 complète ;
- Phase 2 complète ;
- socle critique de la Phase 6 ;
- Phase 3 jusqu'au modèle Training, `useClientDashboard` et `TrainingTab` ;
- quelques gains média/lazy loading à faible risque ;
- premiers éléments de la Phase 9.

`WorkoutSession`, Nutrition, Coaching et la plateforme IA doivent être planifiés sur les mois suivants plutôt que compressés artificiellement.

---

> **Principe directeur :** terminer moins de chantiers, mais les terminer avec tests, métriques, documentation et rollback. Une architecture durable se construit par tranches verticales vérifiées, pas par déplacement massif de fichiers.
