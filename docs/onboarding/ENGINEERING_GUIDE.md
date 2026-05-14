# VEXA Engineering Guide

This guide explains the core architectural paradigms used in the VEXA codebase.

## The Orchestration Paradigm
We do not call AI APIs directly from UI components or API routes. 
Instead:
`Component` -> `API Route` -> `OrchestrationEngine` -> `SmartRouter` -> `AIProvider`

This decoupling allows us to transparently swap TNB for OpenAI, or handle sudden provider downtime, without the frontend ever knowing.

## State Management Rules
- **Frontend**: Use `zustand` (`src/store/useStore.ts`) for cross-component state (like the active garment being tried on). Avoid React Context unless strictly necessary for dependency injection.
- **Backend (Memory)**: **NEVER** use `let` or `const` variables at the module level to store changing state (like metrics). Vercel serverless functions will wipe them randomly.
- **Backend (Persistent)**: Use `Upstash Redis` (`src/lib/upstash.ts`) for ephemeral distributed state (metrics, rate limits). Use `Supabase` for relational permanent state.

## Security Rules
1. **Never trust an image URL**. Always pass user-supplied URLs through `validateProxyUrl` (`src/lib/ssrfGuard.ts`) before `fetch`ing them on the backend.
2. **Never expose provider keys**. `TNB_API_KEY`, `MESHY_API_KEY`, etc. must ONLY be read in `/api/` route handlers or background workers. Never in `getServerSideProps` or RSCs that might leak to the client.

## Handling Heavy Assets
Images must be processed efficiently:
- Do not send 4 separate images to the backend. Use `createOutfitCollage` (`src/lib/studio/collage.ts`) to merge them on the client-side `canvas` and send a single Base64 string to reduce payload size and Vercel memory overhead.
