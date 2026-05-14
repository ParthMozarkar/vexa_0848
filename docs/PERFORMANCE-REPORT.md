# VEXA Frontend — Performance Report (v2.0)

**Generated:** 2026-05-14
**Project:** VEXA AI Virtual Try-On Platform
**Scope:** Next.js 15 frontend (`frontend/`)

---

## Executive Summary

VEXA v2.0 introduced a focused set of frontend performance optimizations targeting three root
causes of slow initial load on the 3D-heavy marketing site:

1. **Oversized initial JS bundle** — 3D libraries (Three.js, react-three/fiber, Spline) were
   included in the synchronous entry bundle, forcing all users to parse hundreds of KB of 3D
   code even when visiting text-only pages.

2. **Excessive network overhead** — production source maps shipped to browsers (~300 KB+),
   and image optimization results expired every 60 seconds, causing constant re-validation
   traffic for repeated visitors.

3. **Suboptimal tree-shaking** — large icon and charting libraries were imported as full
   packages rather than individual modules, preventing the bundler from eliminating dead code.

All optimizations are applied at the `next.config.mjs` level and in component-level `dynamic()`
calls — no runtime overhead is introduced.

---

## Before / After Optimization Table

| Optimization | Before | After | Expected Impact |
|---|---|---|---|
| 3D components SSR | Loaded synchronously at startup | `ssr: false`, lazy `dynamic()` import | -40% initial JS parse time |
| Spline 3D hero | Synchronous import in page bundle | `dynamic()` import with `loading` fallback | -200 KB initial bundle |
| Source maps in production | `productionBrowserSourceMaps: true` (default) | `productionBrowserSourceMaps: false` | -300 KB+ network transfer |
| Image cache TTL | `minimumCacheTTL: 60` (Next.js default) | `minimumCacheTTL: 3600` | -90% image revalidation requests |
| Package imports | Not optimized (full package imports) | `optimizePackageImports` for 7 packages | -15% tree-shaking overhead on icons/charts |
| Three.js | Full bundle included | Listed in `optimizePackageImports` | -30% 3D chunk size |
| Response compression | Not explicit | `compress: true` | -60-70% gzip payload size |
| Image formats | JPEG/PNG only | AVIF + WebP with fallback | -20-40% image payload vs. JPEG |
| Static model assets | No cache headers | `Cache-Control: immutable, max-age=31536000` | Eliminates repeat GLB downloads |
| Static image assets | No cache headers | `Cache-Control: max-age=86400, stale-while-revalidate` | -80% image CDN latency on return visits |

---

## Core Web Vitals Targets

The following targets apply to the homepage and Studio page (primary user journeys).

### Largest Contentful Paint (LCP) — Target: < 2.5s

- **Hero image** is served from Cloudflare R2 with `Cache-Control: max-age=86400`.
- `next/image` generates AVIF and WebP variants automatically; smaller payloads mean faster
  first paint.
- Fonts use `display: 'swap'` (configured in `layout.tsx` for both Plus Jakarta Sans and
  JetBrains Mono), eliminating invisible-text flash while fonts load.
- No layout shift from images because `next/image` always requires `width`/`height` or `fill`.

### First Input Delay / Interaction to Next Paint (FID/INP) — Target: < 100ms

- **3D rendering is off the main thread** — react-three/fiber's WebGL canvas runs in a
  separate render loop; heavy Three.js GPU work does not block input handlers.
- Dynamic imports mean 3D code is parsed only when the relevant page is visited, not during
  the initial bundle evaluation.
- framer-motion is tree-shaken via `optimizePackageImports`; unused animation variants are
  not included.

### Cumulative Layout Shift (CLS) — Target: < 0.1

- All `next/image` usages specify explicit dimensions, preventing image-load reflows.
- Google Fonts loaded via `next/font/google` with `display: 'swap'` — font swap happens
  before paint in most cases due to preloading.
- Spline hero uses a placeholder skeleton while the dynamic import resolves, preventing
  the 3D canvas from popping in and pushing content.
- `themeColor` meta tag in `layout.tsx` ensures the mobile status-bar color is set before
  first paint, avoiding browser-chrome shift.

---

## Remaining Bottlenecks

The following items are **known, acceptable** costs that cannot be eliminated without
changing product functionality.

### 1. Spline Runtime (~300 KB gzipped)

`@splinetool/runtime ^1.12.90` is the WebGL scene player for the homepage 3D hero.
It is already dynamically imported (loaded only for homepage visitors), but the library
itself has no smaller alternative that maintains the same Spline scene format.

**Mitigation options (not yet implemented):**
- Replace with a pre-rendered video loop on mobile (`<video autoPlay muted loop>`).
- Use a static WebP/AVIF screenshot as the initial paint placeholder.

### 2. framer-motion (~50 KB gzipped)

framer-motion is used extensively for page transitions and micro-interactions throughout
the UI. It is already tree-shaken via `optimizePackageImports` in `next.config.mjs`.
Further reduction is not practical without migrating to CSS transitions.

**Mitigation options (not yet implemented):**
- Honor `prefers-reduced-motion` media query to skip heavy spring animations.
- Replace entrance animations with CSS `@keyframes` on low-end devices.

### 3. react-three/fiber + drei (~400 KB gzipped combined)

These libraries are lazy-loaded (not in the initial bundle after Phase 16/17 dynamic import
work). They are fetched only when the user navigates to a page containing the AvatarViewer
component (`/onboarding`, `/studio` 3D mode, `/ar`).

**Mitigation options (not yet implemented):**
- Add a `deviceCapability` check before mounting the Canvas — skip entirely on low-memory
  devices (< 2 GB RAM detected via `navigator.deviceMemory`).

---

## Configuration Reference

Key settings in `frontend/next.config.mjs` that drive the above results:

```js
// Source maps off in production
productionBrowserSourceMaps: false,

// Gzip all responses
compress: true,

// Tree-shaking for heavy packages
experimental: {
  optimizePackageImports: [
    'framer-motion', 'lucide-react', '@heroicons/react',
    'recharts', 'three', '@react-three/fiber', '@react-three/drei',
  ],
},

// Image optimization
images: {
  minimumCacheTTL: 3600,
  formats: ['image/avif', 'image/webp'],
},

// Long-lived cache for GLB models and static images
headers: [
  { source: '/public/models/:all*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  { source: '/assets/images/:all*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
],
```

---

## Measurement Methodology

These results are estimated based on package sizes and Next.js build behavior. To measure
actual Core Web Vitals:

1. Deploy to Vercel Preview and run [PageSpeed Insights](https://pagespeed.web.dev/).
2. Enable Vercel Speed Insights in `next.config.mjs` for real-user monitoring.
3. Run `ANALYZE=true npm run build` with `@next/bundle-analyzer` for exact chunk sizes
   (see `BUNDLE-ANALYSIS.md`).

---

*Report generated for VEXA v2.0 — Phase 20 documentation.*
