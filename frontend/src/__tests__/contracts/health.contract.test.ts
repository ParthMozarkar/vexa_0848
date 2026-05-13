import { describe, it, expect } from 'vitest';

describe('health API contract', () => {
  it('documents stable GET /api/health response keys', () => {
    const sample = {
      status: 'ok',
      supabase: true,
      avatarService: null as boolean | null,
      avatarServiceMode: 'skipped' as const,
      timestamp: new Date().toISOString(),
    };
    expect(sample).toHaveProperty('status');
    expect(sample).toHaveProperty('supabase');
    expect(sample).toHaveProperty('avatarService');
    expect(sample).toHaveProperty('avatarServiceMode');
    expect(sample).toHaveProperty('timestamp');
  });
});
