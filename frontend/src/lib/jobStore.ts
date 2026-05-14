export interface JobRecord {
  id: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  progress?: number;
  createdAt: number;
}

const store = new Map<string, JobRecord>();

export const jobStore = {
  set: (id: string, record: JobRecord) => store.set(id, record),
  get: (id: string): JobRecord | null => store.get(id) ?? null,
  update: (id: string, patch: Partial<JobRecord>) => {
    const existing = store.get(id);
    if (existing) store.set(id, { ...existing, ...patch });
  },
};

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
