# MoovX — ROADMAP

> **Derniere mise a jour** : 19 mai 2026, Sprint Launch Prep Phase 1
> **Version actuelle** : v2.8.0
> **Status** : Production live, 0 clients payants, Stripe `sk_LIVE`

---

## Etat SEO (mai 2026)

- Hreflang fr/en/de/x-default: ✅
- Sitemap multilingue: ✅ (3 URLs avec alternates)
- Robots: ✅
- OpenGraph + Twitter Cards par locale: ✅
- Schema.org: ✅ Organization, HealthAndBeautyBusiness, WebSite, SoftwareApplication
- Canonical URLs par locale: ✅
- Google Rich Results: 5 elements valides detectes

---

## ✅ FAIT

### Landing & Branding
- Landing Power & Performance desktop (14 sections, direction Nike/Whoop/IWC)
- Mobile responsive complet (auth + 14 sections landing)
- Language switcher Navbar (FR/EN/DE drapeaux)
- Architecture i18n complete (next-intl 4.12.0, FR/EN/DE, 16 sections traduites)
- Rebrand Stripe Coach IA → Athena (code + dashboard)
- Cleanup repo (14 fichiers .OLD.tsx supprimes)

### SEO (Sprint SEO Vague 1-3)
- Detection langue automatique avec cookie persistant
- SEO technique complet (hreflang, sitemap, robots, OpenGraph)
- Schema.org Organization + LocalBusiness + WebSite + SoftwareApplication

### Securite (Sprint 1)
- Stripe webhook dedup (table stripe_webhook_events, UNIQUE event_id)
- Webhook handler refetch defense in depth, return 200 sauf signature invalide
- Checkout idempotency keys, ordre safe (Stripe avant DB insert)
- UUID validation clientId, erreurs sanitizees, catch e: unknown
- Security headers CSP + X-Frame-Options + X-Content-Type-Options + HSTS + Permissions-Policy

### Legal (Sprint 2)
- CGU + Privacy multilingues FR/EN/DE (nLPD CH + RGPD UE)
- CookieConsent v3 minimal premium (card flottante, animation slide-up)
- AnalyticsGate (Vercel Analytics conditionne au consentement)
- Checkboxes obligatoires PricingSection (acceptCgu + waiveWithdrawal)
- Footer locale-aware + ManageCookiesButton

### Hardening (Sprint 3)
- Rate limiting DB-backed sur 3 endpoints IA couteux (5/h custom-program, 10/h photo, 10/h meal-plan)
- Table ai_usage_logs (RLS, indexes, fail-open)
- Stripe Connect dedup (idempotency key + DB pre-check + update conditionnel)
- Validation coach_monthly_rate 30-500 CHF + normalisation 2 decimales

### i18n Auth (Sprint 4 + 4b)
- Infrastructure AuthIntlProvider pour routes hors [locale] (Strategie B wrapper local)
- 6 ecrans auth traduits FR/EN/DE : login, join, register-client, onboarding, onboarding-fitness, onboarding-photo
- 246 cles extraites, 492 traductions EN/DE, 12 ICU variables
- LocaleSelector dans Compte > Preferences (DB + cookie persistance cross-device)
- Cookie sync au login (profiles.preferred_locale → NEXT_LOCALE)

### Admin & Feedback
- Console admin complete (users, revenue, logs, feedback)
- Feedback admin + visibilite in-app (email branded)
- PWA (manifest, service worker, install prompt)

---

## TODO IMMEDIAT — Avant premiers clients

### Sprint Launch Prep (en cours, 2026-05-19+)

**Phase 1 — Split landing/app sur deux domaines** (4/8 sous-étapes ✅)
- [x] 1.A Refacto `lib/seo.ts` env var
- [x] 1.B Ajout `NEXT_PUBLIC_SITE_URL` (3 environnements)
- [x] 1.C Cookie `NEXT_LOCALE` cross-subdomain (`.moovx.ch`)
- [x] 1.D.1 Helpers `getHostRedirect()` dans `proxy.ts` (dead code)
- [ ] 1.D.2 Câbler helpers dans le middleware (early return)
- [ ] 1.D.3 Étendre le matcher avec regex inversée
- [ ] 1.D.4 Tests locaux via curl avec Host header
- [ ] 1.E Cloudflare DNS : CNAME `app` → `cname.vercel-dns.com`
- [ ] 1.F Vercel : ajouter `app.moovx.ch` dans Domains
- [ ] 1.G Supabase : Redirect URLs + CORS pour `app.moovx.ch`
- [ ] 1.H Validation prod E2E (magic link, login, paywall)

**Phase 2 — RLS audit Supabase**
- [ ] Script SQL cross-tenant (coach A ne voit pas client B)
- [ ] Fix policies trouées sur tables critiques (profiles, payments, bug_reports)
- [ ] Documenter policies par table

**Phase 3 — Delete account RPC transactionnel**
- [ ] Migration `delete_user_account(uuid)` PL/pgSQL
- [ ] Refacto route API pour appeler le RPC
- [ ] Tests rollback (suppression échoue au milieu)

---

## SESSION SUIVANTE — EconomicModel & Polish (~1-2h)

- [ ] Refondre EconomicModel direction Power OU supprimer
- [ ] i18n FR/EN/DE
- [ ] Decommenter dans page.tsx
- [ ] Photos reelles (consentement RGPD)

---

## i18n APPLICATION AUTHENTIFIEE (Sprint 5+, estime ~17h)

> 134 fichiers .tsx restants, ~2740 lignes deja faites Sprint 4.

Fait (Sprint 4) :
- [x] Login, Register, Join
- [x] Onboarding client (profil + fitness + photo)
- [x] LocaleSelector dans Compte > Preferences

Reste :
- [x] Onboarding coach (~556 lignes, 83 cles)
- [~] Dashboard client :
  - [x] ProfileTab + sub-components (86 cles)
  - [x] ChatTab Athena (33 cles)
  - [x] TrainingTab couche 1 — parent + 4 core sub-components (36 cles)
  - [ ] TrainingTab couche 2/3 — modals, exercise cards, program builder (~100+ cles)
  - [x] HomeTab couche 1 — cards, quotes, date locale (23 cles)
  - [ ] HomeTab couche 2 (RecoveryModal + remaining sub-components)
  - [x] NutritionTab parent — meals, tabs, filters, actions (31 cles)
  - [x] ProgressTab parent — pills, sections, dates (23 cles)
- [x] ProfileTab + CoachSection + PaymentHistory + DeleteAccountSection (86 cles)
- [x] ChatTab Athena (33 cles, suggestions + prompts localises)
- [ ] Dashboard coach (~925 lignes)
- [ ] Client view detaillee (~660 lignes)
- [x] Paywall (~217 lignes, 49 cles)
- [ ] Admin dashboards
- [ ] Emails transactionnels
- [ ] Notifications, toasts, error messages

---

## PERFORMANCE (Sprint Perf — 18 mai 2026) ✅

- [x] Audit Lighthouse /fr/landing (baseline + 3 runs post-fix)
- [x] GSAP isolation (Hero animation lazy via dynamic import)
- [x] AVIF + WebP config (images.formats, -99% compression PNG → WebP)
- [x] Hero converti en Server Component (texte SSR, TBT 590ms → 35ms)
- [x] Core Web Vitals desktop : Score 96, LCP 0.54s, TBT 92ms, CLS 0
- [x] Core Web Vitals mobile : TBT 35ms ✅, CLS 0 ✅, FCP 1.2s ✅
- [ ] ~LCP mobile 4G slow simule : ~9s (network+CPU bound, non reducible par code)~
      → LCP terrain estime 1-3s sur appareils recents. RUM a mettre en place.
- [x] ~~Cible < 500 KB JS initial~~ → 259 KB gzip (plancher framework, excellent)
- [ ] ~~Framer Motion tree-shake~~ → skip, gain negligeable 14 KiB

---

## SECURITE & RGPD

- [x] Headers securite (CSP, HSTS, X-Frame-Options)
- [x] Cookie banner RGPD multilingue
- [x] Politique confidentialite 3 langues (nLPD CH + RGPD UE)
- [x] CGU 3 langues
- [ ] Export donnees utilisateur
- [ ] Suppression compte avec transaction RPC Supabase

---

## LAUNCH PREPARATION

- [x] Stripe webhooks signatures (dedup + idempotency)
- [ ] Supabase RLS policies audit
- [ ] Emails transactionnels 3 langues
- [ ] PWA install iOS + Android
- [ ] 14-day trial flow E2E
- [ ] Cancel subscription flow
- [ ] Coach invitation flow
- [ ] Backup quotidien Supabase
- [ ] OG images par locale (remplacer placeholder)
- [ ] 10 testeurs beta Geneve
- [ ] Ajouter sameAs reseaux sociaux dans lib/structured-data.ts quand comptes crees

---

## LONG TERME (Q3-Q4 2026)

- [ ] Italien (tessinois)
- [ ] App native iOS/Android
- [ ] Apple Health / Google Fit / Whoop / Garmin
- [ ] Marketplace coachs
- [ ] B2B wellness corporate
- [ ] Tests E2E Playwright (FR/EN/DE)
- [ ] CI/CD preview deployments
- [ ] Monitoring Sentry / Datadog
- [ ] Admin RBAC en DB (actuellement email hardcode lib/admin/auth.ts)
- [ ] Standardiser catch (e: unknown) sur 33 routes API restantes
- [ ] Creation Sarl quand CA >30-50k CHF ou 10+ clients

---

## Limitations connues

### i18n incomplet
L'app authentifiee reste FR hardcode (134 fichiers non i18n).
Le LocaleSelector affecte uniquement les 6 ecrans auth + landing publique.

### Patterns DB FR hardcodes
- `mapGoalToObjective` compare des dbLabels en francais (Perdre du poids, etc.)
- Pattern food matching a l'etape meals reste FR-only
- → traiter dans Sprint dedie "i18n DB food names" (~2-3h)

### Exercise videos — 16 parents sans media
Squat Halteres, Mollets Debout, Planche, Rowing Haltere, Leg Curl Couche,
Face Pulls, Good Morning, Fentes, Fente Bulgare, Tirage Vertical,
Curl Barre EZ, Extension Triceps Poulie, Triceps Poulie Corde,
Kickbacks Cable, Abduction Machine, Pont Fessier.
→ Tournage en salle ou bibliotheque stock (MP4 H.264, 5-10s loop, 720p).

### Exercise name matching — limites du prefix fallback
"Developpe Halteres Couche" ne matche pas "Developpe Couche" (pas un prefix).
→ Token matching plus avance si volume de faux negatifs augmente.

### Delete account sans transaction
Suppression partielle possible si erreur au milieu (15+ tables sequentielles).
→ Migrer vers RPC Supabase avec transaction.

### LCP mobile 4G slow simule ~9s
Network+CPU throttling Lighthouse (1.6 Mbps + 4x CPU slowdown).
LCP terrain estime 1-3s sur appareils recents (desktop mesure : 0.54s).
13 sections landing restent en Client Components — pattern Server Component
applicable si Real User Monitoring montre le besoin.

### AVIF non servi sur Vercel Hobby
Config `images.formats: ['image/avif', 'image/webp']` en place.
Vercel Hobby sert WebP uniquement. AVIF s'activera sur upgrade Pro (~20$/mois).

---

## Decisions architecturales

### 14 mai 2026
- `proxy.ts` (Next 16) > `middleware.ts` pour auth + i18n
- `localePrefix: 'always'` → URLs propres
- `app/layout.tsx` racine (fonts, PWA, providers globaux)
- `app/[locale]/layout.tsx` wrapper minimal NextIntlClientProvider
- EconomicModel skip (refonte Power a venir)
- Stripe Connect commission MoovX = 3%

### 17 mai 2026 — SEO
- generateMetadata doit vivre dans la route la plus profonde (page.tsx > layout.tsx)
- Sitemap/robots dynamiques via app/sitemap.ts et app/robots.ts
- JSON-LD via @graph unique (recommandation Google)
- lib/seo.ts et lib/structured-data.ts = single source of truth

### 17 mai 2026 — i18n Sprint 4
- Strategie B (AuthIntlProvider wrapper local) plutot que migration URL [locale]/login
  → preserve les liens existants (magic links Stripe, emails deja envoyes)
- Pattern split server wrapper (page.tsx) + client content (PageContent.tsx)
- IDs techniques DB (weight_loss, omnivore) jamais traduits
- dbLabels FR conserves pour compat mapGoalToObjective
- profiles.preferred_locale = source de verite cross-device, synce via cookie NEXT_LOCALE

### 18 mai 2026 — Performance
- Hero = Server Component (texte SSR, hydration decouplee du LCP)
- Animation GSAP lazy via dynamic import + ssr:false (HeroAnimation.tsx)
- CSS @keyframes pour animations d'apparition initiale (resilient, pas de dep JS)
- AVIF config presente, attente upgrade Vercel Pro
- Cible bundle "500 KB" retiree : 259 KB gzip = plancher framework
- Lighthouse simulated traite comme worst-case, pas cible absolue

---

## Progression globale

```
Landing Marketing desktop  100%  (14/14 sections Power + i18n)
Landing Marketing mobile   100%  (responsive complet, valide iPhone)
Landing SEO                100%  (hreflang, sitemap, robots, OG, Schema.org, Rich Results)
Rebrand Athena             100%  code + Stripe Dashboard
Securite Stripe            100%  (webhook dedup, idempotency, headers CSP/HSTS)
Legal nLPD/RGPD            100%  (CGU, Privacy, CookieConsent, checkboxes checkout)
Rate limiting IA           100%  (3 endpoints, fail-open, headers RFC)
App auth i18n               48%  (15/~35 ecrans, 1050/~2200 cles estimees)
App auth LocaleSelector    100%  (Compte > Preferences, DB + cookie sync)
Stack tech                 100%  (Next 16, Tailwind 4, Supabase, Stripe live)
PWA                        100%
Tests E2E                    0%
Performance                 90%  (TBT 35ms, CLS 0, desktop 96/100, LCP mobile simule ~9s)
```

**Global readiness pour launch** : ~88%
