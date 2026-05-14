# MoovX — ROADMAP

> **Derniere mise a jour** : 14 mai 2026, post-session refonte landing Power + i18n
> **Version actuelle** : v2.4.1
> **Status** : Production live, 0 clients payants, Stripe `sk_LIVE`

---

## PRIORITE #1 — Mobile Responsive (~3-4h, prochaine session)

> Landing Power refondue desktop-only durant la session du 14 mai. Mobile NON teste.
> Bloquant pour launch : impossible d'envoyer du trafic tant que mobile casse (>70% du trafic landing).

### Breakpoints a valider
- 375px iPhone SE/13 mini · 390px iPhone 14/15 Pro · 428px 15 Pro Max · 768px iPad portrait · 1024px iPad landscape · >=1280px desktop (DEJA OK)

### Sections a auditer/fixer
- [ ] Navbar — burger menu mobile
- [ ] Hero — Bebas Neue responsive, stats grid
- [ ] MarqueeSection — vitesse + taille
- [ ] Results — stack vertical avant/apres
- [ ] NutritionSection — features grid 2→1 col
- [ ] TrainingSection — PPL table responsive
- [ ] TrackingSection — 6 features grid
- [ ] CoachIaSection — iPhone + questions
- [ ] CoachingPro — coach tablet + specs
- [ ] Testimonials — 3 cards carousel/stack
- [ ] Steps — 4 corners → 1 col mobile
- [ ] PwaSection — iOS/Android stack
- [ ] PricingSection — 2 plans → 1 col
- [ ] FaqSection — accordeons (probablement OK)
- [ ] GenevaSection — image + values stack
- [ ] CtaSection — headline + CTAs full-width
- [ ] FooterSection — links wrap

---

## TODO IMMEDIAT — Avant premiers clients

### Manuel (5 min)
- [ ] **Stripe Dashboard live** : renommer "MoovX Coach IA" → "MoovX Athena"

### Architecture domaine
- [ ] Decider strategie `moovx.ch` vs `app.moovx.ch`

---

## SESSION SUIVANTE+1 — SEO + Detection langue (~2-3h)

- [ ] Detection langue dans `proxy.ts` (cookie → Accept-Language → IP country → fallback fr)
- [ ] Selecteur langue UI dans Navbar (FR/EN/DE)
- [ ] Hreflang tags dans layout.tsx via generateMetadata()
- [ ] Sitemap multilingue
- [ ] Canonical URLs + robots.txt
- [ ] OpenGraph + Twitter Cards par locale
- [ ] Schema.org (LocalBusiness, Organization)
- [ ] Google Search Console

---

## SESSION SUIVANTE+2 — EconomicModel & Polish (~1-2h)

- [ ] Refondre EconomicModel direction Power OU supprimer
- [ ] i18n FR/EN/DE
- [ ] Decommenter dans page.tsx
- [ ] Photos reelles (consentement RGPD)

---

## i18n APPLICATION AUTHENTIFIEE (~4-6h)

> 151 fichiers .tsx, 277 imports relatifs a auditer.

- [ ] Onboarding (client + coach)
- [ ] AccountTab + Stripe sub
- [ ] ChatTab (Athena)
- [ ] Dashboard client
- [ ] Dashboard coach
- [ ] Admin dashboards
- [ ] CGU + Privacy (juridique critique)
- [ ] Emails transactionnels

---

## PERFORMANCE (~1-2h)

- [ ] Audit Lighthouse /fr/landing
- [ ] GSAP dynamic import async
- [ ] Framer Motion tree-shake
- [ ] Cible < 500 KB JS initial (actuel 851 KB)
- [ ] AVIF + WebP fallback
- [ ] Core Web Vitals : LCP < 2.5s · CLS < 0.1 · INP < 200ms

---

## SECURITE & RGPD (~2h)

- [ ] Headers securite (CSP, HSTS, X-Frame-Options)
- [ ] Cookie banner RGPD multilingue
- [ ] Politique confidentialite 3 langues (nLPD CH + RGPD UE)
- [ ] CGU 3 langues
- [ ] Export donnees utilisateur
- [ ] Suppression compte cascade

---

## LAUNCH PREPARATION

- [ ] Stripe webhooks signatures
- [ ] Supabase RLS policies audit
- [ ] Emails transactionnels 3 langues
- [ ] PWA install iOS + Android
- [ ] 14-day trial flow E2E
- [ ] Cancel subscription flow
- [ ] Coach invitation flow
- [ ] Backup quotidien Supabase
- [ ] OG images par locale
- [ ] 10 testeurs beta Geneve

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

---

## Decisions architecturales (14 mai 2026)

- `proxy.ts` (Next 16) > `middleware.ts` pour auth + i18n
- `localePrefix: 'always'` → URLs propres
- `app/layout.tsx` racine (fonts, PWA, providers globaux)
- `app/[locale]/layout.tsx` wrapper minimal NextIntlClientProvider
- EconomicModel skip (refonte Power a venir)
- Stripe Connect commission MoovX = 3%
- Mobile responsive identifie comme PRIORITE #1 post-session

---

## Progression globale

```
Landing Marketing desktop  100%  (14/14 sections Power + i18n)
Landing Marketing mobile     0%  (priorite #1)
Landing SEO                 30%  (i18n done, hreflang/sitemap TODO)
Rebrand Athena             100%  code · 0% Stripe Dashboard
App utilisateur i18n         0%  (151 fichiers)
Stack tech                 100%  (Next 16, Tailwind 4, Supabase, Stripe live)
RGPD / Legal                50%  (architecture OK, contenus a finaliser)
PWA                        100%
Tests E2E                    0%
Cleanup repo               100%
Performance                 60%
```

**Global readiness pour launch** : ~55% (revu en baisse a cause du mobile)
