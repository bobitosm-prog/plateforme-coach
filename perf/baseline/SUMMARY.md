# Lighthouse Baseline — moovx.ch/fr/landing

**Date**: 18 mai 2026
**Tool**: PageSpeed Insights (Lighthouse 13.0.1)
**URLs**: https://pagespeed.web.dev

## Scores

| Category | Desktop | Mobile |
|----------|---------|--------|
| **Performance** | **80** | **53** |
| Accessibility | 91 | 91 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

## Core Web Vitals

| Metric | Desktop | Mobile (4G slow) | Target | Status |
|--------|---------|-------------------|--------|--------|
| **FCP** | 0.3s | 1.3s | < 1.8s | ✅ / ✅ |
| **LCP** | **2.1s** | **8.9s** | < 2.5s | ✅ / ❌ CRITICAL |
| **TBT** | **210ms** | **590ms** | < 200ms | ⚠️ / ❌ CRITICAL |
| **CLS** | 0 | 0 | < 0.1 | ✅ / ✅ |
| **Speed Index** | 1.9s | 7.6s | < 3.4s | ✅ / ❌ |

## LCP Element
From calculator URL parameters: LCP=2123ms (desktop), LCP=8851ms (mobile)
The LCP element is likely the hero image (`/images/new/hero-chalk.png`) based on the landing page structure.

## Top Opportunities (from Lighthouse)

### Desktop
1. **Améliorer l'affichage des images** — Savings: 918 KiB
2. Ajustement forcé de la mise en page (layout thrashing)
3. Ancien JavaScript — Savings: 14 KiB
4. Optimiser la taille du DOM
5. Réduisez les ressources JS inutilisées — Savings: 26 KiB

### Mobile
1. **Améliorer l'affichage des images** — Savings: 932 KiB
2. Réduisez le travail du thread principal — 3.6s
3. Réduisez le temps d'exécution JavaScript — 1.3s
4. Évitez les tâches longues — 6 tâches longues trouvées
5. Réduisez les ressources JS inutilisées — Savings: 26 KiB
6. Ancien JavaScript — Savings: 14 KiB
7. Optimiser la taille du DOM

## Analysis

### Root cause of poor mobile LCP (8.9s)
The #1 opportunity on BOTH desktop and mobile is **"Améliorer l'affichage des images"**
with **~930 KiB savings**. This is the hero image being served as PNG instead of AVIF/WebP
and/or without proper `sizes` attribute causing oversized downloads on mobile.

The LCP is the hero image. On slow 4G, downloading a 900+ KB PNG is what pushes LCP to 8.9s.

### Root cause of high TBT (590ms mobile)
- 6 long tasks found on mobile (vs 3 on desktop)
- JS execution time: 1.3s on mobile
- Main thread work: 3.6s on mobile
- This is GSAP + ScrollTrigger initialization on all 14 sections at once

### What GSAP refactor would fix
- TBT: reduce from 590ms → ~200-300ms (defer animation setup)
- But it does NOT fix LCP directly — images are the LCP bottleneck

### What image optimization would fix
- LCP mobile: 8.9s → ~2-3s (proper format + sizes)
- This is THE highest-impact fix by far

## Decision

**IMAGES FIRST, GSAP SECOND.**

1. **Priority 1**: Image optimization (AVIF/WebP + proper sizes + priority on hero)
   - Expected impact: LCP 8.9s → ~2-3s on mobile, 2.1s → <1.5s on desktop
   - ~930 KiB image savings

2. **Priority 2**: GSAP dynamic import (if TBT still >200ms after images)
   - Expected impact: TBT 590ms → ~200-300ms on mobile
   - Defer animation JS from initial load

3. **Skip**: Framer Motion LazyMotion (only ~14 KiB legacy JS savings, negligible)

## Bundle context (from earlier analysis)
- Total JS: 899 KB raw / **259 KB gzip** (acceptable)
- GSAP chunk: 220 KB raw / 60 KB gzip
- JS is NOT the primary issue — **images are**
