/**
 * Structured logger with log sanitization.
 * Prevents provider credentials and tokens from appearing in log output.
 *
 * KEY-02 / KEY-03 — no provider credentials in any log output.
 *
 * Phase 7 (OBS-03): Extended with Sentry error capture, request ID support,
 * and AI provider failure tracking (OBS-05).
 *
 * Install: npm install @sentry/nextjs
 */

// Lazy Sentry import — gracefully no-ops if @sentry/nextjs not yet installed
async function captureToSentry(error: unknown, context?: Record<string, unknown>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as {
      setContext: (k: string, v: Record<string, unknown>) => void;
      captureException: (e: unknown) => void;
    };
    if (context) Sentry.setContext('request', context);
    Sentry.captureException(error);
  } catch {
    // Sentry not installed yet — fail silently
  }
}

const SENSITIVE_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
  /X-API-Key:\s*\S+/gi,
  /api[_-]?key[=:]\s*\S+/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
];

function sanitize(msg: string): string {
  let out = msg;
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

/**
 * Extract or generate a request ID from an incoming request.
 * Reads the x-request-id header if present; otherwise generates a unique ID.
 */
export function getRequestId(req?: { headers: { get: (k: string) => string | null } }): string {
  const id =
    req?.headers.get('x-request-id') ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return id;
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => console.info(sanitize(msg), ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(sanitize(msg), ...args),

  /**
   * Log an error and optionally capture it to Sentry with structured context.
   * Pass `error` as the third argument to enable Sentry capture.
   */
  error: (msg: string, context?: Record<string, unknown>, error?: unknown) => {
    console.error(sanitize(msg), context);
    if (error) captureToSentry(error, context);
  },

  /**
   * OBS-05: Capture AI provider failures (TNB, OpenAI, etc.) with full context.
   * Always sends to Sentry with provider name, endpoint, userId, duration, and status.
   */
  aiError: (
    provider: string,
    endpoint: string,
    context: { userId?: string; duration?: number; status?: number },
  ) => {
    const msg = `[AI:${provider}] ${endpoint} failed`;
    console.error(msg, context);
    captureToSentry(new Error(msg), { provider, endpoint, ...context });
  },
};
