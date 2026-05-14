# Contributing to VEXA

Welcome to the VEXA Engineering Team! We are building the foundational infrastructure for Fashion AI.

## Engineering Philosophy
1. **Zero Architecture Theater**: If an abstraction doesn't solve a scaling issue or developer friction, delete it.
2. **Serverless First**: Optimize for Vercel edge/serverless. No persistent state in memory.
3. **Provider Agnostic**: Treat AI models like commodities. Never hardcode logic to a specific provider outside of their specific `AIProvider` class.

## Branching & PR Strategy
- Branch naming: `feat/xxx`, `fix/xxx`, `chore/xxx`.
- PRs must pass:
  - `npm run type-check` (Strict TypeScript)
  - `npm run lint`
- Squash and Merge is preferred for clean commit history.

## Modifying the AI Pipeline
If you are adding a new AI vendor (e.g., a new 3D generator):
1. Create `newProvider.ts` in `src/lib/providers/`.
2. Implement the `AIProvider` interface.
3. Add the instance to `ProviderRegistry.ts`.
4. The `OrchestrationEngine` will automatically begin routing traffic to it based on your defined weight and capability.
