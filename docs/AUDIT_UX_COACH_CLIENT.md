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
- [ ] Quick win #1bis — Étendre interactivité aux autres écrans coach
- [ ] Quick win #2 — Composant Card unifié
- [ ] Polish micro-interactions
- [ ] (fond) Migration inline → tokens
- [ ] (fond) Découpage monoblocs
- [ ] Audit interactivité côté client (HomeTab, etc.)
