# Audit UX — Espaces Coach & Client

> Date audit : 2026-06-02
> Objectif : interface plus interactive et plus aboutie visuellement
> Méthode : audit terrain du code (pas de refonte à l'aveugle)

## TL;DR

Le problème n'est PAS l'absence de design system — c'est son INCOHÉRENCE et sa SOUS-UTILISATION. Les fondations existent (design-tokens.ts 378L, classes globals.css dont .card-hover, framer-motion) mais le style inline domine (1667 occurrences) et court-circuite ces outils. Résultat ressenti : interface statique et "pas finie". Le travail = consolider + compléter l'interactivité + polir, PAS reconstruire.

## Constats chiffrés

| Métrique | Coach | Client |
|----------|-------|--------|
| Style inline | 538 | 1129 |
| Fichiers important design-tokens | ~12 | 23 |
| Fichiers avec framer-motion | quelques-uns | 8 |
| Interactivité HomeTab (transition/motion) | — | 5 occurrences |

Fondations existantes mais sous-exploitées :
- lib/design-tokens.ts (378 lignes) : système de tokens complet
- globals.css : `button { transition: transform 150ms }`, `.card-hover` (lift -2px + ombre au survol), inputs avec transition
- framer-motion : animations d'entrée (ex: cascade cartes dans ClientsList)

## Diagnostic détaillé

1. INCOHÉRENCE DE STYLE : 3 approches coexistent sans règle (inline 1667×, tokens, classes CSS). Paddings/radius varient d'un écran à l'autre.
2. INTERACTIVITÉ INÉGALE : framer-motion sur certaines listes, mais beaucoup de `<div onClick>` statiques sans hover ni transition. La classe .card-hover existe mais n'est presque pas appliquée.
3. TOKENS SOUS-EXPLOITÉS : design-tokens.ts importé mais l'inline le court-circuite.
4. MONOBLOCS : app/coach/page.tsx (936L), CoachPrograms (747L) — difficiles à faire évoluer.
5. ARCHITECTURE : client mieux découpé (sous-dossiers tabs/training, tabs/nutrition) que coach (tout à plat dans coach/components).

## Plan priorisé (impact / effort)

| # | Action | Impact ressenti | Effort | Type |
|---|--------|-----------------|--------|------|
| 1 | Interactivité globale : hover + transitions sur cartes/boutons/lignes cliquables (appliquer .card-hover existante + transitions) | Très élevé | Faible | Quick win |
| 2 | Cohérence cartes : composant Card unifié (radius/padding/ombre/border via tokens) | Élevé | Moyen | Quick win |
| 3 | Polish micro-interactions : feedback clic, états loading/empty soignés, framer-motion étendu | Élevé | Moyen | Itératif |
| 4 | Migration inline → tokens (réduire les 1667 occurrences) | Moyen (maintenabilité) | Élevé | Chantier de fond |
| 5 | Découpage monoblocs (page.tsx coach, CoachPrograms) | Faible visuel | Élevé | Chantier de fond |

## Démarrage retenu

Quick win #1 sur écran pilote = HUB COACH (app/coach/page.tsx). Appliquer hover/transitions sur les éléments cliquables (cartes, items nav, lignes). S'appuyer sur .card-hover existante et les transitions globals.css. Valider l'effet visuel, puis étendre aux autres écrans coach, puis client.

## Suivi (à cocher au fil des sessions)

- [x] Quick win #1 — Interactivité hub coach (page.tsx) — FAIT 2026-06-02 : hover encadrement doré + glissement sur sidebar + cartes cliquables, classe réutilisable .coach-clickable
- [x] Quick win #1bis — Page Mes Clients en cartes (composant ClientCard réutilisable) — FAIT 2026-06-02 : tableau remplacé par cartes style home + recherche restylée + hover doré
- [ ] Quick win #2 — Composant Card unifié
- [ ] Polish micro-interactions
- [ ] (fond) Migration inline → tokens
- [ ] (fond) Découpage monoblocs
- [x] Audit interactivité côté client (HomeTab) — VÉRIFIÉ 2026-06-03 : UX déjà correcte (boutons avec cursor pointer, active:scale sur addWater, cartes Aperçu = composants EnergyCard/RecoveryCard/NutritionCard dont seule RecoveryCard est cliquable). Pas de chantier justifié (RAS).

## Tech debt / cleanup

- [x] Nettoyer CSS-in-JS mort — FAIT 2026-06-03 : .data-table* et tout l'ancien bloc cartes clients mobile (.client-card-*, .avatar-circle-lg, .msg-badge) retirés de CoachStyles.tsx (le <style> ayant été extrait de page.tsx vers ce composant). Vérifié 0 usage en className.

## Bug TZ systémique — dates locales (À TRAITER en session dédiée, flux par flux)

Découvert le 2026-06-03 lors de l'audit. NE PAS faire de fix partiel (voir avertissement).

**Pattern fautif** : ~55 occurrences de `new Date().toISOString().split('T')[0]` (ou `someDate.toISOString().split('T')[0]`) pour obtenir une chaîne 'YYYY-MM-DD'.

**Cause** : `toISOString()` convertit en UTC. Sur une Date à minuit LOCAL (Genève UTC+1/+2), elle renvoie la veille 22h/23h UTC → `split('T')[0]` donne J-1.

**Impact confirmé** :
- TrainingTab (~345-362) et ProgramBuilder (~246-264) : `monday`/`date` à minuit local → `scheduled_date` des séances de programme enregistré à **J-1 systématiquement** (pas seulement la nuit).
- `new Date().toISOString().split` pour "aujourd'hui" : faux seulement entre minuit et ~02h locales (fenêtre nocturne).
- Inserts de date nocturnes (water_intake, daily_food_logs, weight_logs, cardio, body assessment, achievements) : date persistée = veille si saisie entre 00h–02h.

**⚠️ Cohérence fragile** : lecture + delete + insert utilisent le MÊME pattern décalé (ex TrainingTab delete `gte mondayStr lte sundayStr` puis insert `scheduled_date` décalés pareil). Le système "marche" par cohérence du décalage. **Corriger un seul côté (ex les inserts) CASSE cette cohérence → séances qui disparaissent de l'affichage.**

**Fix recommandé** :
1. Créer un helper `localDate(d = new Date())` = `format(d, 'yyyy-MM-dd')` (date locale).
2. Migrer FLUX PAR FLUX (écriture + lecture + delete ENSEMBLE), avec test à chaque flux. Commencer par scheduled_date (TrainingTab + ProgramBuilder + lectures HomeTab/TrainingTab).
3. NE JAMAIS faire de fix partiel sur un flux.

**Légitimes (ne pas toucher)** : noms de fichiers CSV (page.tsx ~95, ShoppingList ~43), bornes de requête gte/lte (impact négligeable de quelques heures).

**Déjà corrigé** : CoachCalendar + dashboard coach (page.tsx) — coach_appointments lu via `format(new Date(scheduled_at), 'yyyy-MM-dd')` local.

## Harmonisation interaction (referentiel globals.css)

FAIT :
- Referentiel d'interaction fige en tete de globals.css (source de verite)
- Fiche client : auditee, deja coherente (tout en <button> + overlays). Seul ecart corrige : ClientProgram (hover inline -> coach-clickable). page.tsx : carte exercice = hover couleur groupe musculaire CONSERVE (semantique).
- WorkoutSession : span tag -> button, retrait feedback inline redondant, fix padding shorthand.

RESTE (sessions futures, hors landing/* et admin/* qui ont leur propre contexte) :
- Hover inline (onMouseEnter) a traiter : ConversationList, coach/page.tsx, TrainingExerciseCard, OverloadBanner, ChatAI, page-desktop.tsx, login, register-client
- div/span cliquables a taguer coach-clickable (trier overlays modale vs vraies cartes) : coach/* (CoachCalendar, CoachRevenue, ClientCard, SessionDetailModal, CoachPrograms, page), tabs/* (TrainingTab, StartProgramModal, AddExercisePopup, TrainingExerciseCard, SaveChoicePopup, NutritionTab, ProfileTab, ImportPlanSheet, HomeTab, ProgressTab), RecoveryCard, MessageImage, ProgramBuilder, VideoFeedbackModal, ObjectiveModal, ExerciseInfoPopup, FoodSearch, page-desktop
- Methode : 1 fichier/lot, test + commit. Regle d'or : dore par defaut, garder couleur semantique qui informe. <button> = rien a faire (button:active global).
