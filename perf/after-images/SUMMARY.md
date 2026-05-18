# Lighthouse Post-Perf — moovx.ch/fr/landing (VALID)

**Date**: 18 mai 2026
**Commit in prod**: 3460360 (confirmed via `x-vercel-cache: PRERENDER`)
**Includes**: AVIF config (18e1062) + Hero CSS animation (1b02f79) + build fix (3460360)
**Tool**: PageSpeed Insights (Lighthouse 13.0.1)
**Device**: Mobile 4G slow (Moto G Power emulation, simulated throttling)

## 3 Runs Mobile 4G Slow

| Metric | Run 1 | Run 2 | Run 3 | **Median** |
|--------|-------|-------|-------|-----------|
| **Score** | 68 | 66 | 69 | **68** |
| **FCP** | 1.05s | 1.51s | 1.05s | **1.05s** |
| **LCP** | 11.3s | 8.6s | 11.0s | **11.0s** |
| **TBT** | 130ms | 147ms | 75ms | **130ms** |
| **CLS** | 0 | 0 | 0 | **0** |
| **SI** | 6.6s | 7.2s | 6.0s | **6.6s** |

Calculator URLs:
- Run 1: FCP=1051 LCP=11268 TBT=130 CLS=0 SI=6617
- Run 2: FCP=1514 LCP=8626 TBT=147 CLS=0 SI=7249
- Run 3: FCP=1052 LCP=11016 TBT=75 CLS=0 SI=5991

## Comparison: Baseline vs After (Median)

| Metric | Baseline (pre-perf) | After (median) | Delta | Target | Status |
|--------|---------------------|----------------|-------|--------|--------|
| **Score** | 53 | **68** | **+15** | >80 | ⚠️ improved |
| **FCP** | 1.3s | **1.05s** | **-0.25s** | <1.8s | ✅ |
| **LCP** | 8.9s | **11.0s** | +2.1s | <2.5s | ❌ |
| **TBT** | 590ms | **130ms** | **-460ms** | <200ms | ✅ TARGET MET |
| **CLS** | 0 | **0** | 0 | <0.1 | ✅ |
| **SI** | 7.6s | **6.6s** | **-1.0s** | <3.4s | ❌ |

## What changed and why

### TBT: 590ms → 130ms ✅ (target was <200ms)
The hero CSS animation (`@keyframes heroFadeIn`) removed GSAP from the
critical rendering path. Previously GSAP had to load + parse + execute
before the hero became visible. Now only 3 long tasks detected (vs 6 before).
Main thread work: 2.5s (vs 3.6s before).

### FCP: 1.3s → 1.05s ✅
Marginal improvement from AVIF/WebP config — browser renders first paint
faster with smaller images in the pipeline.

### Score: 53 → 68 (+15 points)
Driven primarily by TBT improvement (+29 points weight in score calculator)
and SI improvement (+4 points).

### LCP: 8.9s → 11.0s ❌ (got worse)
The LCP element CHANGED:
- **Before**: LCP = text element (hero title) — because hero image was opacity:0
- **After**: LCP = hero image — now visible via CSS animation, Lighthouse correctly
  identifies it as the largest contentful paint element

The image itself is tiny (24 KB WebP at 750w mobile). The 11s LCP is caused by
the **request chain**: HTML → JS → React hydrate → next/image renders `<img>` →
browser requests image → download → decode → paint.

On simulated 4G slow (1.6 Mbps, 150ms RTT), the JS chain alone takes ~8-9s.
The image adds ~2s on top. This is an architectural limitation of client-rendered
images on slow networks, not a weight problem.

### Image compression: working
- hero-chalk.png: 1.84 MB PNG → 24 KB WebP @ 750w (**-99%**)
- Format: WebP (Vercel Hobby doesn't serve AVIF despite config)
- Lighthouse still shows "Améliorer l'affichage des images: 944 KiB" — this refers
  to other below-fold images that could use better `sizes` attributes

## LCP Element consistency across runs

All 3 runs show LCP at ~8.6-11.3s range. The variance is typical for simulated
4G slow throttling. The LCP element is consistently the hero image after the
CSS animation fix made it visible.

## Notes architecturales

### AVIF not served on Vercel Hobby
Config `images.formats: ['image/avif', 'image/webp']` is in place.
Vercel Hobby serves WebP only. AVIF will activate on Vercel Pro upgrade.
WebP compression is already excellent (-99% on hero image).

### LCP structural limitation
The hero image is inside a `'use client'` component. next/image with `priority`
adds a `<link rel="preload">` but it may not be hoisted to `<head>` when the
Image is inside a client component tree. The image request starts only after
React hydration completes on the client.

To fix LCP below 2.5s on simulated 4G slow would require:
1. Server Component hero with `<img>` tag in initial HTML (no React dependency)
2. Or `<link rel="preload">` hardcoded in layout.tsx `<head>`
3. Or accepting that simulated 4G slow (1.6 Mbps) is an extreme scenario

### Real-world impact
On real 4G networks (10-50 Mbps), the JS chain takes ~1-2s instead of 8-9s.
Real users will see LCP in ~2-4s. CrUX data ("Découvrez l'expérience de vos
utilisateurs") shows "Aucune donnée" — no real users measured yet.

## Verdict

| Target | Status | Notes |
|--------|--------|-------|
| TBT < 200ms | ✅ **130ms** | Hero CSS animation removed GSAP from critical path |
| CLS < 0.1 | ✅ **0** | Stable |
| FCP < 1.8s | ✅ **1.05s** | Good |
| LCP < 2.5s | ❌ **11.0s** | Structural: client-rendered image on simulated 4G slow |
| Score > 80 | ⚠️ **68** | +15 from baseline, limited by LCP |

**Sprint Performance status**: TBT/CLS/FCP targets met. LCP requires architectural
changes (Server Component hero) that are higher risk and out of scope for this sprint.
Document as tech debt in ROADMAP.
