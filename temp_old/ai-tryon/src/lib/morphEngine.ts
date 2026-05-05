import type { Archetype } from '@/types'

const TEMPERATURE = 0.5

/**
 * Compute squared Euclidean (L2²) distance between two beta vectors.
 */
export function computeBetaDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch')
  return a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
}

/**
 * Select the k nearest archetypes and compute softmax blend weights.
 * This logic syncs with backend/pipeline/archetype_selector.py.
 */
export function selectArchetypes(
  userBetas: number[],
  archetypes: Archetype[],
  topK = 3
): { archetype: Archetype; weight: number }[] {
  if (archetypes.length === 0) return []

  // 1. Calculate distances
  const scored = archetypes.map(arch => ({
    archetype: arch,
    distance: computeBetaDistance(userBetas, arch.betas)
  }))

  // 2. Sort and pick top K
  const sorted = scored.sort((a, b) => a.distance - b.distance)
  const topItems = sorted.slice(0, Math.min(topK, archetypes.length))

  // 3. Softmax over negative distances
  const logits = topItems.map(item => -item.distance / TEMPERATURE)
  const maxLogit = Math.max(...logits)
  const exps = logits.map(l => Math.exp(l - maxLogit))
  const sumExps = exps.reduce((a, b) => a + b, 0)
  const weights = exps.map(e => e / sumExps)

  return topItems.map((item, i) => ({
    archetype: item.archetype,
    weight: Number(weights[i].toFixed(6))
  }))
}
