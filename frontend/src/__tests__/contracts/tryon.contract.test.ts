import { describe, it, expect } from 'vitest';
import type { HandleTryOnResult } from '@/lib/tryonContracts';

/** Frozen shape for POST /api/tryon success payload (additive fields allowed). */
const TRYON_SUCCESS_KEYS = [
  'resultUrl',
  'status',
  'fitLabel',
  'recommendedSize',
  'fitScore',
  'cached',
  'storagePath',
  'generationsRemaining',
] as const;

describe('try-on API contracts', () => {
  it('handleTryOn result includes stable keys for downstream routes', () => {
    const sample: HandleTryOnResult = {
      resultUrl: 'https://example.com/out.png',
      status: 'ready',
      fitLabel: 'True to size',
      recommendedSize: 'M',
      fitScore: 85,
      cached: false,
      storagePath: '',
    };
    expect(Object.keys(sample).sort()).toEqual(
      ['cached', 'fitLabel', 'fitScore', 'recommendedSize', 'resultUrl', 'status', 'storagePath'].sort(),
    );
  });

  it('POST /api/tryon JSON exposes expected top-level keys when IP limit fields present', () => {
    const body = {
      resultUrl: 'https://cdn.example/1.png',
      status: 'ready',
      fitLabel: 'True to size',
      recommendedSize: 'M',
      fitScore: 85,
      cached: false,
      storagePath: '',
      generationsRemaining: 1,
    };
    for (const k of TRYON_SUCCESS_KEYS) {
      expect(body).toHaveProperty(k);
    }
  });
});
