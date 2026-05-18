# LCP Element Analysis

## Hero image setup
- **File**: `/images/new/hero-chalk.png`
- **Source dimensions**: 1672 x 941 px
- **File size**: 1.84 MB (PNG, 8-bit sRGB, non-interlaced)
- **Component**: `app/[locale]/landing/components/Hero.tsx:107-116`
- **Next.js Image props**: `fill`, `priority`, `fetchPriority="high"`, `quality={85}`, `sizes="100vw"`

## Critical finding: opacity: 0
The hero image container has `opacity: 0` (line 105) and relies on GSAP animation to fade in.
This means Lighthouse may identify the LCP as either:
1. The hero text (h1 "Transforme ton corps") — if it renders before GSAP fires
2. OR a below-the-fold image that becomes visible during Lighthouse's observation window

The GSAP animation of opacity 0→1 means the hero image is **invisible at initial render**.
This is both an LCP problem (Lighthouse doesn't see it) AND a UX problem (user sees blank).

## All landing images audit

| Image | Dimensions | Raw size | Component | sizes | quality | priority | Issue |
|-------|-----------|----------|-----------|-------|---------|----------|-------|
| hero-chalk.png | 1672×941 | **1.84 MB** | Hero | 100vw | 85 | ✅ | opacity:0 container, AVIF not enabled |
| nutrition-bowl.png | 1402×1122 | **2.47 MB** | Nutrition | 50vw mobile | 85 | - | AVIF not enabled |
| geneva-sunset.png | 1536×1024 | **2.44 MB** | Geneva | 100vw | 90 | - | sizes too wide, AVIF not |
| transformation.png | 1448×1086 | **2.06 MB** | Results | 100vw capped | 88 | - | AVIF not enabled |
| medal-gold.png | 1122×1402 | **1.89 MB** | Testimonials | 60vw/360px | 85 | - | OK sizes, AVIF not |
| dashboard-3d.png | 1402×1122 | **1.88 MB** | Tracking | 50vw mobile | 85 | - | AVIF not enabled |
| victory.png | 1122×1402 | **1.81 MB** | CTA | 100vw | 90 | - | sizes too wide, AVIF not |
| coach-tablet.png | 1122×1402 | **1.72 MB** | CoachingPro | 50vw mobile | 85 | - | AVIF not enabled |
| runner-mountains.png | 1536×1024 | **1.72 MB** | Training | 50vw mobile | 85 | - | AVIF not enabled |
| app-athena-ai.png | 1402×1122 | **1.49 MB** | CoachIA | 50vw mobile | 85 | - | AVIF not enabled |
| ai-neurons.png | ??? | **2.50 MB** | CoachIA bg | 100vw | 75 | - | decorative bg, huge |
| logo-moovx.png | ??? | **895 KB** | Footer | raw `<img>` | - | - | Not using next/image |

**Total raw image weight**: ~22 MB across 12 images (all PNG)

## Root cause
1. **No AVIF/WebP format configured** in next.config.ts → Next.js serves original PNG via its optimizer but without AVIF negotiation
2. All images are 1000-1700px wide PNGs at 1.5-2.5 MB each
3. AVIF at quality 75 typically achieves 5-10x compression vs PNG → ~200-400 KB per image
4. `sizes="100vw"` on below-fold images (geneva, victory, ai-neurons) causes mobile to download desktop-sized images

## Fix plan
1. **Enable AVIF** in next.config.ts: `images: { formats: ['image/avif', 'image/webp'] }`
2. **Add quality allowlist**: `images: { qualities: [75, 85, 88, 90] }` (stops the dev warnings)
3. **Fix sizes** on 100vw images that aren't actually 100vw
4. **Hero opacity**: consider setting initial opacity to a low value or using CSS animation instead of GSAP for the initial fade-in
