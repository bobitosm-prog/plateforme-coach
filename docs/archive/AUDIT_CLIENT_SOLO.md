# AUDIT COMPLET — Parcours Client SOLO MoovX

**Date** : 2026-06-12
**Auditeur** : Claude Code (Opus 4.6, 6 agents paralleles)
**Perimetre** : parcours autonome (SOLO) de bout en bout — code, API, securite, UX, gamification
**Methode** : lecture du code source (150+ fichiers), croisement SESSION_LOG + dettes connues

---

## 1. CARTOGRAPHIE DU PARCOURS SOLO

### Flux reel de bout en bout

```
Signup (/register-client)
  |-> Supabase auth + auto-assign coach (assign-coach?autoAssign=true)
  |-> Email confirmation -> /auth/callback -> force re-login -> /login?confirmed=1
  |
Onboarding V2 (/onboarding-v2) — 12 etapes
  |-> Profil, corps, objectif, activite, sessions/sem, nutrition, experience,
  |   photo IA, equipement, preferences, recap macros
  |-> Fin : trial_ends_at = now+10j, needs_initial_generation = true
  |
Dashboard (/)
  |-> useInitialGeneration : genere meal plan (SSE) + programme (JSON) en parallele
  |-> Banner "Preparation de ton programme..."
  |-> Si echec partiel : flag reste true, retry au prochain chargement
  |
Seance quotidienne (TrainingTab + WorkoutSession)
  |-> Calendrier semaine (swipe anime) -> selection jour -> exercices
  |-> Logging inline (kg/reps), rest timer auto, tempo executor
  |-> Fin : +100 XP, updateStreak, PR detection, celebration confetti
  |
Nutrition (NutritionTab)
  |-> Meal plan IA ou coach, logging manuel, scan barcode (Open Food Facts)
  |-> Photo meal -> Claude Sonnet analyse macros
  |-> Recettes IA, water tracking, copie/favoris repas
  |
Suivi & diagnostic (ProgressTab + HomeTab)
  |-> Poids, mensurations, photos progres, charts Recharts
  |-> Check-in quotidien (humeur, sommeil, notes) -> +10 XP
  |-> Diagnostic hebdo IA (Claude Opus) : score 0-100, ajustements macros,
  |   objectif SMART, push notification
  |
Retention
  |-> Badges (20), XP/niveaux (10 tiers), streaks (calcules)
  |-> Paywall a J+10 si pas d'abonnement (CHF 10/mois, 80/an, 150 lifetime)
```

### Etat par etape

| Etape | Fichiers cles | Etat |
|-------|---------------|------|
| Signup + auth | `register-client/`, `auth/callback/route.ts`, `api/assign-coach/` | SOLIDE — OAuth Google/Apple + email, PKCE |
| Confirmation email | `auth/callback/route.ts:53` | INCOMPLET — pas de page de confirmation, redirect direct login |
| Onboarding V2 | `onboarding-v2/OnboardingV2Content.tsx` (650+ L) | SOLIDE — 12 etapes completes, macros Mifflin-St Jeor |
| Generation initiale | `hooks/useInitialGeneration.ts` (174 L) | FRAGILE — pas de timeout, pas de retry UI, echec partiel silencieux |
| Seance | `tabs/TrainingTab.tsx` (1746 L), `WorkoutSession.tsx` (1598 L) | SOLIDE mais COMPLEXE — localStorage offline, rest timer, tempo |
| Nutrition | `tabs/NutritionTab.tsx` (1219 L) | SOLIDE — dual DB (ANSES 3970 + community), barcode, photo IA |
| Diagnostic IA | `api/weekly-diagnostic/`, `WeeklyDiagnosticCard.tsx` | SOLIDE — 7 sources de donnees, coherence checks, push notif |
| Gamification | `lib/gamification.ts`, `lib/check-badges.ts` | FRAGILE — double source streak, celebrations asynchrones |
| Paywall | `components/Paywall.tsx` (218 L) | SOLIDE — 3 plans Stripe, trial gate fonctionnel |

---

## 2. DETTES TECHNIQUES (par severite)

### Dettes deja consignees (SESSION_LOG + docs)

| Dette | Fichier | Severite | Effort | Statut |
|-------|---------|----------|--------|--------|
| Cablage PR — checkForPR jamais appele du vrai flux | TrainingTab L.689 -> useClientDashboard | HAUTE | 45 min | OUVERT |
| Purge flux mort TrainingTab L.655-695 | TrainingTab.tsx | HAUTE | 30 min | OUVERT |
| Double source streak — user_xp vs calcul on-the-fly | gamification.ts / check-badges.ts | HAUTE | 1h | OUVERT |
| Image delivery 2,2 MiB LCP | Landing + hero images (55 `<img>` non optimisees) | HAUTE | 2h | OUVERT |
| weightPeriod ternaire identique | AnalyticsSection L.64 | BASSE | 5 min | OUVERT |
| Lockfile parasite ~/package-lock.json | racine | BASSE | 2 min | OUVERT |

### Dettes decouvertes par l'audit

| Dette | Fichier | Severite | Effort |
|-------|---------|----------|--------|
| 529 annotations `: any` + 58 `as any` | Codebase entiere (top: TrainingTab 70+, WorkoutSession 60+) | HAUTE | L (progressif) |
| N+1 delete/insert sequentiels | NutritionTab L.181 (clearMeal), L.185 (applySavedMeal) | HAUTE | 20 min |
| Composants >1000 L (4 fichiers) | TrainingTab 1746, WorkoutSession 1598, NutritionTab 1219, ProgressTab 1132 | HAUTE | L (refacto) |
| TrainingTab : 47 useState, 9 useEffect | TrainingTab.tsx L.83-140 | HAUTE | L |
| NutritionTab : 55+ useState | NutritionTab.tsx L.45-80+ | HAUTE | L |
| Pas de page confirmation email | auth/callback/route.ts L.53 | MOYENNE | 30 min |
| useInitialGeneration sans timeout ni retry UI | hooks/useInitialGeneration.ts L.57-159 | MOYENNE | 30 min |
| AchievementToast.tsx defini mais jamais utilise | components/ui/AchievementToast.tsx | BASSE | 5 min |
| 80 console.log de debug en prod | WorkoutSession, cron routes | BASSE | 15 min |
| Onboarding V1 mort (3 pages) | onboarding/, onboarding-fitness/, onboarding-photo/ | BASSE | 30 min |
| Trial banner hardcode en francais | page.tsx L.528-530 | BASSE | 10 min |
| TODO upgrade Vercel Pro (x2) | api/weekly-diagnostic/cron L.9, api/training-regen/cron L.8 | INFO | — |

---

## 3. ROBUSTESSE & SECURITE

### Inventaire API (42 routes)

**Evaluation globale : RISQUE MOYEN-HAUT**

#### Routes IA (couteuses) — rate limiting

| Route | Auth | Rate limit IP | Rate limit AI (DB) | Validation input |
|-------|------|---------------|-------------------|------------------|
| `/api/chat-ai` | OK | 15/60s | — | OK (500 chars max) |
| `/api/generate-recipe` | OK | 10/60s | — | MANQUE |
| `/api/generate-program` | OK | 5/60s | — | MANQUE |
| `/api/generate-custom-program` | OK | OK | 5/h | OK (guard invited) |
| `/api/generate-meal-plan` | OK | OK | 10/h | OK (macros valides) |
| `/api/generate-exercise-instructions` | OK | MANQUE | MANQUE | — |
| `/api/analyze-progress-photo` | OK | OK | 10/h | — |
| `/api/analyze-meal-photo` | OK | 5/60s | OK | MANQUE (pas de limite taille base64) |
| `/api/analyze-body` | OK | MANQUE | MANQUE | — |
| `/api/suggest-exercise` | OK | MANQUE | MANQUE | — |
| `/api/suggest-overload` | OK | ? | ? | — |

**3 routes IA sans rate limit** = risque d'abus de cout (generate-exercise-instructions,
analyze-body, suggest-exercise). A $0.015/1K tokens Opus, un attaquant peut generer
des centaines de dollars/jour.

#### Stripe / Paiements

| Route | Auth | Validation | Risque |
|-------|------|-----------|--------|
| `/api/stripe/webhook` | Signature Stripe OK | Metadata non validee (clientId, subType) | HAUT — injection metadata |
| `/api/stripe/checkout` | UUID seul (pas d'auth session) | UUID valide | MOYEN — intentionnel pour signup |
| `/api/stripe/coach-checkout` | OK | Rate coach 30-500 CHF | OK |

**Webhook metadata** : `session.metadata.clientId` et `subType` ne sont pas valides
(UUID regex, enum allowlist). Un attaquant pourrait forger une session Stripe avec
un clientId arbitraire pour s'attribuer un abonnement.

#### Validation input manquante

| Route | Champ non valide | Risque |
|-------|-----------------|--------|
| `/api/assign-coach` L.20 | coachId, autoAssign | Assignation arbitraire |
| `/api/invite-client` L.29 | inviteLink format/longueur | Token reuse |
| `/api/food-search` L.20 | query sans max length, limit sans plafond | DoS full table scan |
| `/api/analyze-meal-photo` L.30 | base64 sans limite taille | DoS via image 100 MB |

#### RLS Supabase

- **RPC delete-account** : EXCELLENT — SECURITY DEFINER, auth check interne, atomique,
  51 touch points (migrations/20260522090303)
- **RLS audite** : 57 tables, 7 fixes securite livres (Sprint Launch Prep Phase 2)
- **Tables a verifier** : community_foods, chat_ai_messages, ai_usage_logs, app_logs
  (RLS non confirme par l'audit)

#### Headers securite (next.config.js) : EXCELLENT

CSP strict, X-Frame-Options DENY, HSTS 2 ans, Permissions-Policy restrictif,
X-Content-Type-Options nosniff.

#### Gestion d'erreur IA

- Timeouts : AUCUN sur les appels Anthropic (ni cote client ni cote serveur)
- Retries : aucun retry automatique
- Couts : pas de tracking de tokens dans le code (facturation Anthropic directe)
- Estimation cout diagnostic hebdo : ~$0.01/user/semaine = ~$520/an pour 1000 users

#### Mode offline / PWA

- localStorage pour sets/inputs en cours de seance (offline-safe)
- Pas de service worker de cache general
- Barcode scanning necessite connexion (Open Food Facts API)

---

## 4. EXPERIENCE & ECARTS vs LEADERS

### Seance (ref: Strong / Hevy)

| Feature | MoovX | Strong | Hevy | Verdict |
|---------|-------|--------|------|---------|
| Logging inline (kg/reps) | OK — champs en place | Fastest (plate tapping) | Cards | 80% de Strong |
| Rest timer auto | OK — countdown, beep, haptic, msg motiv | Identique | Identique | PARITE |
| Tempo tracking | SUPERIEUR — executor phases, haptic/rep | Info seulement | Timer integre | AVANTAGE MoovX |
| Celebration PR | Toast seulement | Overlay + confetti | Modal + badge | INFERIEUR |
| Supersets | ABSENT | Indicateur paire | Exercices couples | ABSENT |
| Swap exercice mid-seance | ABSENT (builder seulement) | Swap temps reel | Suggestions IA | ABSENT |
| Progressive overload | API suggest-overload existe | Prompt integre | Historique + auto | PARTIEL |
| Historique par muscle | ABSENT | Breakdown muscle | Heatmap | ABSENT |
| Periodisation phases | p1/p2/p3 phase-aware | Manuel | Template | AVANTAGE MoovX |
| Notes par set | Session-level seulement | Par exercice | Par set + photos | INFERIEUR |
| Sets avances (drop, rest-pause) | ABSENT | Non | Non | — |

**Verdict seance** : 7/10. Le tempo tracking et la periodisation sont des avantages
reels. Les lacunes principales : pas de supersets, pas de swap mid-seance, PR
celebration minimaliste. Le logging speed est bon mais pas au niveau du plate
tapping de Strong.

### Programme adaptatif (ref: Fitbod)

| Feature | MoovX | Fitbod | Verdict |
|---------|-------|--------|---------|
| Generation IA | Claude Haiku, PPL split, pre-fatigue | Algo proprietaire | EQUIVALENT concept |
| Adaptation par performance | ABSENT — statique apres creation | Auto-adjust poids/volume | ABSENT |
| Deload automatique | ABSENT | Detecte fatigue, reduit | ABSENT |
| Regeneration periodique | next_program_regen_at = +14j | Continu | PARTIEL |
| Progression prescrite | suggest-overload API (4 sessions historiques) | Integre au workout | PARTIEL |
| Diagnostic IA hebdo | Score + ajustements macros/volume | ABSENT chez Fitbod | AVANTAGE MoovX |

**Verdict programme** : 5/10. La generation initiale est solide (prompts scientifiques,
pre-fatigue, periodisation). Mais le programme est STATIQUE — pas d'adaptation
automatique par performance reelle. Le diagnostic hebdo compense partiellement
(ajustements manuels) mais c'est un workaround, pas une adaptation temps reel.

### Nutrition (ref: MyFitnessPal)

| Feature | MoovX | MyFitnessPal | Verdict |
|---------|-------|-------------|---------|
| Base alimentaire | 3970 ANSES/Ciqual + community | 14M+ aliments | INFERIEUR (niche CH/FR) |
| Barcode scan | Open Food Facts | Proprietary DB | EQUIVALENT qualite, INFERIEUR couverture |
| Photo meal IA | Claude Sonnet analyse | Non | AVANTAGE MoovX |
| Macro tracking (P/G/L) | OK | OK | PARITE |
| Micronutriments | Fibre/sucre barcode seulement | Complet (vitamines, mineraux) | INFERIEUR |
| Meal plan IA | Generation complete, respect regime | Non | AVANTAGE MoovX |
| Recettes IA | Filtrage regime, macros, favoris | Non | AVANTAGE MoovX |
| Historique fast-add | ABSENT (uses_count existe mais pas d'UI) | "Frequent" en haut | ABSENT |
| Water tracking | Manuel, pas de rappels | Manuel + rappels | INFERIEUR |
| Offline | ABSENT (API required) | Complet | ABSENT |

**Verdict nutrition** : 6/10. La photo meal IA et les recettes generees sont des
differenciateurs. La base alimentaire est suffisante pour la Suisse romande mais
pas pour un marche global. Le fast-add et les rappels hydratation manquent.

### Retention / motivation (ref: Duolingo)

| Feature | MoovX | Duolingo (fitness) | Freeletics | Verdict |
|---------|-------|--------------------|-----------|---------|
| Streaks | BUGGE (double source) | Prominent, fiable | Solide | CRITIQUE |
| Badges | 20 badges, 5 categories | Dense (50+) | Aucun | BON concept, INSUFFISANT quantite |
| Niveaux XP | 10 tiers (DEBUTANT->TITAN) | 50+ niveaux | Non | BON |
| Leaderboards | ABSENT | Friends + global | Global | ABSENT |
| Social sharing | ABSENT | Oui | Oui | ABSENT |
| Push reminders | Infra prete, JAMAIS declenchee | Actif (adaptatif) | Actif | CRITIQUE — infra sans usage |
| Celebrations | Asynchrones (re-mount ProfileTab) | Immediates | Immediates | INFERIEUR |
| Loss aversion | ABSENT ("ton streak est en danger") | Coeur du modele | Non | ABSENT |
| Referral | Badge stub (retourne 0) | Oui | Non | ABSENT |

**Verdict retention** : 4/10. Les fondations existent (XP, badges, streaks, push infra)
mais RIEN n'est connecte en temps reel. Les celebrations arrivent en decale, les
push ne sont jamais envoyes, les streaks sont bugges. C'est le plus gros ecart
vs la vision "Duolingo de la fitness".

### IA differenciante : ce que PERSONNE d'autre n'a

**Forces uniques** :
1. **Diagnostic hebdomadaire IA** (Claude Opus) — analyse croisee 7 sources (training
   volume, nutrition, poids, adherence, coherence objectif). Aucun concurrent ne
   fait ca. Prescriptions quantifiees ("+15g proteines", "+8% volume").
2. **Detection d'incoherence** — flags auto "objectif seche mais poids +0.5kg" ou
   "objectif muscle mais deficit calorique". Unique.
3. **Photo meal IA** — scan un plat, extrait macros. MFP ne l'a pas.
4. **System prompts scientifiques** — pre-fatigue par groupe musculaire, refs Morton
   2017/Phillips 2026, periodisation. Pas du chatbot generique.

**Ce qui manque pour que ce soit LE pitch** :
- Memoire longue du chat (seulement 10 derniers messages)
- Tool use dans le chat (Athena ne peut pas consulter les donnees du user en temps reel)
- Feedback loop sur le diagnostic (le user a-t-il applique les ajustements ? les
  metriques ont-elles progresse ?)
- Adaptation AUTOMATIQUE du programme par la performance (pas juste des suggestions)

---

## 5. TOP 10 PRIORISE

| # | Action | Impact (1-5) | Effort | Type | Justification |
|---|--------|-------------|--------|------|---------------|
| 1 | **Cablage PR** — brancher checkForPR dans onFinishWorkout, filtrer par sets completes, batch | 4 | S (45min) | Reparer | personal_records vide pour tous les users malgre 63+ sets |
| 2 | **Fix streak double source** — migrer vers calcul on-the-fly, supprimer colonnes user_xp stales | 4 | S (1h) | Reparer | Bloque toute monetisation streak, affichage incoherent |
| 3 | **Rate limit 3 routes IA manquantes** + validation taille image | 5 | S (30min) | Reparer | Risque d'abus de cout Anthropic ($100+/jour possible) |
| 4 | **Validation metadata webhook Stripe** (UUID + enum allowlist) | 5 | S (20min) | Reparer | Risque de fraude abonnement |
| 5 | **Push notifications adaptatives** — cron 18h "garde ton streak" si pas de seance du jour | 4 | M (3h) | Nouveau | Infra prete mais jamais declenchee — plus gros levier retention |
| 6 | **Celebrations synchrones** — badge unlock au moment du workout, pas au re-mount ProfileTab | 3 | M (2h) | Reparer | Feedback loop casse = pas de dopamine au bon moment |
| 7 | **Page confirmation email** (/email-confirmed) | 3 | S (30min) | Reparer | Nouveaux users perdus apres signup (redirect brut vers login) |
| 8 | **Image delivery** — convertir 55 `<img>` en next/Image, AVIF/WebP, priority hero | 4 | M (2h) | Reparer | LCP 2,2 MiB = plus gros gain perf dispo |
| 9 | **Purge flux mort TrainingTab** L.655-695 + consolider finish paths | 3 | S (30min) | Reparer | Code mort avec 3 systemes accroches, source de confusion |
| 10 | **Adaptation programme par performance** — suggest-overload integre au prochain programme | 5 | L (1-2 sem) | Nouveau | Le plus gros ecart vs Fitbod, transforme le produit |

**Lecture** : les 4 premiers sont des reparations rapides (<2h totales) qui eliminent
des risques de securite et des bugs visibles. Le 5 est le plus gros levier de
retention a moyen effort. Le 10 est le game-changer produit mais demande du design.

---

## 6. LE VERDICT FRANC

### 3 forces reelles

1. **Le diagnostic hebdomadaire IA est un differenciateur majeur.** Aucun concurrent
   ne croise 7 flux de donnees (volume, nutrition, poids, adherence, coherence,
   semaine precedente) pour produire un score + prescriptions quantifiees. C'est
   le feature qui justifie l'abonnement et que personne ne peut copier sans
   l'infrastructure de donnees.

2. **Le parcours onboarding -> generation est complet et fluide.** 12 etapes qui
   capturent tout le necessaire, calcul macro scientifique, generation IA parallele
   (meal plan + programme) au premier chargement. Un nouveau user a un programme
   et un plan nutritionnel en <60s apres l'onboarding. C'est mieux que Fitbod
   (qui demande de choisir manuellement).

3. **Le tempo tracking est le plus sophistique du marche.** Phases
   eccentric/pause/concentric avec haptic par rep. Strong ne l'a pas. Hevy l'a
   basique. C'est un vrai argument pour les pratiquants intermediaires/avances.

### 3 faiblesses critiques

1. **La retention est une coquille vide.** L'infra est la (XP, badges, push, streaks)
   mais RIEN ne se declenche au bon moment. Les celebrations sont asynchrones
   (re-mount, pas au moment de l'action). Les push ne sont jamais envoyes. Les
   streaks sont bugges. C'est comme avoir un moteur de fusee sans carburant.

2. **Le programme est statique.** Genere une fois, jamais adapte par la performance
   reelle. Le diagnostic hebdo donne des SUGGESTIONS mais ne modifie pas le
   programme automatiquement. L'ecart avec Fitbod (adaptation continue) est le
   plus gros handicap produit.

3. **La dette technique des mega-composants etouffe la velocite.** TrainingTab
   (1746 L, 47 useState), NutritionTab (1219 L, 55 useState), WorkoutSession
   (1598 L) — chaque feature demande de naviguer dans des fichiers de 2000 lignes
   avec des flux morts, des any partout, et des states dupliques. Ajouter un
   superset ou un swap mid-seance dans cet etat serait risque.

### LA chose a faire lundi matin

**Brancher les push notifications adaptatives.** L'infra est prete (Web Push,
VAPID, push_subscriptions, send-notification endpoint). Il manque un cron
de 50 lignes : "a 18h, si l'user a un streak >= 3 et pas de seance aujourd'hui,
envoyer 'Garde ton streak de X jours — ta seance t'attend'". C'est le plus gros
ratio impact/effort de toute la liste : ca transforme une app passive en un
coach qui relance, sans toucher au code existant.

En parallele (meme session) : fixer les 4 reparations securite rapides (#1-4 du
top 10, <2h totales) pour ne pas lancer la beta avec des routes IA non protegees
et un webhook Stripe sans validation.

---

*Rapport genere le 2026-06-12 par analyse automatisee de 150+ fichiers source.*
*Aucun fichier modifie pendant l'audit.*
