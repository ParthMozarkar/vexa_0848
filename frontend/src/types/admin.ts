// Admin dashboard data types

export interface ProviderHealthStatus {
  name: string;
  capabilities: string[];
  healthy: boolean;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export interface QueueStatus {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FailedJobRecord {
  jobId: string;
  queue: string;
  failedAt: string;
  error: string;
  provider?: string;
  userId?: string;
  attemptsMade: number;
}

export interface OrgAdminRecord {
  orgId: string;
  name: string;
  plan: string;
  apiKeyCount: number;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  quotaStatus: 'ok' | 'warning' | 'exceeded';
}

export interface AdminDashboardSummary {
  providers: ProviderHealthStatus[];
  queues: QueueStatus[];
  recentFailures: FailedJobRecord[];
  orgs: OrgAdminRecord[];
  generatedAt: string;
}
