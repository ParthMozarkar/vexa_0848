# VEXA Frontend Performance — Requirements

**Milestone:** v3.0 Frontend Performance
**Status:** Complete (all phases executed)

---

## v3.0 Requirements

### Feature-Based Structure (Phase 15)

- [x] **FEAT-01**: `frontend/src/features/tryon/index.ts` barrel re-exports useTryOn, TryOnResult, TryOnCategory, TryOnOverlay, VideoTryOn
- [x] **FEAT-02**: `frontend/src/features/avatar/index.ts` barrel re-exports AvatarViewer, AvatarCarousel, FaceCapture, avatar types
- [x] **FEAT-03**: `frontend/src/features/auth/index.ts` barrel re-exports supabase, useUser, UserWithMeasurements
- [x] **FEAT-04**: `frontend/src/features/studio/index.ts` barrel re-exports ImageUploadBox, SizeCompass, ModelGenerator
- [x] **FEAT-05**: `frontend/src/features/dashboard/index.ts` barrel re-exports useStore
- [x] **FEAT-06**: `frontend/src/features/index.ts` top-level barrel re-exports all 5 features
- [x] **FEAT-07**: Zero file moves — all existing imports unchanged

### Mobile Performance (Phase 16)

- [x] **MOB-01**: `frontend/src/lib/dynamicImports.ts` — SSR-disabled dynamic wrappers for AvatarViewer, ARTryOn, VideoTryOn, Spline
- [x] **MOB-02**: `frontend/src/hooks/useDeviceCapability.ts` — isMobile, isLowEndDevice, prefersReducedMotion, connectionType, supportsWebGL
- [x] **MOB-03**: `frontend/src/components/ui/LazyImage.tsx` — progressive image loading with skeleton placeholder
- [x] **MOB-04**: `frontend/next.config.mjs` updated — compress, poweredByHeader: false, swcMinify, three/r3f/drei in optimizePackageImports
- [x] **MOB-05**: `frontend/src/app/layout.tsx` — themeColor metadata added for mobile status bar

### 3D Optimization (Phase 17)

- [x] **THREED-01**: `frontend/src/lib/glbOptimization.ts` — DRACO_DECODER_PATH, texture quality tiers, getTextureQuality()
- [x] **THREED-02**: `frontend/src/lib/dracoConfig.ts` — configureDracoDecoder() browser-safe DRACOLoader wiring
- [x] **THREED-03**: `frontend/src/hooks/useProgressiveGlb.ts` — XHR-based GLB preload with progress events
- [x] **THREED-04**: `frontend/src/components/ui/GlbLoadingIndicator.tsx` — progress bar UI for 3D content
- [x] **THREED-05**: AvatarViewer Canvas — frameloop="demand" + performance={{ min: 0.5 }} for mobile GPU

### Frontend API Layer (Phase 18)

- [x] **API-01**: `frontend/src/lib/apiClient.ts` — typed request(), ApiError class, response normalization
- [x] **API-02**: Typed methods: tryOn, uploadPhoto, generateAvatar, getJobStatus, pollJobUntilComplete, validateApiKey, generateDesign, healthCheck
- [x] **API-03**: `api` barrel object exporting all methods
- [x] **API-04**: `frontend/src/hooks/useApiCall.ts` — loading/error/data state hook for any API call
- [x] **API-05**: Zero collision with existing types (DesignResponse → StudioDesignApiResponse)

### State Management (Phase 19)

- [x] **STATE-01**: `frontend/src/store/useStore.ts` — loadingStates + errors slices added (all existing state untouched)
- [x] **STATE-02**: `setLoading`, `isLoading`, `setError`, `clearError`, `clearAllErrors` methods
- [x] **STATE-03**: `frontend/src/store/selectors.ts` — useTryOnState, useTryOnActions, useAuthState, useAuthActions, useFavorites, useFavoriteActions, useLoadingState, useErrorState, useLoadingActions, LOADING_KEYS
- [x] **STATE-04**: `frontend/src/store/index.ts` — barrel export of useStore + all selectors

### Performance Reports (Phase 20)

- [x] **REPORT-01**: `docs/PERFORMANCE-REPORT.md` — before/after table, CWV targets, bottleneck analysis
- [x] **REPORT-02**: `docs/MOBILE-READINESS.md` — capability matrix, checklist, TODOs
- [x] **REPORT-03**: `docs/BUNDLE-ANALYSIS.md` — estimated bundle composition, lazy-loaded chunks, analyzer instructions
- [x] **REPORT-04**: `docs/FRONTEND-ARCH.md` — full directory tree, data flows, state management map, layer rules

---

## Out of Scope

- Visual/product redesign — zero UI changes
- React Native / native mobile apps
- SSR for 3D components — all 3D stays client-only
- Replacing framer-motion — tree-shaken via optimizePackageImports

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FEAT-01 | Phase 15: Feature-Based Structure | Complete |
| FEAT-02 | Phase 15: Feature-Based Structure | Complete |
| FEAT-03 | Phase 15: Feature-Based Structure | Complete |
| FEAT-04 | Phase 15: Feature-Based Structure | Complete |
| FEAT-05 | Phase 15: Feature-Based Structure | Complete |
| FEAT-06 | Phase 15: Feature-Based Structure | Complete |
| FEAT-07 | Phase 15: Feature-Based Structure | Complete |
| MOB-01 | Phase 16: Mobile Performance | Complete |
| MOB-02 | Phase 16: Mobile Performance | Complete |
| MOB-03 | Phase 16: Mobile Performance | Complete |
| MOB-04 | Phase 16: Mobile Performance | Complete |
| MOB-05 | Phase 16: Mobile Performance | Complete |
| THREED-01 | Phase 17: 3D Optimization | Complete |
| THREED-02 | Phase 17: 3D Optimization | Complete |
| THREED-03 | Phase 17: 3D Optimization | Complete |
| THREED-04 | Phase 17: 3D Optimization | Complete |
| THREED-05 | Phase 17: 3D Optimization | Complete |
| API-01 | Phase 18: Frontend API Layer | Complete |
| API-02 | Phase 18: Frontend API Layer | Complete |
| API-03 | Phase 18: Frontend API Layer | Complete |
| API-04 | Phase 18: Frontend API Layer | Complete |
| API-05 | Phase 18: Frontend API Layer | Complete |
| STATE-01 | Phase 19: State Management Cleanup | Complete |
| STATE-02 | Phase 19: State Management Cleanup | Complete |
| STATE-03 | Phase 19: State Management Cleanup | Complete |
| STATE-04 | Phase 19: State Management Cleanup | Complete |
| REPORT-01 | Phase 20: Performance Reports | Complete |
| REPORT-02 | Phase 20: Performance Reports | Complete |
| REPORT-03 | Phase 20: Performance Reports | Complete |
| REPORT-04 | Phase 20: Performance Reports | Complete |
