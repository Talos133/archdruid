import type { Result } from './types.js'

const RECENCY_WEIGHT = 0.4
const KEYWORD_WEIGHT = 0.4
const METRICS_WEIGHT = 0.2

export function computeScore(result: Result, query: string): number {
  const recency = recencyScore(result.timestamps.updated)
  const keyword = keywordScore(result, query)
  const metrics = metricsScore(result)
  const raw = recency * RECENCY_WEIGHT + keyword * KEYWORD_WEIGHT + metrics * METRICS_WEIGHT
  return Math.round(Math.min(100, Math.max(0, raw * 100)))
}

function recencyScore(updated: Date): number {
  const ageMs = Date.now() - updated.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  // Decay: 1.0 at 0 days, 0.5 at 180 days, ~0 at 730 days
  return Math.max(0, 1 - ageDays / 730)
}

function keywordScore(result: Result, query: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 0

  const titleLower = result.title.toLowerCase()
  const summaryLower = result.summary.toLowerCase()
  const evidenceLower = result.evidence.map(e => e.snippet.toLowerCase()).join(' ')

  let score = 0
  for (const term of terms) {
    if (titleLower.includes(term)) {
      score += 0.4 // Title match is most important
    } else if (summaryLower.includes(term)) {
      score += 0.25 // Summary match is secondary
    } else if (evidenceLower.includes(term)) {
      score += 0.1 // Evidence match is tertiary
    }
  }

  return score / terms.length
}

function metricsScore(result: Result): number {
  const { stars = 0, votes = 0, views = 0 } = result.metrics
  const signal = stars * 2 + votes * 3 + views * 0.001
  // Soft-cap via sigmoid-like curve
  return Math.min(1, signal / 2000)
}
