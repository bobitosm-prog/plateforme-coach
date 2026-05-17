# MoovX — ROADMAP

> **Derniere mise a jour** : 17 mai 2026, post-session SEO technique + Stripe rebrand
> **Version actuelle** : v2.5.0
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
- Note: aucun client RGPD a expurger (MRR 0 au 17 mai)

---

## ✅ FAIT

- Landing Power & Performance desktop (14 sections, direction Nike/Whoop/IWC)
- Architecture i18n complete (next-intl 4.12.0, FR/EN/DE, 16 sections traduites)
- Mobile responsive complet (auth + 14 sections landing)
- Language switcher Navbar (FR/EN/DE drapeaux)
- SEO technique complet (hreflang multilingue, sitemap, robots, OpenGraph, Schema.org Organization/LocalBusiness/WebSite)
- Detection langue automatique avec cookie persistant
- Rebrand Stripe Coach IA → Athena (dashboard manuel)
- Console admin complete (users, revenue, logs, feedback)
- Feedback admin + visibilite in-app (email branded)
- PWA (manifest, service worker, install prompt)
- Cleanup repo (14 fichiers .OLD.tsx supprimes)

---

## TODO IMMEDIAT — Avant premiers clients

### Architecture domaine
- [ ] Decider strategie `moovx.ch` vs `app.moovx.ch`

---

## SESSION SUIVANTE — EconomicModel & Polish (~1-2h)

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

---

## Decisions architecturales (14 mai 2026)

- `proxy.ts` (Next 16) > `middleware.ts` pour auth + i18n
- `localePrefix: 'always'` → URLs propres
- `app/layout.tsx` racine (fonts, PWA, providers globaux)
- `app/[locale]/layout.tsx` wrapper minimal NextIntlClientProvider
- EconomicModel skip (refonte Power a venir)
- Stripe Connect commission MoovX = 3%
- Mobile responsive identifie comme PRIORITE #1 post-session

### Decisions SEO (17 mai 2026)

- generateMetadata doit vivre dans la route la plus profonde (page.tsx > layout.tsx)
- Sitemap/robots dynamiques via app/sitemap.ts et app/robots.ts (pas de fichiers statiques dans public/)
- JSON-LD via @graph unique (recommandation Google) + SoftwareApplication separe (legacy)
- lib/seo.ts et lib/structured-data.ts = single source of truth pour donnees business

---

## Progression globale

```
Landing Marketing desktop  100%  (14/14 sections Power + i18n)
Landing Marketing mobile   100%  (responsive complet, valide iPhone)
Landing SEO                100%  (hreflang, sitemap, robots, OG, Schema.org, Rich Results)
Rebrand Athena             100%  code + Stripe Dashboard
App utilisateur i18n         0%  (151 fichiers)
Stack tech                 100%  (Next 16, Tailwind 4, Supabase, Stripe live)
RGPD / Legal                50%  (architecture OK, contenus a finaliser)
PWA                        100%
Tests E2E                    0%
Cleanup repo               100%
Performance                 60%
```

**Global readiness pour launch** : ~65%
