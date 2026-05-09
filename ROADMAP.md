# MoovX — Roadmap consolidee

> Source de verite UNIQUE pour la planification produit.
> Pour l'etat instantane (HEAD, branche, tache en cours), voir `SESSION_LOG.md`.
> **MAJ obligatoire a chaque modif** (sprint clos, tech debt resolue, decouverte).

**Derniere mise a jour** : 2026-05-09 01:30 (post-Sprint Refonte Progression)
**HEAD synchro** : `aedc9a8` (chore remove suggest-set-weight)
**Stack** : Next.js 16.1.6 · React 19.2.3 · Supabase 2.105 · TypeScript 5 · Tailwind 4

---

## ⚠️ Etat global — alertes critiques

**🔴 BLOQUANT V1 PUBLIQUE** (audit 7 mai 2026)
1. ~~**Sprint Securite**~~ ✅ DONE (7 mai 2026, branche `sprint-securite`) — 4 fallbacks SERVICE_ROLE fixes, 3 routes Stripe auth-gated, log-error rate-limited, debug-auth whitelisted
2. **Layout desktop client incomplet** — Messages sidebar absent, scroll chat 302px
3. **Audio iOS lock screen** ✅ resolu Sprint 6.5-A

**Metriques code** (au 7 mai 2026)
- 32 206 lignes `.tsx` repartis sur ~130 fichiers
- 497 `: any` explicites (86 fichiers) — typage sous-investi
- 10 composants > 500 lignes — max TrainingTab 1774 lignes
- 54 `<img>` natifs vs 5 fichiers `next/image` — perf mobile degradee
- ~620 / 638 boutons sans `aria-label` (~97%) — a11y WCAG fail

---

## Sommaire

1. [Sprints livres — App produit](#sprints-livres--app-produit)
2. [Sprints livres — Mobile responsive](#sprints-livres--mobile-responsive)
3. [Sprints livres — Animations GSAP](#sprints-livres--animations-gsap)
4. [Backlog priorise](#backlog-priorise)
5. [Tech debt](#tech-debt)
6. [Long terme](#long-terme)
7. [Architecture & conventions](#architecture--conventions)
8. [Glossaire](#glossaire)

---

## Sprints livres — App produit

### ✅ Sprint Refonte Progression de Charge (9 mai 2026)
- Lib pure unifiee lib/training/compute-progression.ts + 33 tests (`0bf9628`)
- Wire TrainingExerciseCard preview (`5cfb3f5`) + WorkoutSession seance (`6f0ef2b`)
- Suppression overloadHint intra-seance + getIncrementForExercise/parseTopOfRange locaux
- Suppression ancienne lib suggest-set-weight.ts (`aedc9a8`)
- 3 statuses : progress/hold/deload, step adaptatif, refWeight=max sets valides

### ✅ Sprint Realtime Messages (9 mai 2026)
- Phase 1 : chat messages live via Supabase Realtime (`8733e5f`)
  - 2 channels filtres serveur (coach-chat-in + coach-chat-out)
  - INSERT + UPDATE (read receipts), dedup + filtrage JS par conv
  - Polling 3s → 30s (Phase 1) → 120s (Phase 2)
- Phase 2 : unread counts + last messages live (`e67527b`)
  - Channel global independant de selectedClient
  - Derivation locale unreadCounts + lastMessages depuis payload
- Latence <500ms (vs 0-3s), charge DB ~60x reduction

### ✅ Sprint Layout Desktop Messages (9 mai 2026)
- Layout 2 colonnes desktop : sidebar 320px fixe + panel flex-1 (`5003eea`)
  - Extraction ConversationList.tsx + ConversationPanel.tsx depuis CoachMessages
  - CoachMessages refacto en orchestrateur leger mobile/desktop
  - Empty state desktop (MessageSquare + "Selectionnez une conversation")
  - Highlight conv selectionnee, back button masque en desktop
  - Layout root coach : height:100dvh conditionnel sur section messages
  - Auto-scroll rAF×2 + re-scroll apres load images
- Mobile inchange (liste → overlay fullscreen)

### ✅ Sprint BUG 1 + BUG 2 Training (7 mai 2026)
- **BUG 1** Weight input accepte virgule FR (TrainingExerciseCard + WorkoutSession)
  - TrainingExerciseCard input + 4 displays toLocaleString FR (`6225d09`)
  - WorkoutSession refacto state weightRaw decouple de weight (`d594e7d`)
  - Reps NaN guard + sanitize digits-only
- **BUG 2** Per-set weight suggestion from previous session (`b3dc4f4`)
  - lib/training/suggest-set-weight.ts pure function (progress/hold/missed)
  - Wire dans TrainingExerciseCard : badge vert "+step", badge gris "Garder"
  - Strikethrough sur cell PREC quand prev reps < target repsMin
  - Tap-to-autofill kg + reps avec valeurs precedentes
  - Bodyweight detection (regex sur name)

### ✅ Sprint 0 — GSAP Landing (29 avril 2026)
- Hero slot-machine reveal + Gold glow effect

### ✅ Sprint 1A — Coach Templates (29 avril 2026)
- Tags / 15 categories pre-definies
- Recherche filtree + filtre par tags + badges (AND logic)
- Clone template + auto-edit

### ✅ Sprint 1B — Coach Editor (29 avril 2026)
- Drag-drop @dnd-kit, IDs name-based stables
- Fix closure stale (state frais via setPDays)
- Dupliquer exercice inline + jour entier

### ✅ Sprint 2 — Page client enrichie cote coach (29 avril 2026)
- Inline edit target_weight + objective, weight journey
- Frequence d'entrainement heatmap, top 5 muscles, weight chart + target line
- Timeline chronologique avec filtres

### ✅ Sprint 4 — Meal Plan Coach (2 mai 2026)
- Editeur surface, 3 templates (Seche 1800 / Maintien 2200 / Bulk 2800)
- Confirmation avant ecrasement, deep copy + targets

### ✅ Sprint 4B — Communication polish (5 mai 2026)
- **Phase 1** : read receipts (Check/CheckCheck), badges unread, Sparkles AI gate
- **Phase 2** : photo dans message (compression Canvas 1080px JPEG q=80, bucket prive `message-media`, signed URLs cache, style WhatsApp)

### ✅ Sprint 5 — Dashboard Analytics Coach (3 mai 2026)
- Onglet "Suivi", `useCoachAnalytics` 4 queries paralleles
- KPI cards cliquables, chips filtre, tri, statut auto vert/or/rouge/gris
- Metriques 7j : seances, streak, delta poids, adherence nutrition

### ✅ Sprint 6 — Progressive Overload IA (2 mai 2026)
- `POST /api/suggest-overload` (Claude Haiku 4.5), auth + rate limit + gate invited
- Detection fin de seance (heuristique fire-and-forget)
- OverloadBanner Home + OverloadModal (ancien barre → nouveau vert + reasoning)

### ✅ Sprint 6.5 — Cleanup technique (4 mai 2026)
- ✅ A : Fix audio iOS lock screen (Web Audio API scheduleBeep)
- ✅ B : Migration FK `coach_clients → profiles(id)` + refacto join Supabase
- ✅ C : Unification format meal plans (livre Sprint 6.6)
- ✅ D : Unification source de verite "invited" (`profiles.subscription_type`)

### ✅ Sprint 6.6 — Unification format meal plans (5 mai 2026)
- Phase 1 : type canonique + parser tolerant (`0813b2a`)
- Phase 2 : writer IA produit format canonique (`274f5d7`)
- Phase 3 : 3 readers refacto (`822bad0`, `2a2fa4a`, `bc2b4f7`, `aa0f22d`)
- Phase 4 : migration SQL des 6 plans legacy
- Backup DB `meal_plans_backup_20260505` — **a supprimer le 5 juin 2026**

### ✅ Sprint ChatAI persistance (6 mai 2026)
- Phase 1 : table `chat_ai_messages` + RLS + auto-purge 30j (`7a4fe2a`)
- Phase 2 : route serveur + hook `useChatAI` (`ce7474a`)
- Phase 3 : cablage UI + bouton trash + UX polish (`0d2400a`)

### ✅ Sprint UX gym (5 mai 2026)
- Set row Big Stack (`30d9d2a`), Hero Banner full-width (`1097c34`)
- Mode reorganiser exos style Strong + fix input warning 8-12 (`6543ac3`)
- Hint overload progressif chrono repos (`b576e78`, fix `d81bbac`)
- Heuristique overload fix faux positifs (`670407c`)

### ✅ Sprint Outillage (5 mai 2026)
- `sync-exercise-media.js` : sync local→Supabase par slug + update par id (`d9d2fdc`)

---

## Sprints livres — Mobile responsive

### ✅ Sprint Mobile Coach Programs + autres pages (29 avril 2026)
- Pattern `isMobile`, hook `useIsMobile` (`app/hooks/useIsMobile.ts`)
- Bottom nav 5 tabs, paddingBottom + safe-area-inset-bottom, touch targets 38px

### ✅ Sprint Mobile Client (29 avril 2026)
- ClientProgram, ClientNutrition responsive, bottom nav 6 tabs

### ✅ Sprint Mobile bottom nav fix (5 mai 2026)
- Responsive <380px (`15a911d`), bump 420px (`5850f81`)
- Media queries ≤419px compact, ≤359px icon-only

---

## Sprints livres — Animations GSAP

### ✅ Hero landing (29 avril 2026)
- `app/landing/components/Hero.tsx`, yPercent 110→0 + skewY 4→0
- Stagger 0.15s, expo.out, Gold textShadow pulse

> Skills installes : gsap-core, gsap-scrolltrigger, gsap-timeline, gsap-performance, gsap-plugins
> Philosophie : GSAP a fond sur la landing, cisele dans l'app.

---

## Backlog priorise

### 🔴 P0 — Cette session OBLIGATOIRE

#### Sprint Securite (~2h, items #1 #2 #3 audit)
- [x] ✅ Fix 4 fallbacks `SERVICE_ROLE_KEY || ANON_KEY` → throw 500 (eb412f2)
- [x] ✅ Auth check sur 3 routes Stripe (b539abe)
- [x] ✅ Rate limit + service_role fix `/api/log-error` (eb412f2)
- [x] ✅ `/api/debug-auth` durci whitelist dev only (21a5850)

### 🟠 P1 — Court terme (1-3 sessions)

1. **Sprint Layout Desktop** (~3-4h, item #7)
   - Messages sidebar `page-desktop.tsx`
   - Vue Messages 2 colonnes (liste + chat actif)
   - Fix scroll chat contraint 302px

2. **Sprint Images** (~3h, item #4)
   - Migrer 54 `<img>` → `next/image` (priorite : WorkoutSession, CoachMessages, BodyAssessment)
   - Move `sharp` de devDependencies → dependencies (item #16)

3. **Test live Big Stack + Hero Banner + Reorder mode** (`30d9d2a`, `1097c34`, `6543ac3`) — non teste en gym reelle

4. **Sprint Refacto composants > 500 lignes** (~L cumule, item #5)
   - TrainingTab 1774 → splitter sous-composants
   - ProgramBuilder 1297, WorkoutSession 1230, NutritionTab 1205, ProgressTab 1101
   - Strategie : extraire d'abord les sections `render*` puis hooks

### 🟡 P2 — Moyen terme

5. **Sprint Qualite Code** (~2-3h, items #9 #10 #15 #16 #17 #18)
   - Retirer 14 `console.log` (5 fichiers)
   - Fix 2 `eslint-disable react-hooks/exhaustive-deps` (vrais bugs deps)
   - Move `sharp` → dependencies
   - Retirer `@supabase/auth-helpers-nextjs` (deprecated, on a `@supabase/ssr`)
   - Retirer `@supabase/auth-ui-react` + `@supabase/auth-ui-shared` si inutilises
6. **Sprint FK manquantes** (~M, item #11)
   - ~10-15 tables : `workout_sessions`, `weight_logs`, `meal_plans`, `completed_sessions`...
   - Permet joins `!inner` Supabase, integrite referentielle
7. **Hierarchie ecran Nutrition coach** (~S, item #12) — decision UX (1 plan actif + 1 editeur)
8. **Bug import meal plan multi-date** (~S, item #13) — variant A/B/C a trancher
9. **Sets array refactor** `sets: number → SetItem[]` (~M, item #14)
10. **Sync media autres exos** (utiliser `sync-exercise-media.js`)

### 🟡 Sprint Accessibilite (~M-L, item #8)
- Audit systematique aria-label sur ~620 boutons
- Focus management, roles ARIA sur modals
- **A planifier avant V1 publique** (WCAG fail)

### 🟢 P3 — GSAP polish

11. **Landing avancee** : Magnetic CTA buttons, ScrollTrigger fade-in (Results, Nutrition), Stats counters animes
12. **App polish** : Page transitions, Stagger lists (sessions/exos/sets), PR confetti
13. **GSAP avance** : Onboarding anime, Dashboard coach graphiques

### 🟢 P3 — Tech debt isolee

14. **Sprint typage strict** (~XL, item #6) — 497 `any` a typer
15. **Lift up save callbacks Apercu** (target_weight, objective)
16. **Pagination timeline** si > 30 entries
17. **Limit muscles aggregation** (workout_sessions)
18. **ChatAI conditional** in client bottom nav

---

## Tech debt

### Sprint 4 audit
- [ ] Migration de rattrapage pour documenter schema reel prod `meal_plans` + `client_meal_plans` (ALTER TABLE manuels pas dans Git)

### Sprint 4 (Meal Plan)
- [x] ✅ Calorie targets templates calibres (4 mai 2026)
- [x] ✅ Mismatch format JSONB resolu Sprint 6.6 (5 mai 2026)
- [ ] Convention debug logs : prefixer `[feature-debug]` pour grep avant commit

### Sprint 4B (Messagerie)
- [x] ✅ Liste conversations coach refacto (5 mai 2026, `979f78c`)
- [x] ✅ `console.error` dans `useSignedUrl.ts` (5 mai 2026)

### Sprint 5 (Coach Analytics)
- [ ] Typage Supabase non strict : 2 `eslint-disable no-explicit-any` dans `useCoachAnalytics.ts:227`
- [x] ✅ Bottom nav 6 tabs debordement <420px (`15a911d`, `5850f81`)

### Sprint 6 (Overload IA)
- [x] ✅ ~~Auto-open OverloadModal~~ — **Abandonne** (`fcb4f07` unwire banner+modal, hint chrono suffit)
- [x] ✅ Heuristique faux positif sets oublies (`670407c` setsTarget guard)
- [x] ✅ Source de verite "invited" unifiee (Sprint 6.5-D `profiles.subscription_type`)

### Fix training inputs 7 mai 2026
- [x] ✅ Bug input kg refusait virgule FR (commits `6225d09` + `d594e7d`, merge `7ca33f2`)
- [x] ✅ Per-set weight suggestion from previous session (`b3dc4f4`)
- [ ] Reps input dans WorkoutSession sanitize digits-only — UX edge case "8,5" devient "85" silencieusement (a ameliorer si feedback users)
- [ ] **Tap-to-autofill BUG 2** : a valider en gym mobile reelle (desktop browser ne dispatch pas le click sur span correctement)
- [ ] **WorkoutSession (Seance libre) sans BUG 2** : per-set suggestion + autofill present uniquement dans TrainingExerciseCard. Sprint future pour porter les memes features dans WorkoutSession (~1h-1h30, layout Big Stack different)
- [ ] **Badge "Garder" strikethrough** : le badge SERIE 3 missed est aussi en strikethrough par heritage du span parent. Detail UX a fixer plus tard
- [ ] **Bug navigation : annuler edition programme → retour onboarding** — Reproduire : ouvrir un programme en edition, click "Annuler", l'app navigue vers onboarding au lieu de revenir a la vue precedente. Decouvert 7 mai 2026 pendant test live BUG 2. Effort : 30min-1h (router.push() au mauvais endroit dans handler annuler). Priorite : 🟡 P2
- [x] ~~BUG MessageImage refetch signed URLs en boucle~~ FAUX POSITIF — log dans render body (pas useEffect) loggait chaque re-render React, pas de refetch reel. Cache useSignedUrl fonctionne correctement.
- [x] ✅ ~~Sprint Realtime Messages~~ DONE (`8733e5f` + `e67527b`) — polling 3s remplace par Supabase Realtime, fallback 120s
- [ ] **Sprint Refonte page Mes Clients coach** — table actuelle moche (headers colles, pas de hierarchie, hover absent, avatars incoherents). Effort M (3-4h)

### Decouvertes audit 7 mai 2026
- [ ] **497 `: any` explicites** dans 86 fichiers (page-desktop 51, TrainingTab 57, HomeTab 31, ProgressTab 30) — XL
- [ ] **14 `console.log`** dans 5 fichiers prod (WakeLock, ExerciseInfo, invite-client, send-notification) — XS
- [ ] **13 `eslint-disable`** dont 2 `react-hooks/exhaustive-deps` masquent vrais bugs (`coach/page.tsx:47`, `useCoachAnalytics.ts:227`) — S
- [ ] **54 `<img>` natifs** vs 5 `next/image` — LCP +1-3s mobile — M
- [ ] **10 composants > 500 lignes** — TrainingTab 1774, ProgramBuilder 1297, WorkoutSession 1230, NutritionTab 1205, ProgressTab 1101 — L
- [ ] **~620 boutons sans `aria-label`** (~97%) — WCAG fail — M-L
- [ ] **`sharp` en devDependencies** au lieu de dependencies → Next/Image degrade en prod — XS
- [ ] **`@supabase/auth-helpers-nextjs`** + `@supabase/ssr` en parallele (auth-helpers deprecated) — S
- [ ] **`@supabase/auth-ui-react/shared`** probablement inutilise (login custom) — XS
- [ ] **`/api/debug-auth`** existe (gate NODE_ENV mais surface) — XS

### Layout desktop client incomplet
- [ ] Pas d'item Messages dans sidebar desktop
- [ ] Pas de vue Messages integree desktop (`onNavigate('messages')` bascule mobile)
- [ ] Container chat contraint ~302px wrapper parent non identifie
- [ ] `scrollIntoView` ne positionne pas en bas, input sticky compresse
- → Effort total : 3-5h dans Sprint Layout Desktop dedie

### Generale
- [ ] Lift up save callbacks Apercu (target_weight, objective) au parent
- [ ] Augmenter limit muscles aggregation (workout_sessions)
- [ ] Pagination timeline si > 30 entries
- [ ] Sets array refactor (`sets: number → SetItem[]`)
- [ ] ChatAI conditional dans client bottom nav
- [ ] `getShoppingList()` lit encore `activeMealPlan.plan_data` brut (non bloquant)

---

## Long terme

### Sprint Native — Capacitor + App Store / Play Store

**Prerequis** (a valider avant lancement)
- ✅ Audio iOS lock screen (Sprint 6.5-A)
- ✅ Sprint Securite (7 mai 2026)
- ❌ Sprint Layout Desktop
- ❌ Sprint FK manquantes
- ❌ Sprint Accessibilite (avant V1 publique)
- App web stable, PWA testee
- Comptes Apple Dev ($99/an) + Google Play Console ($25)

**Scope**
1. Setup Capacitor (`capacitor.config.ts`)
2. Config iOS (Xcode, certificats)
3. Config Android (Gradle, Play Console)
4. Migration push : Web Push → APNS + FCM via `@capacitor/push-notifications`
5. Audio background natif
6. Wake lock natif via `@capacitor/screen`
7. Tests builds (TestFlight, Internal Testing)
8. Soumission stores
9. Marketing : screenshots, ASO

**Effort** : 3-5 sessions (~15-20h cumule) · **Cout** : $99/an + $25 one-time

---

## Architecture & conventions

### 2 types de clients
- `coach_clients` table + `profiles.subscription_type`
- `'invited'` = client coache (gratuit, IA bloquee)
- `'client_monthly'` / `'client_yearly'` = solo (payant, IA active)
- `'lifetime'` = admin / coach defaut / test
- 5 endpoints IA gates par `!isInvited` :
  `/api/generate-program`, `/api/generate-meal-plan`, `/api/chat-ai`, `/api/analyze-body`, `/api/generate-custom-program`

### Patterns techniques valides
- `useIsMobile` : matchMedia 640px breakpoint
- Inline edit (Pencil + Check + X) > Modal pour champs simples
- IDs stables (name-based) pour @dnd-kit
- State frais via `setPDays(prev => ...)` pour eviter closures stales
- `safe-area-inset-bottom` iPhones encoche
- `touchAction: 'none'` drag-drop tactile
- Selecteur jour mobile (mini-buttons + ChevronLeft/Right) grilles 7+ cols

### Pattern mobile reutilisable
```tsx
import { useIsMobile } from '../../hooks/useIsMobile'

export default function MyComponent() {
  const isMobile = useIsMobile()
  return (
    <div style={{
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      flexDirection: isMobile ? 'column' : 'row',
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      padding: isMobile ? 8 : 4,
    }}>...</div>
  )
}
```

### Methodologie validee
- 1 sprint = 1 session 2-4h
- 1 branche par feature
- Diff brut **OBLIGATOIRE** avant chaque commit
- Test sur Mac mode iPhone avant merge
- Documentation au fil de l'eau (SESSION_LOG + ROADMAP)
- **MAJ ROADMAP obligatoire en fin de sprint** (voir CLAUDE.md)

### Bug recurrent surveille
Claude Code peut ajouter des liens markdown dans le RENDU du diff.
- Verification : `grep -c '\[propriete\]' fichier.tsx`
- Si `0` → juste affichage Claude Code, fichier OK
- Si `> 0` → fix avec Node script

---

## Glossaire

### Semantique de l'abonnement

**`profiles.subscription_type`** (source de verite cote CLIENT)
- `'invited'` : client gratuit invite par coach humain (pas d'IA)
- `'lifetime'` : compte permanent acces illimite (admin, coach defaut, test)
- `'active'` / autres : abonnement Stripe payant
- `NULL` : essai gratuit ou nouveau

**`coach_clients.invited_by_coach`** (attribut de la RELATION coach↔client)
- `true` : relation creee par invitation du coach
- `false` : client a souscrit lui-meme (auto-assigne au coach defaut)

> Les 2 colonnes sont **INDEPENDANTES** semantiquement :
> - "Ce CLIENT a-t-il acces a l'IA ?" → `profiles.subscription_type`
> - "Ce COACH a-t-il invite ce client ?" → `coach_clients.invited_by_coach`
