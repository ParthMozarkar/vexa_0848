import { describe, it, expect } from 'vitest'
import { computeFitLabel } from '../measurementUtils'

describe('fitEngine', () => {
  it('should return too_tight if garment is smaller than body - 2cm', () => {
    // body: 90cm, garment: 87cm -> delta -3cm
    expect(computeFitLabel(90, 87)).toBe('too_tight')
  })

  it('should return true_to_size for small positive deltas', () => {
    // body: 90cm, garment: 92cm -> delta +2cm
    expect(computeFitLabel(90, 92)).toBe('true_to_size')
  })

  it('should return oversized for large deltas (> 5cm)', () => {
    // body: 90cm, garment: 96cm -> delta +6cm
    expect(computeFitLabel(90, 96)).toBe('oversized')
  })
})
