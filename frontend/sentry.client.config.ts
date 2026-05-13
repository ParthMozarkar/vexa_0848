// OBS-01: Sentry client-side integration.
// Install: npm install @sentry/nextjs
// Run:     npx @sentry/wizard@latest -i nextjs
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs') as { init: (opts: Record<string, unknown>) => void };
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: process.env.NODE_ENV === 'development',
    enabled: process.env.NODE_ENV === 'production',
  });
} catch {
  // @sentry/nextjs not yet installed — run: npm install @sentry/nextjs
}
