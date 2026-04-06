# AUDIT COMPLET — MoovX
> Date : 6 avril 2026 | Branche : main | Dernier commit : 6160221

---

## 1. VUE D'ENSEMBLE

| Metrique | Valeur |
|----------|--------|
| Fichiers .tsx | 95 |
| Fichiers .ts | 46 |
| Total lignes de code | ~28 100 |
| Pages (routes) | 15 |
| API routes | 17 |
| Composants | 40+ |
| Hooks custom | 5 |
| Tables Supabase | 36 |
| Fichiers > 500 lignes | 18 |
| Plus gros fichier | ProgramBuilder.tsx (882 lignes) |

---

## 2. STACK TECHNIQUE

| Technologie | Version |
|-------------|---------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |
| Supabase JS | ^2.99.0 |
| Supabase SSR | ^0.9.0 |
| Stripe | ^20.4.1 |
| Framer Motion | ^12.38.0 |
| Recharts | ^3.8.0 |
| Lucide React | ^0.577.0 |
| Claude API | Sonnet 4, Haiku 4.5 |

---

## 3. PAGES / ROUTES

### Pages client
| Route | Fonction |
|-------|----------|
| `/` | Dashboard SPA (6 onglets) |
| `/login` | Connexion email/password + Google |
| `/register-client` | Inscription (choix role) |
| `/join` | Lien invitation coach |
| `/onboarding` | 5 etapes (infos, corps, regime, prefs) |
| `/onboarding-fitness` | Quiz fitness (score/niveau) |
| `/onboarding-photo` | Analyse photo IA + generation plan |

### Pages coach
| Route | Fonction |
|-------|----------|
| `/coach` | Dashboard coach complet |
| `/client/[id]` | Detail client (5 sous-composants) |
| `/onboarding-coach` | Config Stripe Connect + invitations |

### Pages systeme
| Route | Fonction |
|-------|----------|
| `/admin` | Panel admin (bugs, users) |
| `/landing` | Page marketing (14 sections) |
| `/cgu` `/privacy` | Pages legales |

### API Routes (17)
| Route | Modele IA | Fonction |
|-------|-----------|----------|
| generate-meal-plan | Sonnet 4 | Plan nutrition 7j (SSE, 300s max) |
| generate-custom-program | Sonnet 4 | Programme entrainement genre-specific |
| generate-program | Sonnet 4 | Programme template coach |
| generate-recipe | Haiku 4.5 | Recette IA |
| chat-ai | Sonnet 4 | Assistant IA |
| analyze-progress-photo | Sonnet 4 | Analyse photo corporelle |
| suggest-exercise | Sonnet 4 | Suggestion exercice |
| adapt-workout | Sonnet 4 | Adaptation workout |
| food-search | — | Recherche aliments |
| food-barcode | — | Lookup OpenFoodFacts |
| stripe/checkout | — | Session Stripe client |
| stripe/coach-checkout | — | Checkout coach |
| stripe/webhook | — | Webhook paiements |
| stripe/connect | — | Stripe Connect |
| stripe/check-account | — | Verif compte |
| stripe/setup-products | — | Creation produits |
| assign-coach | — | Assignation coach |
| send-notification | — | Push VAPID |
| delete-account | — | Suppression cascade |

---

## 4. BASE DE DONNEES — 36 tables Supabase

### Utilisateurs (4)
profiles, coach_clients, user_badges, push_subscriptions

### Entrainement (10)
training_programs, user_programs, custom_programs, workout_sessions,
workout_sets, exercises_db, custom_exercises, personal_records,
scheduled_sessions, cardio_sessions

### Nutrition (8)
meal_plans, daily_food_logs, meal_tracking, food_items,
community_foods, custom_foods, recipes, water_intake

### Progres (4)
weight_logs, body_measurements, progress_photos, body_assessments

### Coach (4)
client_programs, client_meal_plans, coach_notes, messages

### Systeme (3)
payments, bug_reports, app_logs

### Storage buckets (2)
progress-photos (prive, signed URLs), avatars (public)

### Realtime (1)
messages — INSERT events pour chat coach-client

---

## 5. INTEGRATIONS

| Service | Usage | Config |
|---------|-------|--------|
| Supabase | Auth, DB, Storage, Realtime | NEXT_PUBLIC_SUPABASE_URL + ANON_KEY |
| Claude Sonnet 4 | Plans nutrition, programmes, chat, photos, suggestions | ANTHROPIC_API_KEY |
| Claude Haiku 4.5 | Recettes | ANTHROPIC_API_KEY |
| Stripe | Checkout, Connect, Webhooks | STRIPE_SECRET_KEY + WEBHOOK_SECRET |
| Google OAuth | Login Google | Via Supabase Auth |
| OpenFoodFacts | Barcode lookup | API publique |
| Web Push VAPID | Notifications | VAPID keys |
| Vercel | Hosting, serverless | vercel.json (no-cache headers) |

---

## 6. DESIGN SYSTEM — Swiss Luxury Dark Gold

### Palette
| Token | Valeur | Usage |
|-------|--------|-------|
| BG_BASE | #0D0B08 | Fond principal (noir chaud bronze) |
| BG_CARD | #141209 | Fond cards |
| BG_CARD_2 | #1A1712 | Fond elevated |
| GOLD | #D4A843 | Accent principal (or cuivre) |
| GOLD_BRIGHT | #E8C97A | Highlight |
| TEXT_PRIMARY | #F5EDD8 | Texte (blanc creme) |
| TEXT_MUTED | #8A8070 | Texte secondaire |
| BORDER | rgba(212,168,67,0.25) | Bordures gold |

### Typographie
- Bebas Neue : titres, chiffres, CTA
- Barlow Condensed : labels, sous-titres
- DM Sans : corps de texte

### Rayons
Cards: 16px, Boutons: 12px, Inputs: 10px, Pills: 8px

### Animations CSS
shimmer (boutons), goldPulse (rings)

### Couleurs hardcodees restantes : 0 (tout passe par tokens)

---

## 7. PWA

| Element | Etat |
|---------|------|
| manifest.json | OK — theme #D4A843, bg #0D0B08, 9 tailles icones |
| sw.js | Minimal — skipWaiting, clear caches, network-first |
| Icones | 72/96/128/144/152/180/192/384/512px generees |
| vercel.json | no-cache sur sw.js et manifest.json |
| Layout | Enregistre SW, auto-reload, meta anti-cache |

---

## 8. SECURITE

### Variables d'environnement (16)
**Cote serveur (secretes)** : ANTHROPIC_API_KEY, STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

**Cote client (NEXT_PUBLIC_)** : SUPABASE_URL, SUPABASE_ANON_KEY,
APP_URL, COACH_EMAIL, ADMIN_EMAIL, 4x PRICE_*, VAPID_PUBLIC_KEY

### Points d'attention
- SUPABASE_SERVICE_ROLE_KEY absent du .env.local (uniquement sur Vercel)
- L'API food-search utilise l'anon key sans session → RLS bloque
- 12 catch vides (silencieux) dans le code coach

---

## 9. QUALITE DU CODE

| Metrique | Valeur | Etat |
|----------|--------|------|
| console.log restants | 27 | ⚠️ A nettoyer |
| Catch vides | 12 | ⚠️ Erreurs silencieuses |
| TODO/FIXME | 0 | OK |
| Couleurs hardcodees | 0 | OK |
| Fichiers > 500 lignes | 18 | ⚠️ A refactorer |
| Build errors | 0 | OK |
| TypeScript strict | Non active | ⚠️ |

### Fichiers les plus gros (candidats au refactoring)
1. ProgramBuilder.tsx — 882 lignes
2. NutritionPreferences.tsx — 830 lignes
3. ProgressTab.tsx — 829 lignes
4. TrainingTab.tsx — 761 lignes
5. NutritionTab.tsx — 761 lignes
6. ProfileTab.tsx — 665 lignes
7. useCoachDashboard.ts — 660 lignes
8. useClientDetail.ts — 649 lignes

### Images non optimisees (31.3 MB total)
| Fichier | Taille |
|---------|--------|
| hero-nutrition.png | 8.9 MB |
| hero-gym.png | 7.6 MB |
| hero-coaching.png | 7.6 MB |
| hero-athlete.png | 7.0 MB |
| logo-moovx.png | 2.2 MB |

---

## 10. FONCTIONNALITES — Etat actuel

| Feature | Etat | Notes |
|---------|------|-------|
| Inscription client | ✅ | Email/password + Google OAuth |
| Inscription coach | ✅ | Avec Stripe Connect |
| Login / Auth | ✅ | Supabase Auth |
| Onboarding (objectif bulk/seche) | ✅ | 5 etapes + quiz fitness |
| Dashboard Home (ring, stats) | ✅ | MetallicRing + StatCircles |
| Phrase motivante journaliere | ✅ | 45 citations par objectif |
| Poids actuel + objectif | ✅ | Card avec tendance |
| Programme entrainement IA | ✅ | Genre-specific PPL |
| Seance active (timer, sets) | ✅ | Timer repos, logs, celebration |
| Ajout exercice en seance | ❌ | Non implemente |
| Choix garder seance modifiee | ❌ | Non implemente |
| Remplacement exercice IA | ⚠️ | API existe, UI partielle |
| Plan nutrition IA (7 jours) | ✅ | SSE streaming, 300s max |
| Import plan IA par repas | ✅ | Bottom sheet avec boutons fixes |
| Recherche aliments (2 bases) | ✅ | Fitness precharge + ANSES live |
| Ajout manuel aliment | ✅ | Custom foods |
| Scanner barcode | ✅ | + sauvegarde community_foods |
| Suivi progression | ✅ | Poids, mensurations, photos, analytics |
| Analyse corporelle IA | ✅ | 3 angles, Claude Sonnet |
| Messagerie coach-client | ✅ | Realtime Supabase |
| Feedback video | ⚠️ | Composants existent, flow partiel |
| Profil utilisateur | ✅ | Avatar, badge Swiss Made |
| Parametres (rappels, son) | ✅ | Push notifs, timer sound |
| Stripe paywall client | ✅ | 3 plans (monthly/yearly/lifetime) |
| Stripe Connect coach | ✅ | Onboarding + commission |
| Attribution auto coach | ✅ | fe.ma@bluewin.ch par defaut |
| PWA | ✅ | Manifest, icones, SW minimal |
| Design Swiss Luxury | ✅ | Tokens, fonts, animations |
| Images hero | ✅ | 4 banners (nutrition, coaching, athlete, gym) |
| Bottom nav 3 tabs | ✅ | Home/Training/Nutrition centres |
| Header icones | ✅ | Progress/Messages/Profil |
| Mode autonome sans coach | ✅ | Acces complet IA |

---

## 11. BUGS CONNUS

1. **Images hero 31 MB** — Temps de chargement excessif sur mobile
2. **27 console.log debug** — A nettoyer avant production finale
3. **12 catch vides** — Erreurs avalees silencieusement (coach hooks)
4. **food-search API** — Route serveur utilise anon key sans session → RLS bloque (contourne cote client)
5. **disliked_foods** — Stocke dans meal_preferences JSONB, pas de colonne dediee

---

## 12. AMELIORATIONS SUGGEREES

### Priorite 1 — Performance
- [ ] Compresser les 5 images hero (31 MB → ~500 KB avec WebP/AVIF)
- [ ] Utiliser next/image avec optimisation automatique
- [ ] Supprimer les 27 console.log

### Priorite 2 — Fonctionnalites manquantes
- [ ] Ajout exercice pendant une seance active
- [ ] Choix garder/rejeter seance modifiee
- [ ] Remplacement exercice par l'IA en seance

### Priorite 3 — Code quality
- [ ] Refactorer les 8 fichiers > 600 lignes en sous-composants
- [ ] Gerer les 12 catch vides (au minimum logger)
- [ ] Activer TypeScript strict mode

### Priorite 4 — UX
- [ ] Animations de transition entre les onglets
- [ ] Skeleton loaders pendant les chargements
- [ ] Haptic feedback sur iOS (vibration)

### Priorite 5 — Securite
- [ ] Ajouter SUPABASE_SERVICE_ROLE_KEY au .env.local
- [ ] Auditer les RLS policies sur toutes les tables
- [ ] Rate limiting sur les API routes IA

---

## 13. RESUME EXECUTIF

MoovX est une application de coaching fitness complete deployee en production
sur app.moovx.ch. Elle couvre l'entrainement (programmes IA, seances live),
la nutrition (plan IA 7 jours, journal, scan barcode), le suivi de progres
(photos IA, analytics), et la messagerie coach-client en temps reel.

**Points forts** : design system coherent (Swiss Luxury), integration IA
profonde (7 routes Claude), PWA installable, mode autonome sans coach,
double base alimentaire (Ciqual + Fitness).

**Points faibles** : images non optimisees (31 MB), fichiers trop gros
(8 fichiers > 600 lignes), console.log de debug restants, 2 features
workout non implementees.

**Recommandation immediate** : compresser les images (gain de 30 MB),
nettoyer les console.log, et implementer l'ajout d'exercice en seance.
