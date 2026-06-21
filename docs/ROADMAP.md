# MoovX — Roadmap

> Document vivant. Mis à jour à chaque fin de session.
> État au 2026-06-14. Branche `main`.
> **Règle anti-dérive : ce doc reflète `main`, pas l'inverse. Si un doc contredit le code, le code gagne — vérifier avant de planifier.**

---

## CAP

**Mettre l'app entre les mains de vrais utilisateurs payants à Genève, et la rendre excellente avec leur feedback.**

Principe directeur : **livré et utilisé > parfait et invisible.**

Mesure n°1 : passer de **0 à 1 utilisateur payant réel**. Tout le reste en découle. Tant que ce chiffre est à 0, le risque n°1 du projet n'est aucun bug technique — c'est de construire quelque chose que personne ne veut, sans le savoir.

Les 3 horizons, dans l'ordre temporel :

1. **Launch beta Genève** ← MAINTENANT
2. **App Store iOS** (si la beta prouve la rétention)
3. **Assurance maladie suisse** (si traction démontrable)

---

## HORIZON 1 — Launch beta Genève (cap immédiat)

**Critère de réussite :** 5-10 vrais utilisateurs (pas Marco, pas comptes test) qui complètent un parcours réel — signup → onboarding → 1ère séance → 1er plan repas → 1 semaine d'usage. Objectif : l'app survit au contact d'inconnus.

**Stratégie d'acquisition :** pub Instagram + TikTok (visuels SEEDANCE), offre « 20 premiers inscrits = gratuit 2 mois ».

**Note critique sur les chiffres :** 20 inscrits ≠ 20 testeurs. Attendre ~5-8 actifs réels, 2-3 qui reviennent. Le « gratuit » sélectionne mal l'engagement — le vrai test viendra quand on demandera de payer. Viser large à l'inscription.

### Phase A — BLINDER (avant toute pub)

Rien de tout ça n'est négociable avant d'envoyer du trafic. Une pub qui marche vers un produit cassé = acquisition brûlée.

- [ ] **Vercel Pro** — Hobby = ToS non-commercial (infraction dès 1 payant) + débloque maxDuration 60s→300s (générations IA ~50s à la limite). Prérequis légal absolu.
- [ ] **Mécanisme beta gratuit 2 mois** — à implémenter (code promo Stripe 60j OU flag DB `beta_tester` bypass paywall, modèle `lifetime` existant) + TESTER (un beta qui se heurte au paywall au jour 11 = expérience ratée).
- [ ] **Parcours signup→onboarding→1ère séance validé E2E par un TIERS** — pas par Marco. Le bug `training_location` (signup cassé 6 jours, invisible) prouve que ce parcours n'est pas réellement validé de bout en bout.
- [ ] **Observabilité minimale** — 5 bugs latents découverts par hasard cette semaine. Avec de vrais users, besoin de voir les erreurs QUAND elles arrivent. Fiabiliser `app_logs` (un insert fire-and-forget ne loggue pas — vu sur PAGE_REDIRECT).

### Phase B — ACQUÉRIR (quand Phase A est cochée)

- [ ] Visuels SEEDANCE + prompts Insta/TikTok (Claude aide)
- [ ] Page d'inscription beta + mécanisme « 20 premiers »
- [ ] Lancement pub

### Phase C — APPRENDRE

- [ ] Observer les 20 : qui complète, qui revient, où ça coince
- [ ] Itérer sur feedback réel (c'est ICI que les P1 ci-dessous se priorisent vraiment)

---

## HORIZON 2 — App Store iOS

**Critère d'entrée :** la beta a prouvé la RÉTENTION (les gens reviennent, pas juste s'inscrivent). Sinon Capacitor + HealthKit = effort gâché sur un produit non validé.

- Wrapper Capacitor (PWA → app native)
- HealthKit sync (non accessible depuis PWA)
- Conformité guideline 3.1.3(b) : Stripe sur web, login-only sur iOS (multiplateforme/reader-app)

---

## HORIZON 3 — Assurance maladie suisse

**Critère d'entrée :** base d'utilisateurs + traction démontrable. SWICA/KPT ne référencent pas une app à 0 user.

- Positionnement remboursement (SWICA/KPT)
- Angle GLP-1 / préservation musculaire
- Dossier de référencement

---

## BACKLOG (hors bloqueurs launch)

Priorisé. Les P0 sont dans Horizon 1 Phase A ci-dessus. Ce qui suit se traite PENDANT ou APRÈS la beta, sur feedback réel.

### P1 — Fiabilité (pendant la beta)

- **#18 — IA invente les valeurs nutritionnelles.** `generate-meal-plan` génère kcal/macros de tête → imprécision sur TOUS les aliments (ex. poulet 200 au lieu de 165 kcal/100g). Marché Genève soucieux des macros = enjeu réel. Fix de fond : contraindre l'IA aux 170 aliments suisses vérifiés (injection prompt OU validation post-génération). Gros chantier.
- **Bloc D — cohérence schéma↔code.** Le pattern racine de TOUS les bugs latents de la semaine : drift code↔schéma + `await supabase` sans check error (échecs silencieux). Ex. résolus : `personal_records.unit`, `user_badges.badge_type`, `training_location`, `completed_sessions` morte. Audit systématique à planifier.
- **Refonte exercise_id FK** (ex-TICKETS) — `workout_sets.exercise_id` UUID FK vers `exercises_db`, prioriser match par id sinon nom. Résout le bug séance libre (noms variants non matchés).
- **Validation total_weeks** (ex-TICKETS) — champ requis à la création de programme périodisé (sinon `advanceWeek` guard bloque).

### P2 — Confort

- Recovery Modal V2 (overlay SVG zones musculaires)
- AccountTab V2 (sections Objectifs + Préférences fonctionnelles)
- Déplacer toggle notifs ProfileTab → Préférences (migrer states push + handler iOS + props vers AccountTab ; risque hub/ClientIntlProvider)
- Perf : PWA boot iOS (paralléliser Phase C, cache role localStorage, lazy-load par tab)
- Templates emails restants (invite user, change email, reauth)

### P3 — Cosmétique / hygiène

- Accents FR manquants dans messages/fr.json (Deconnexion ×2 restants, prefsTitle, modal "Reprendre la séance", etc.) — passage i18n dédié
- `www.moovx.ch` cassé dans proxy.ts MARKETING_HOSTS (transformé en Markdown au paste, à re-corriger)
- warnings images.qualities Next.js 16
- lockfile parent orphelin
- web-push DEP0169 (url.parse deprecated)
- Consolidation variant_groups fragmentés (4 groupes hip hinge)
- Nettoyage page.tsx ligne ~270 (chemin PAGE_REDIRECT mort)

### Idées V2/V3 (sur feedback)

- Scanner d'assiette IA (haute priorité si demandé)
- Form check vidéo
- Proactive nudges
- Notification combinée F6.C ("Ton plan adapté est prêt")

---

## NOTE — Detour qualite 19-21 juin

Sessions 19-21/06 = detour qualite Home (hors cap "0→1 payant") : fiabilisation donnees
(streak/Recovery/heure hero/cache hit), refonte coherence visuelle (SectionTitle, closer,
assiduite). 14 commits. Le cap reste Horizon 1 launch beta — feature "jours restants"
PRIORITAIRE a reprendre.

---

## ÉTAT DE SANTÉ (14 juin)

**Solide :** closed-loop AI (diagnostic → regen meal+programme), i18n ~99%, RLS 57/57, RGPD delete, sécurité durcie (rate limits, webhook Stripe validé), push web (réparé 13 juin), persistance séance (draft + reprise).

**Fragile :** dette cohérence schéma↔code (Bloc D — source des bugs latents), fiabilité nutritionnelle IA (#18), 0 utilisateur réel (le vrai risque).

**Stack :** Next.js 16 + TS + Tailwind + Supabase + Anthropic API + Stripe Live, Vercel (Hobby → Pro requis), Cloudflare DNS. Repo `bobitosm-prog/plateforme-coach`. Prod `app.moovx.ch`, landing `moovx.ch`.
