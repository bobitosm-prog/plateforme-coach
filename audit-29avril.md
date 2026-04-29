# Audit complet — 29 avril 2026 (commit 77c48de)

## 1. SECURITE

### a) Endpoints API sans auth

| Endpoint | Auth | Risque | Action |
|----------|------|--------|--------|
| `/api/food-barcode` GET | AUCUNE | Bas (API publique Open Food Facts) | Ajouter auth |
| `/api/food-search` GET | AUCUNE | Moyen (expose food data) | Ajouter auth |
| `/api/debug-auth` GET | Partielle | Moyen (retourne profil + logs) | Supprimer en prod |
| 22 autres endpoints | OK | — | — |

### b) Variables sensibles cote client
- Aucune fuite detectee. Tous les `process.env` non-NEXT_PUBLIC_
  sont dans app/api/ (server-side).

### c) Cles API hardcodees
- Aucune cle hardcodee trouvee dans le code.

### d) Stripe webhook fallback
- `/api/stripe/webhook/route.ts` et `/api/stripe/checkout/route.ts`
  utilisent ANON_KEY en fallback si SUPABASE_SERVICE_ROLE_KEY
  manquante. RISQUE en production.

---

## 2. ARCHITECTURE COHERENCE

### a) Permissions dispersees
Le pattern de permission `subscription_type === 'invited'` est
repete dans 6+ fichiers hors du hook centralise :
- `/api/chat-ai/route.ts`
- `/api/generate-recipe/route.ts`
- `/api/generate-meal-plan/route.ts` (via guardInvitedClient)
- `/api/suggest-exercise/route.ts`
- `/api/generate-custom-program/route.ts`
- `NutritionTab.tsx`, `ChatAI.tsx`, `TrainingTab.tsx`

Mix de patterns : checks inline vs `guardInvitedClient` wrapper.

### b) useIsMobile — 3 duplications
- `app/coach/page.tsx` : `window.innerWidth > 1024` (isDesktop)
- `app/page.tsx` : `window.innerWidth > 1024` (isDesktop)
- `app/landing/components/Cursor.tsx` : `window.matchMedia('(pointer: coarse)')`

Note : les 2 premiers utilisent un breakpoint 1024px (desktop)
different du hook useIsMobile (640px). Pas un vrai doublon, mais
un candidat pour un hook useIsDesktop().

### c) Supabase dans composants UI — 6 violations
| Composant | Usage |
|-----------|-------|
| `ProfileTab.tsx` | Push notifications |
| `BugReport.tsx` | Bug reporting |
| `VideoFeedbackHistory.tsx` | Video feedback queries |
| `VideoFeedbackModal.tsx` | Video feedback modal |
| `Paywall.tsx` | Subscription check |
| `WorkoutSession.tsx` | Workout data (2 instances) |

### d) Mutations de props
- Aucune mutation directe de props detectee.
- Le refacto Sprint 2 (lift up save callbacks) a corrige les
  2 mutations `profile.target_weight = val` et
  `profile.objective = val`.

---

## 3. TYPESCRIPT / QUALITE CODE

| Metrique | Valeur | Risque |
|----------|--------|--------|
| `: any` ou `as any` | **554** | Haut — typage faible |
| `@ts-ignore` / `@ts-expect-error` | **0** | Excellent |
| `console.log` / `console.warn` | **22** | Bas — nettoyage prod |

Top fichiers avec `any` :
- `useCoachDashboard.ts` (hook returns any[])
- `CoachPrograms.tsx` (exerciseDb: any[])
- `ProgramBuilder.tsx` (program structures)
- `WorkoutSession.tsx` (session data)

---

## 4. PERFORMANCE

### a) Composants > 500 lignes (top 10)

| Composant | Lignes | Priorite refacto |
|-----------|--------|------------------|
| TrainingTab.tsx | 1781 | CRITIQUE |
| ProgramBuilder.tsx | 1297 | CRITIQUE |
| NutritionTab.tsx | 1203 | CRITIQUE |
| WorkoutSession.tsx | 1106 | CRITIQUE |
| ProgressTab.tsx | 1101 | HAUTE |
| page-desktop.tsx | 947 | HAUTE |
| coach/page.tsx | 898 | HAUTE |
| NutritionPreferences.tsx | 824 | HAUTE |
| HomeTab.tsx | 749 | HAUTE |
| CoachPrograms.tsx | 747 | HAUTE |

### b) useEffect suspects
- Tous les `useEffect(fn, [])` examines sont intentionnels
  (mount-only : load initial, timer setup, cleanup).

### c) Console.log oublies
- 22 instances, principalement dans app/api/ (logging server)
  et quelques hooks de debug.

---

## 5. TESTS MANUELS PRIORITAIRES (avant Sprint 4A)

1. **Client solo (rattache fe.ma auto)** → bottom nav doit
   afficher "Coach IA" (Sparkles), pas "Messages"
2. **Client invite (par lien coach)** → bottom nav doit
   afficher "Messages" (MessageCircle), chat avec coach
3. **Coach assigne programme** → client voit le programme
   dans l'onglet Programme
4. **Drag-drop exos coach** → reorder persiste apres
   sauvegarde et reload page
5. **Save target_weight + objective** → valeurs correctes
   en DB, pas de double-render, refresh affiche les bonnes
   valeurs

---

## 6. RECOMMANDATIONS

### Top 3 a fixer AVANT Sprint 4A (messages)

1. **Auth sur /api/food-barcode et /api/food-search** —
   endpoints accessibles sans session. 15 min.
2. **SUPABASE_SERVICE_ROLE_KEY en production** — verifier
   que la variable est set dans Vercel/hosting. 5 min.
3. **Supprimer /api/debug-auth** en production ou le
   proteger avec admin-only. 5 min.

### Top 3 a planifier (session dette future)

1. **Typage fort** — remplacer les 554 `any` par des types
   stricts, commencer par les hooks (useCoachDashboard,
   useClientDetail). 2-3h.
2. **Refacto gros composants** — split TrainingTab (1781),
   ProgramBuilder (1297), NutritionTab (1203) en sous-
   composants. 4-6h total.
3. **Centraliser permissions** — consolider les checks
   `subscription_type === 'invited'` dans un middleware
   ou guard unifie pour les API routes. 1h.

---

## Resume

| Categorie | Score | Detail |
|-----------|-------|--------|
| Securite | 7/10 | 3 endpoints sans auth, 1 fallback Stripe |
| Architecture | 7/10 | Permissions dispersees, supabase dans UI |
| TypeScript | 5/10 | 554 any, 0 ts-ignore |
| Performance | 6/10 | 10+ composants > 500 lignes |
| Mobile | 9/10 | Sprints Mobile Coach + Client complets |
| UX coherence | 8/10 | Design tokens, patterns inline edit |

Session du 29 avril : **7 sprints merged, 0 regression detectee**.
