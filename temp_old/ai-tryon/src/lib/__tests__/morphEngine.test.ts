import { describe, it, expect } from 'vitest'
import { selectArchetypes, computeBetaDistance } from '../morphEngine'
import type { Archetype } from '@/types'

const MOCK_ARCHETYPES: Archetype[] = [
  { id: 'arch_001', name: 'Average', betas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'arch_002', name: 'Slim', betas: [-2, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'arch_003', name: 'Plus', betas: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
]

describe('morphEngine', () => {
  it('should calculate L2 distance correctly', () => {
    // [0,0] vs [-2,0] -> (-2-0)^2 + (0-0)^2 = 4
    expect(computeBetaDistance([0, 0], [-2, 0])).toBe(4)
  })

  it('should pick arch_001 as primary if betas are zero', () => {
    const userBetas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const result = selectArchetypes(userBetas, MOCK_ARCHETYPES, 1)
    expect(result[0].archetype.id).toBe('arch_001')
    expect(result[0].weight).toBeCloseTo(1.0)
  })

  it('should sum weights to 1.0', () => {
    const userBetas = [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const result = selectArchetypes(userBetas, MOCK_ARCHETYPES, 3)
    const sum = result.reduce((a, b) => a + b.weight, 0)
    expect(sum).toBeCloseTo(1.0)
  })
})
