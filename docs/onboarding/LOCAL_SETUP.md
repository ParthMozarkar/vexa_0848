# VEXA Local Setup Guide

Follow these steps to configure your local development environment for VEXA.

## Prerequisites
- Node.js 20+
- `npm` (v10+)
- Git

## 1. Environment Configuration
Request access to the Vercel project to pull environment variables automatically, or copy the example file:
```bash
cp .env.example .env.local
```

**Required Local Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TNB_API_KEY`

## 2. Installation
```bash
cd frontend
npm install
```

## 3. Running the Development Server
```bash
npm run dev
```
The application will start on `http://localhost:4028`.

## 4. Validating Local Environment
Before committing, ensure your code passes the production validation gates:
```bash
npm run type-check
npm run lint
npm run build
```

## Troubleshooting
- **Build fails with "Module not found"**: Ensure you are using `@/` path aliases correctly and not relying on dynamic `require()` for internal modules.
- **Generations failing silently**: Check your `TNB_API_KEY` and ensure `UPSTASH_REDIS_REST_URL` is set. If Redis is missing, the `SmartRouter` will gracefully degrade to static weights, but errors will be logged.
