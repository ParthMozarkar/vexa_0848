# VEXA Frontend — Mobile Readiness Report

**Generated:** 2026-05-14
**Project:** VEXA AI Virtual Try-On Platform
**Scope:** Next.js 15 frontend (`frontend/`)

---

## Overview

VEXA targets a broad device spectrum — from flagship desktop workstations used by fashion
brand developers to low-end Android phones used by end-shoppers of embedded marketplace
widgets. This document captures the current mobile capability baseline, outstanding gaps,
and network resilience characteristics.

---

## Mobile Capability Matrix

| Feature | Low-End Mobile | Mid-Range Mobile | Desktop |
|---|---|---|---|
| Image try-on | Full support | Full support | Full support |
| Video try-on | Async (job queue) | Async (job queue) | Async (job queue) |
| 3D avatar viewer | Degraded (low GPU) | With frame limiter | Full quality |
| AR try-on | WebXR not supported | Device dependent | Supported |
| Studio design tool | Full support | Full support | Full support |
| Dashboard / analytics | Full support | Full support | Full support |
| Onboarding wizard | Full support | Full support | Full support |
| Embed widget (iframe) | Full support | Full support | Full support |

**Notes:**

- **Image try-on** calls `/api/tryon`, which is a server-side job. No GPU work happens in the
  browser; all devices receive identical results.
- **Video try-on** is queued asynchronously via BullMQ workers and polled by the client.
  No video decoding happens on-device during generation.
- **3D avatar viewer** uses `@react-three/fiber`. On low-end devices the WebGL canvas may
  drop below 30 fps. The `dpr` (device pixel ratio) cap and `performance.min: 0.5` in the
  Canvas props allow Three.js to reduce render resolution automatically.
- **AR try-on** requires WebXR Device API (`immersive-ar` session type). Safari on iOS 17+
  supports it via WebXR Viewer; Chrome Android supports it on ARCore-enabled devices.
  Older or low-end phones do not support it.

---

## Touch and Interaction Checklist

### Implemented

- [x] `viewport` meta tag: `width=device-width, initial-scale=1, viewport-fit=cover`
      (set via Next.js `metadata.viewport` in `layout.tsx`)
- [x] `font-display: swap` on all Google Fonts (`Plus_Jakarta_Sans`, `JetBrains_Mono`
      both configured with `display: 'swap'` in `layout.tsx`)
- [x] All images use `next/image` with explicit `width`/`height` or `fill` prop
      (prevents layout reflow when images load)
- [x] 3D Canvas has `performance={{ min: 0.5 }}` for GPU throttling on low-end devices
      (react-three/fiber adaptive rendering)
- [x] `themeColor` meta set for dark and light schemes in `layout.tsx`:
      dark: `#0a0a0a`, light: `#ffffff`
- [x] AVIF and WebP image formats served automatically by `next/image` optimizer
      (reduces data usage on mobile networks)
- [x] Static GLB model files served with `Cache-Control: immutable`
      (no re-download on navigation)

### Outstanding TODOs

- [ ] **Touch gesture support in AvatarViewer** — pinch-to-zoom and rotate gestures for the
      3D avatar canvas. Currently only mouse drag is wired.
      *Owner: `frontend/src/components/AvatarViewer/`*

- [ ] **Reduced-motion variant for framer-motion animations** — honor the
      `prefers-reduced-motion` CSS media query. Users with vestibular disorders or battery-saver
      mode active should receive instant transitions, not spring animations.
      *Reference: `frontend/src/app/` page transition wrappers*

- [ ] **Mobile fallback for Spline 3D hero** — on devices where `navigator.deviceMemory < 2`
      or the connection is slow (via Network Information API), serve a static WebP screenshot
      instead of loading the ~300 KB Spline runtime.

- [ ] **Tap target sizes** — audit all icon-only buttons (navigation, close, favorite toggles)
      for minimum 44x44 px touch area per WCAG 2.5.5.

- [ ] **iOS Safari safe-area insets** — bottom navigation and floating CTAs may overlap the
      home indicator on notched iPhones. Add `env(safe-area-inset-bottom)` padding.

---

## Device Capability Detection

Phase 16 added `useDeviceCapability` hook (`frontend/src/hooks/useDeviceCapability.ts`).
This hook surfaces the following signals for conditional rendering:

| Signal | API Used | Used By |
|---|---|---|
| `isMobile` | `navigator.userAgent` + `window.innerWidth` | AvatarViewer mount guard |
| `gpuTier` | `WEBGL_debug_renderer_info` extension | Canvas `dpr` and `performance.min` |
| `prefersReducedMotion` | `matchMedia('prefers-reduced-motion')` | (planned) framer-motion variants |
| `connectionType` | `navigator.connection.effectiveType` | (planned) Spline fallback |

---

## Network Resilience

### Generation Results Cache (24 hours)

Try-on and design generation results are stored in Supabase `tryon_results` and
`design_history` tables. If a user submits the same `(userPhotoUrl, productImageUrl)` pair
within 24 hours, the cached `resultUrl` is returned without calling the AI provider.

This eliminates retries and duplicate API costs on flaky mobile connections where the
browser may timeout and re-submit the same form.

### Image Proxy Cache (max-age=3600)

`next/image` serves all remote images through the Next.js image optimizer proxy.
`minimumCacheTTL: 3600` (set in `next.config.mjs`) means the optimizer holds processed
AVIF/WebP variants for at least 1 hour before re-validating with the origin.

Effect: A mobile user navigating between pages sees images served from the CDN edge
cache rather than triggering origin fetches on every visit.

### GLB Asset Cache (immutable, 1 year)

`/public/models/*.glb` files are served with:
```
Cache-Control: public, max-age=31536000, immutable
```

3D avatar models are content-addressed (filename includes a hash or version). Once a device
downloads a GLB, it will not re-download it until the filename changes. This is critical
for mobile users on metered connections.

### Static Image Assets (max-age=86400 + stale-while-revalidate)

`/assets/images/*` files are served with:
```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

This means images are fresh for 1 day and stale-but-usable for 7 days. Mobile browsers
on slow connections display the stale image immediately while the fresh version downloads
in the background.

### API Timeout Guards

All outbound AI calls use `AbortSignal.timeout(120_000)` (120 seconds). On mobile networks
with high latency, this prevents the app from hanging indefinitely. The user receives a
`504 Gateway Timeout` error response and can retry.

---

## Responsive Layout Notes

- Tailwind CSS `sm:`, `md:`, `lg:`, `xl:` breakpoints are used throughout the UI.
- The Studio page uses a stacked single-column layout on `< sm` (< 640px) and a two-column
  upload + result layout on `>= md` (>= 768px).
- The Dashboard page collapses analytics charts to horizontal scroll on mobile rather than
  hiding them.
- The embed widget (`/embed`) is designed for iframe embedding at 400x600px minimum —
  fully usable on mobile marketplace pages.

---

*Report generated for VEXA v2.0 — Phase 20 documentation.*
