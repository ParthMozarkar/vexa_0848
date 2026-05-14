// Structured audit log — immutable event record for security compliance.
// Every privileged action (key gen, revoke, delete, try-on) emits an audit entry.
import { logger } from './logger';

export type AuditAction =
  | 'api_key.generated'
  | 'api_key.revoked'
  | 'user.deleted'
  | 'avatar.generated'
  | 'tryon.completed'
  | 'org.created'
  | 'admin.accessed'
  | 'auth.login'
  | 'auth.signup';

export type AuditOutcome = 'success' | 'failed' | 'unauthorized';

export interface AuditEntry {
  action: AuditAction;
  actor: string | null;       // userId or 'system'
  resource: string | null;    // affected resource id (key id, user id, etc.)
  outcome: AuditOutcome;
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function emitAuditLog(entry: AuditEntry): void {
  logger.info('[AuditLog]', {
    action: entry.action,
    actor: entry.actor,
    resource: entry.resource,
    outcome: entry.outcome,
    ip: entry.ip,
    timestamp: entry.timestamp,
    ...(entry.metadata ?? {}),
  });
  // TODO: persist to audit_logs table via Supabase service role client
}

export function buildAuditEntry(
  partial: Omit<AuditEntry, 'timestamp'>,
): AuditEntry {
  return { ...partial, timestamp: new Date().toISOString() };
}
