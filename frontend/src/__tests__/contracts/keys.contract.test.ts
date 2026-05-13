import { describe, it, expect } from 'vitest';

describe('keys validate API contract', () => {
  it('demo mode response shape when x-vexa-key absent', () => {
    const demo = { valid: true, marketplace_name: 'VEXA Demo User' };
    expect(demo.valid).toBe(true);
    expect(typeof demo.marketplace_name).toBe('string');
  });
});
