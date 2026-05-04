# MoovX Roadmap

## ✅ Sprint 0 - GSAP Landing (29 avril 2026)
- Hero slot-machine reveal
- Gold glow effect

## ✅ Sprint 1A - Coach Templates (29 avril 2026)
- Tags / 15 categories pre-definies
- Recherche filtree (nom + tags)
- Filtre par tags + badges sur cards (AND logic)
- Clone template + auto-edit

## ✅ Sprint 1B - Coach Editor (29 avril 2026)
- Drag-drop exercices @dnd-kit
- IDs name-based stables
- Fix closure stale (state frais via setPDays)
- Dupliquer exercice inline
- Dupliquer jour entier

## ✅ Sprint Mobile Coach (29 avril 2026)
- Hook useIsMobile reutilisable
- Bottom nav 5 tabs
- Toutes pages coach responsive
- Touch targets HIG
- Safe-area-inset-bottom

## ✅ Sprint 2 - Page client enrichie cote coach (29 avril 2026)
### Apercu
- Inline edit target_weight + objective
- Weight journey display (start -> current -> target)

### Progression
- Frequence d'entrainement heatmap (8/12 semaines)
- Top 5 muscles travailles (bar chart)
- Weight chart enrichi avec target reference line
- Timeline chronologique avec filtres par type

## ✅ Sprint 3 - Mobile Client (29 avril 2026)
- ClientProgram : selecteur jour mobile + nav fleches
- ClientNutrition : meal tracker mobile + macros 2x2 + food 3 cols
- Bottom nav 6 tabs deja en place
- Pattern useIsMobile reutilise

## Architecture 2 types de clients (existante)
- coach_clients table + profiles.subscription_type
- 'invited' = client coache (gratuit, controle par coach)
- 'client_monthly'/'client_yearly' = client solo (payant, IA active)
- Permissions via useClientPermissions
- 5 endpoints IA : /api/generate-program, /api/generate-meal-plan, 
  /api/chat-ai, /api/analyze-body, /api/generate-custom-program
- Tous gated par !isInvited cote client

## ✅ Sprint 4 - Meal Plan Coach (2 mai 2026)
- Éditeur meal plan surfacé (bouton 'Éditer' visible dans header Nutrition)
- 3 templates prédéfinis (Sèche 1800kcal / Maintien 2200kcal / Bulk 2800kcal)
- Confirmation avant écrasement si plan existant
- handleApplyMealTemplate dans page.tsx (deep copy + targets)
- setMealPlan exposé dans useClientDetail.ts
- Validé end-to-end : coach assigne → client invité voit le plan

## ⏳ Sprint 4B - Communication polish (à planifier)
### Messages chat in-app
- [ ] Notifications nouveau message (push)
- [ ] Badge non-lus dans bottom nav mobile header
- [ ] Status read receipts améliorés (read_at timestamp)

### ChatAI cote client solo
- [ ] Polish UX ChatAI (persistance historique en DB)

## ✅ Sprint 5 - Dashboard Analytics Coach (3 mai 2026)
- Onglet "Suivi" dans /coach (sidebar desktop + bottom nav mobile)
- useCoachAnalytics : 4 queries parallèles, agrégation JS via Maps
- KPI cards cliquables (Total/Actifs/Décrochent/Inactifs)
- Chips filtre + select tri (statut/nom/dernière activité)
- Statut auto par client (vert/or/rouge/gris selon dernière séance)
- Métriques 7j : séances, streak, delta poids, adhérence nutrition
- Click client → fiche détaillée /client/[id]

## Tech Debt
- [ ] Lift up save callbacks Apercu (target_weight, objective) au parent
- [ ] Augmenter limit muscles aggregation (workout_sessions)
- [ ] Pagination timeline si > 30 entries
- [ ] Sets array refactor (sets: number -> SetItem[])
- [ ] ChatAI conditional in client bottom nav
- [ ] Sprint 6 : Auto-open OverloadModal au début de séance suivante
  (refacto WorkoutSession.tsx pour propager userId+supabase)
- [ ] Sprint 6 : Heuristique faux positif si UI exclut un set vide
  au milieu (55/55/0/55 -> 55/55/55 vu comme 3 sets identiques)
- [ ] Sprint 6 : Unifier source de vérité 'is invited'
  (profiles.subscription_type vs coach_clients.invited_by_coach)
- [ ] Sprint 4 audit : créer migration de rattrapage pour documenter
  le schema réel prod de meal_plans et client_meal_plans
  (les ALTER TABLE manuels ne sont pas dans Git, risque si DB regen)

### Tech debt Sprint 4 (Meal Plan Coach)
- [ ] Calorie targets templates ≠ somme réelle des aliments
  (Sèche : target 1800 kcal, somme aliments = 1555 kcal.
  Maintien et Bulk à vérifier. Fix : ajuster quantités dans
  lib/meal-plan-templates.ts ou recalculer targets dynamiquement)
- [ ] Mismatch format JSONB entre client_meal_plans et meal_plans
  (coach : meals[{type, foods[{name, qty, kcal, prot, carb, fat}]}]
  vs IA : repas{petit_dejeuner[{aliment, quantite_g, proteines}]}.
  Code dupliqué dans viewers. Fix : unifier + migration data)
- [ ] Hiérarchie écran Nutrition coach pas claire
  (sections empilées : TDEE, Plan IA, Plan actif, Tracking, Éditeur.
  Confusion si plan IA et manuel coexistent. Fix : 1 plan actif
  + 1 éditeur, pas 2 sources parallèles visibles)
- [ ] Convention debug logs : préfixer par [feature-debug] pour
  retrouver facilement avec grep avant chaque commit

### Tech debt — Timer audio session iOS
- [ ] Bug : son du timer disparaît quand l'écran iPhone se verrouille
  pendant une séance. Timer visuel continue ✅ mais audio ❌.
  Constaté le 3 mai 2026 (Marco). iOS Safari (PWA ou navigateur).
  Reproductible : oui (à confirmer sur Android).
  Pistes de fix :
  1. Wake Lock API (navigator.wakeLock.request('screen'))
  2. <audio> persistant dans le DOM (vs new Audio() à la volée)
  3. Vibration API en fallback
  4. Service Worker pour notifications timer
  Fichiers : app/components/WorkoutSession.tsx (grep "new Audio|playSound")
  Priorité : haute pour V1 publique (frustration pendant entraînement).
  À corriger avant Sprint 7 Polish.

### Tech debt Sprint 5 (Coach Analytics)
- [ ] Typage Supabase non strict : 2 eslint-disable no-explicit-any
  dans useCoachAnalytics.ts. Fix : créer types custom pour les rows
- [ ] Bottom nav mobile à 6 onglets : peut être serré sur < 360px.
  Alternative : 4 onglets fixes + menu "Plus" pour les autres

### Tech debt — FK manquantes globalement
- [ ] L'audit Sprint 6.5-B a révélé que la DB n'a aucune FK déclarée
  vers profiles en dehors de coach_clients (qu'on vient de fixer).
  Conséquence : tous les autres tables (workout_sessions, weight_logs,
  meal_plans, completed_sessions, etc.) ne supportent pas les joins
  Supabase !inner. À planifier : sprint dédié pour ajouter les FK
  manquantes sur les ~10-15 tables métier importantes.

## Methodologie validee
- 1 sprint = 1 session 2-4h
- 1 branche par feature
- Diff brut OBLIGATOIRE avant chaque commit
- Test sur Mac mode iPhone avant merge
- Documentation au fil de l'eau

## Bug recurrent surveille
Claude Code peut ajouter des liens markdown dans le RENDU du diff.
Verification : grep -c '\[propriete\]' fichier.tsx
Si 0 -> juste affichage Claude Code, fichier OK.
Si > 0 -> fix avec Node script.

## ✅ Sprint 6 — Progressive Overload IA (2 mai 2026)
- Endpoint POST /api/suggest-overload (Claude Haiku 4.5)
- Auth + rate limit + gate invited (subscription_type='invited' bloqués)
- Détection fin de séance dans useClientDashboard (heuristique
  même reps + même weight sur toutes les sets, fire-and-forget)
- Hook useOverloadSuggestion lifté au parent (single source of truth
  pour banner + modal)
- OverloadBanner sur Home (gated par !isInvited)
- OverloadModal : ancien poids barré -> nouveau poids vert + reasoning IA
- 5 scénarios test live validés (Accept, Decline, Heuristiques x3,
  Gate invited, Résilience IA 503)

## ✅ Sprint 6.5 — Cleanup technique (4 mai 2026)
- A : Fix audio iOS lock screen (scheduleBeep via Web Audio API)
- B : Migration FK coach_clients → profiles(id) + refacto join Supabase
- D : Unification source de vérité 'invited' (profiles.subscription_type)
- Fix header AI icon caché pour clients invités

## Patterns techniques valides
- useIsMobile (app/hooks/useIsMobile.ts) : matchMedia 640px breakpoint
- Inline edit (Pencil + Check + X) > Modal pour champs simples
- IDs stables (name-based) pour dnd-kit
- State frais via setPDays(prev => ...) pour eviter closures stales
- safe-area-inset-bottom pour iPhones avec encoche
- touchAction: 'none' pour drag-drop tactile
- Selecteur jour mobile (mini-buttons + ChevronLeft/Right) pour grilles 7+ cols

## Glossaire — sémantique de l'abonnement

**profiles.subscription_type** (source de vérité côté CLIENT)
- 'invited' : client gratuit invité par un coach humain (pas d'IA)
- 'lifetime' : compte permanent à accès illimité (admin, coach par
  défaut, comptes test)
- 'active' / autres : abonnement Stripe payant
- NULL : essai gratuit ou nouveau

**coach_clients.invited_by_coach** (attribut de la RELATION
coach↔client)
- true : cette relation a été créée par invitation du coach
- false : le client a souscrit lui-même (auto-assigné au coach par
  défaut pour les paiements)

Les 2 colonnes sont INDÉPENDANTES sémantiquement. La colonne
pertinente dépend du contexte :
- "Ce CLIENT a-t-il accès à l'IA ?" → profiles.subscription_type
- "Ce COACH a-t-il invité ce client ?" → coach_clients.invited_by_coach
