# VEXA Frontend — Bundle Analysis

**Generated:** 2026-05-14
**Project:** VEXA AI Virtual Try-On Platform
**Stack:** Next.js 15.1.11 / React 19.0.3 / TypeScript 5.x

---

## Overview

This document describes the estimated JavaScript bundle composition for the VEXA frontend.
It distinguishes between the **initial bundle** (loaded on every page visit) and
**lazy-loaded chunks** (loaded on demand when specific pages or features are accessed).

All estimates are gzipped sizes based on published package sizes and Next.js build behavior.
Run `ANALYZE=true npm run build` (see below) for exact measurements from your specific build.

---

## Estimated Bundle Composition

### Initial Bundle (loaded on every page)

```
Initial bundle (approx):
├── Next.js framework           ~80KB gzipped
│   └── App Router runtime, RSC client, router, hydration
├── React 19                    ~45KB gzipped
│   └── react + react-dom (shared across all pages)
├── framer-motion               ~50KB gzipped
│   └── tree-shaken via optimizePackageImports (only used variants)
├── Supabase client             ~30KB gzipped
│   └── @supabase/supabase-js auth + realtime client
├── Zustand                     ~3KB gzipped
│   └── useStore.ts AppState store
├── lucide-react                ~5KB gzipped
│   └── tree-shaken via optimizePackageImports (icon-by-icon)
├── clsx + tailwind-merge       ~2KB gzipped
│   └── className utilities
├── App code (pages + components) ~60KB gzipped
│   └── layout, GlobalLayout, marketing pages, shared components
└── Total initial               ~275KB gzipped   (target: < 300KB)
```

**Status: WITHIN TARGET.** The 300 KB initial bundle target accounts for the React 19 +
framer-motion cost. The key win is that Three.js, Spline, recharts, and react-three are
**not** in this number — they are lazy-loaded.

### Lazy-Loaded Chunks (loaded on demand)

```
Lazy-loaded chunks:
├── three + @react-three/fiber  ~280KB gzipped
│   └── Loaded only on 3D pages: /onboarding, /studio (3D mode), /ar
│   └── optimizePackageImports applied — unused Three.js modules excluded
├── @react-three/drei           ~120KB gzipped
│   └── Loaded with react-three/fiber (same pages)
├── @splinetool/react-spline    ~300KB gzipped
│   └── Loaded only on homepage hero (dynamic import, ssr: false)
├── recharts                    ~60KB gzipped
│   └── Loaded only on /dashboard
│   └── optimizePackageImports applied
├── @react-three/xr             ~80KB gzipped
│   └── Loaded only on /ar page
├── googleapis                  ~35KB gzipped (server-side only)
│   └── Used in /api/bookings — never sent to browser
├── openai (server-side only)   ~25KB gzipped
│   └── Used in /api/studio/design — never sent to browser
└── @aws-sdk/client-s3 (server) ~40KB gzipped
    └── Used in /api/tryon, /api/upload — never sent to browser
```

**Note:** `googleapis`, `openai`, and `@aws-sdk/client-s3` are API-route-only imports.
Next.js tree-shakes them from browser bundles automatically because they are used only in
`route.ts` files that run on the Node.js runtime. They add zero bytes to any page chunk.

---

## How to Generate Real Bundle Analysis

### Step 1: Install the Analyzer

```bash
cd /Users/ojasshelke/Desktop/VEXA\ BOLT/vexa_0848/frontend
npm install --save-dev @next/bundle-analyzer
```

### Step 2: Update next.config.mjs

Add this wrapper at the top of `frontend/next.config.mjs`:

```js
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// ... (existing nextConfig object)

export default withBundleAnalyzer(nextConfig);
```

### Step 3: Run the Analysis Build

```bash
cd /Users/ojasshelke/Desktop/VEXA\ BOLT/vexa_0848/frontend
ANALYZE=true npm run build
```

This opens two browser windows:
- **Client bundle treemap** — shows page and chunk breakdown for browser JS
- **Server bundle treemap** — shows API route and server component breakdown

### Step 4: Interpret the Output

Key things to look for:

1. **Is `three` in the initial chunk?** If yes, the dynamic import for AvatarViewer is not
   working — investigate `ssr: false` on the component import.
2. **Is `@splinetool/runtime` in the homepage chunk?** It should be in a separate async chunk.
3. **Is `recharts` outside the dashboard chunk?** If yes, consider adding explicit `dynamic()`
   import in the dashboard page.
4. **Are any server-only packages (googleapis, openai) in client chunks?** This indicates
   accidental client-side imports.

---

## Optimization Recommendations

### Priority 1 — Replace Spline with Static Video on Mobile

**Impact:** -300 KB lazy chunk for mobile visitors
**Why:** The Spline runtime is the largest single lazy chunk. Mobile users with slow connections
experience a blank hero section while it loads.
**How:** Use `useDeviceCapability()` hook to detect mobile, render `<video autoPlay muted loop>`
with a pre-exported MP4/WebM of the Spline scene instead.

```tsx
// frontend/src/app/components/SplineHero.tsx
const SplineScene = dynamic(() => import('@splinetool/react-spline'), { ssr: false });

export function SplineHero() {
  const { isMobile } = useDeviceCapability();
  if (isMobile) {
    return <video autoPlay muted loop playsInline src="/assets/hero.mp4" />;
  }
  return <SplineScene url="..." />;
}
```

### Priority 2 — Dynamic Import for recharts

**Impact:** -60 KB for all non-dashboard pages
**Why:** recharts is currently included in the dashboard page bundle but could be deferred
until the user actually views a chart panel.
**How:**

```tsx
// frontend/src/app/dashboard/page.tsx
const LineChart = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })));
const BarChart  = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })));
```

### Priority 3 — Replace framer-motion with CSS Transitions on Low-End Devices

**Impact:** -50 KB initial bundle for low-end mobile
**Why:** framer-motion's spring physics are not perceivable on devices with < 30 fps canvas
and slow JS engines. CSS `transition` achieves equivalent visual results at zero JS cost.
**How:** Add a `MotionProvider` context that returns CSS-only wrappers when
`navigator.deviceMemory < 1` or `prefers-reduced-motion` is active.

### Priority 4 — Audit @heroicons/react Usage

**Impact:** Minor (-2 to -5 KB)
**Why:** `@heroicons/react` is in `optimizePackageImports` but if the codebase has migrated
to `lucide-react` for most icons, `@heroicons/react` may be an unused dependency.
**How:** Run `grep -r "@heroicons" frontend/src --include="*.tsx"` to count actual usages.
If fewer than 3 icons are used, inline the SVGs directly and remove the dependency.

---

## Dependency Weight Reference

Quick reference for the heaviest dependencies in `package.json`:

| Package | Version | Gzipped Size | Load Type | Notes |
|---|---|---|---|---|
| `@splinetool/runtime` | ^1.12.90 | ~300 KB | Lazy (homepage) | Unavoidable for Spline scenes |
| `three` | ^0.183.2 | ~250 KB | Lazy (3D pages) | Optimized via `optimizePackageImports` |
| `@react-three/fiber` | ^9.5.0 | ~30 KB | Lazy (3D pages) | Depends on `three` |
| `@react-three/drei` | ^10.7.7 | ~120 KB | Lazy (3D pages) | Large utility library |
| `@react-three/xr` | ^6.6.29 | ~80 KB | Lazy (/ar only) | WebXR bindings |
| `framer-motion` | ^12.38.0 | ~50 KB | Initial | Tree-shaken |
| `recharts` | ^2.15.2 | ~60 KB | Lazy (dashboard) | Tree-shaken |
| `@supabase/supabase-js` | ^2.101.1 | ~30 KB | Initial | Auth + DB client |
| `lucide-react` | ^1.7.0 | ~5 KB | Initial | Tree-shaken (per icon) |
| `@heroicons/react` | ^2.2.0 | ~5 KB | Initial | Tree-shaken |
| `googleapis` | ^144.0.0 | ~35 KB | Server only | Never in browser bundle |
| `openai` | ^6.37.0 | ~25 KB | Server only | Never in browser bundle |
| `@aws-sdk/client-s3` | ^3.1028.0 | ~40 KB | Server only | Never in browser bundle |

---

*Report generated for VEXA v2.0 — Phase 20 documentation.*
