# Performance Baseline — /fr/landing

**Date**: 2026-05-18
**Total JS loaded**: 899 KB (921,226 bytes)
**Target**: ≤ 500 KB

## Top 5 chunks on /fr/landing

| # | Chunk | Size | Contents |
|---|-------|------|----------|
| 1 | dd9bdb64 | 220 KB | React runtime / framework core (react=57 hits) |
| 2 | ed69aa3f | 220 KB | **GSAP + landing components** (gsap=56, ScrollTrigger=19, react=522) |
| 3 | a6dad97d | 112 KB | Polyfills / runtime helpers (globalThis pattern) |
| 4 | 72e92e7b | 112 KB | Module system / chunk loading infrastructure |
| 5 | 83cda41c | 60 KB | React/app components (react=85) |

## Other chunks
- 6109e9d3: 41 KB
- 651ec034: 41 KB
- ee5f721d: 30 KB
- a23b0a48: 28 KB
- 99fb704c: 23 KB
- turbopack: 10 KB
- 3 small chunks: ~17 KB total

## Analysis

### Biggest wins possible:
1. **GSAP chunk (ed69aa3f, 220 KB)**: Contains all GSAP + ScrollTrigger + landing client components. Dynamic importing GSAP-heavy components could save ~100-150 KB from initial load.
2. **Polyfills chunk (a6dad97d, 112 KB)**: Large polyfill bundle. May be reducible via browserslist targeting.
3. **React runtime (dd9bdb64, 220 KB)**: Framework overhead, not reducible.
4. **Module infra (72e92e7b, 112 KB)**: Turbopack runtime, not reducible.

### Key insight:
The GSAP chunk (#2) is the only actionable target for significant reduction.
Framer-motion appears to be tree-shaken already or bundled inline — no standalone chunk detected.
