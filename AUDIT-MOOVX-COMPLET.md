# AUDIT COMPLET — MoovX
**Date : 16 avril 2026**
**Score global : 62/100**

---

## 1. SÉCURITÉ (Score : 35/100)

### CRITIQUES (corriger immédiatement)

| # | Faille | Fichier | Impact |
|---|--------|---------|--------|
| 1 | `/api/delete-account` — AUCUNE authentification. N'importe qui peut supprimer n'importe quel compte avec un POST `{ userId }`. Utilise service_role, bypass RLS. | `app/api/delete-account/route.ts` | Destruction de données |
| 2 | `/api/assign-coach` — AUCUNE authentification. N'importe qui peut s'assigner un coach et obtenir un abonnement "invited" gratuit. | `app/api/assign-coach/route.ts` | Bypass paiement |

### HAUTES (corriger cette semaine)

| # | Faille | Fichiers | Impact |
|---|--------|----------|--------|
| 3 | 10 routes IA sans authentification (`chat-ai`, `generate-program`, `analyze-body`, etc.) | `app/api/*/route.ts` | Coût financier (appels Anthropic illimités) |
| 4 | `/api/send-notification` sans auth | `app/api/send-notification/route.ts` | Spam push |
| 5 | XSS via `dangerouslySetInnerHTML` sans DOMPurify | `app/components/ChatAI.tsx:280` | Injection script |
| 6 | 82 `console.log/error/warn` restants, certains loguent des données utilisateur | Multiple fichiers | Fuite de données en prod |

### MOYENNES

| # | Faille | Détails |
|---|--------|---------|
| 7 | `.env.local` contient 8 clés sensibles (OK, pas dans git) | `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc. |
| 8 | Service role utilisé dans 7 API routes | Acceptable pour les routes serveur, mais certaines ne vérifient pas l'auth |
| 9 | `.ilike` avec input utilisateur dans food-search | Faible risque (PostgREST paramétrise) |

### OK
- `.env.local` dans `.gitignore`
- Pas de clés API hardcodées dans le code client
- Pas de SQL brut / injection
- RLS activé sur les tables (via migration)

---

## 2. DESIGN (Score : 65/100)

### Cohérence des tokens

| Problème | Count | Sévérité |
|----------|------:|----------|
| `rgba(201,168,76,...)` hardcodé (devrait être un token gold opacity) | 40+ | HIGH |
| Inline `background: #...` hors design tokens | 109 | HIGH |
| `fontFamily` hardcodé au lieu de `fonts.*` | 50+ | HIGH |
| Hex hardcodé (`#131313`, `#0e0e0e`, `#e6c364`) | 5 | LOW |
| Fonts non-brand (`Plus Jakarta Sans`, `Inter` dans MuscleHeatMap) | 2 fichiers | MEDIUM |
| Remnants liquid-glass | 0 (nettoyé) | OK |

### Recommandations design
- Créer des tokens `GOLD_06`, `GOLD_10`, `GOLD_15`, `GOLD_20`, `GOLD_25` pour les opacités gold
- Remplacer tous les `fontFamily: "'Barlow Condensed'"` par `FONT_DISPLAY`
- `MuscleHeatMap.tsx` et `AchievementToast.tsx` utilisent des fonts non-brand

---

## 3. PERFORMANCE (Score : 60/100)

### Fichiers trop gros (>500 lignes)

| Lignes | Fichier | Action recommandée |
|-------:|---------|-------------------|
| 2 021 | `TrainingTab.tsx` | CRITIQUE — Découper en sous-composants |
| 1 280 | `ProgramBuilder.tsx` | Extraire les sections (AI form, manual form, day editor) |
| 1 203 | `NutritionTab.tsx` | Extraire journal, recherche, plan |
| 933 | `ProgressTab.tsx` | Extraire graphiques, mensurations |
| 895 | `WorkoutSession.tsx` | Extraire timer, exercise cards |
| 823 | `NutritionPreferences.tsx` | — |
| 674 | `HomeTab.tsx` | — |
| 577 | `onboarding/page.tsx` | — |
| 569 | `TechniquePopup.tsx` | — |
| 535 | `admin/page.tsx` | — |

### State management

| Métrique | Valeur | Sévérité |
|----------|-------:|----------|
| `useState` total | 568 | HIGH — TrainingTab seul en a 57 |
| `useEffect` total | 123 | MEDIUM |
| `React.memo` | 0 | HIGH — Aucune memoization |
| `useMemo` | 32 | MEDIUM |
| `useCallback` | 8 | MEDIUM |
| `.map/.filter/.reduce` dans TrainingTab | 52 | HIGH — Recalculés à chaque render |

### Recommandations performance
- `React.memo` sur tous les sous-composants purs (TrainingExerciseCard, etc.)
- `useMemo` pour les calculs lourds dans TrainingTab
- Framer Motion est le package le plus lourd — vérifier si les animations sont nécessaires partout
- Images hero en `public/` : utiliser `next/image` avec WebP automatique

---

## 4. FONCTIONNEL (Score : 88/100)

### Checklist Features

| Feature | Statut | Détails |
|---------|--------|---------|
| Inscription client | ✅ OK | `/register-client/page.tsx` |
| Inscription coach | ✅ OK | `/register-coach/page.tsx` |
| Login / Auth | ✅ OK | `/login/page.tsx` (242 lignes) |
| Onboarding fitness (quiz) | ✅ OK | `/onboarding-fitness/` |
| Onboarding profil (TDEE/macros) | ✅ OK | `/onboarding/page.tsx` (577 lignes) |
| Onboarding photo (analyse IA) | ✅ OK | `/onboarding-photo/` |
| Dashboard Home | ✅ OK | `HomeTab.tsx` (674 lignes), muscle heat map |
| Header (avatar, badge objectif, icônes) | ✅ OK | `Header.tsx` |
| Phrase motivante journalière | ✅ OK | Dans HomeTab |
| Calendrier horizontal | ✅ OK | `WeekCalendar.tsx` + `MonthCalendar.tsx` |
| Programme d'entraînement | ✅ OK | `TrainingTab.tsx` + `ProgramBuilder.tsx` |
| Programme périodisé 12 semaines | ✅ OK | Phases P1/P2/P3, semaine courante |
| Import/Export programme Excel | ✅ OK | `lib/program-excel.ts` |
| Planification programme (date démarrage) | ✅ OK | `StartProgramModal.tsx` |
| Séance active (timer, sets/reps) | ✅ OK | `WorkoutSession.tsx` (895 lignes) |
| Séance libre | ✅ OK | Via WorkoutSession |
| Tempo (2-0-2) | ✅ OK | Badge + inputs dans TrainingTab |
| Techniques avancées | ✅ OK | `TechniquePopup.tsx` (569 lignes) |
| Bibliothèque exercices | ✅ OK | `ExerciseSearchModal.tsx` |
| Exercices de remplacement | ✅ OK | Variantes dans TrainingTab |
| Timer repos entre séries | ✅ OK | Dans TrainingTab |
| Nutrition — Journal | ✅ OK | `NutritionTab.tsx` |
| Nutrition — Plan IA (7 jours) | ✅ OK | `/api/generate-meal-plan/` |
| Nutrition — Recherche aliments | ✅ OK | `/api/food-search/` (ANSES + Fitness) |
| Nutrition — Scanner barcode | ✅ OK | `BarcodeScanner.tsx` + `/api/food-barcode/` |
| Nutrition — Mes repas (CRUD) | ✅ OK | Dans NutritionTab |
| Nutrition — Recettes | ✅ OK | `/api/generate-recipe/` |
| Hydratation (+250ml) | ⚠️ Partiel | Table `water_intake` existe, pas d'UI dédiée |
| Suivi poids (graphique) | ✅ OK | `WeightModal.tsx` + graphique ProgressTab |
| Mensurations | ✅ OK | `MeasureModal.tsx` |
| Analyse IA corporelle | ✅ OK | `/api/analyze-body/` + `BodyAssessment` |
| Photos avant/après | ✅ OK | Dans ProgressTab |
| Records personnels (PR) | ✅ OK | `lib/personal-records.ts` |
| Export données (.xlsx) | ✅ OK | `lib/program-excel.ts` |
| Coach IA (chat) | ✅ OK | `ChatAI.tsx` + `/api/chat-ai/` |
| Messages coach-client | ✅ OK | `MessagesTab.tsx` (temps réel) |
| Profil (modifier infos) | ✅ OK | `ProfileTab.tsx` |
| Changement d'objectif | ✅ OK | `ObjectiveModal.tsx` (wizard 4 étapes) |
| Rappels d'entraînement | ✅ OK | `push_subscriptions` + `/api/send-notification/` |
| Mon abonnement (Stripe) | ✅ OK | `Paywall.tsx` + 6 routes Stripe |
| Historique paiements | ✅ OK | `PaymentHistory.tsx` |
| Badges / Gamification | ✅ OK | 20 badges, `BadgesModal`, `BadgeCelebration` |
| Système XP / Levels | ✅ OK | 7 niveaux dans `lib/gamification.ts` |
| Récupération musculaire | ✅ OK | `MuscleHeatMap.tsx` |
| Streak | ✅ OK | `updateStreak()` dans `lib/gamification.ts` |
| PWA | ✅ OK | `manifest.json` + `sw.js` |
| Bottom nav (tabs) | ✅ OK | 6 tabs client + 6 tabs coach |
| Design system centralisé | ✅ OK | `lib/design-tokens.ts` (adoption 40+ fichiers) |

**Bilan : 42 ✅ OK, 1 ⚠️ Partiel, 0 ❌ Cassé**

---

## 5. CODE QUALITY (Score : 72/100)

| Métrique | Résultat | Sévérité |
|----------|----------|----------|
| TypeScript errors | 0 | OK |
| TODO/FIXME/HACK | 0 | OK |
| Fichiers inutilisés | 5 composants (`MetallicRing`, `StatCircle`, `GoldButton`, `AchievementToast`, `Toast`) | LOW |
| `supabase.from('profiles')` — appels directs | 75 dans 35 fichiers | HIGH — Pas de couche d'accès centralisée |
| Routes API totales | 25 | — |
| Tabs client | 6 | — |

---

## 6. RÉSUMÉ ET PRIORISATION

### Score global : 62/100

| Axe | Score | Poids |
|-----|------:|-------|
| Sécurité | 35/100 | Critique |
| Design | 65/100 | Moyen |
| Performance | 60/100 | Moyen |
| Fonctionnel | 88/100 | Bon |
| Code Quality | 72/100 | Moyen |

### CRITIQUES — Corriger immédiatement

1. **Auth sur `/api/delete-account`** — N'importe qui peut supprimer n'importe quel compte
2. **Auth sur `/api/assign-coach`** — Bypass du paiement, accès coach gratuit
3. **Auth sur les 10 routes IA** — Coût financier illimité (appels Anthropic)

### IMPORTANTS — Corriger cette semaine

4. **XSS dans ChatAI** — Ajouter DOMPurify avant `dangerouslySetInnerHTML`
5. **Auth sur `/api/send-notification`** — Spam push
6. **Console.log en prod** — Supprimer les 82 `console.log/error/warn`
7. **Tokens gold opacity** — Créer `GOLD_06` à `GOLD_25`, remplacer les 40+ `rgba(201,168,76,...)`

### AMÉLIORATIONS — Nice to have

8. **Hydratation** — Implémenter l'UI de suivi eau (la table existe, pas l'interface)
9. **Supprimer les 5 composants inutilisés** — Dead code
10. **`next/image`** — Optimiser les images hero avec WebP

### DETTE TECHNIQUE — À planifier

11. **Découper TrainingTab.tsx** (2021 lignes, 57 useState) en sous-composants
12. **Couche d'accès données** — Centraliser les 75 appels `profiles` dans un service
13. **React.memo** — Ajouter la memoization (0 `React.memo` dans toute l'app)
14. **Fonts** — Remplacer les 50+ `fontFamily` hardcodés par les tokens `fonts.*`
15. **Inline styles** — Migrer les 109 `background: #...` hardcodés vers les tokens
