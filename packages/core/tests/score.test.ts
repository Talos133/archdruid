import { describe, it, expect } from 'vitest'
import { computeScore } from '../src/score.js'
import type { Result } from '../src/types.js'

function makeResult(overrides: Partial<Result>): Result {
  return {
    id: 'github:repo:foo/bar',
    provider: 'github',
    kind: 'repo',
    title: 'foo bar',
    summary: 'foo bar baz',
    score: 0,
    metrics: {},
    links: { html: 'https://example.com' },
    timestamps: { published: null, updated: new Date() },
    evidence: [{ snippet: 'foo bar', highlight: 'foo' }],
    attribution: { source: 'github', method: 'api' },
    ...overrides,
  }
}

describe('computeScore', () => {
  it('gives higher score to recent results', () => {
    const recent = makeResult({ timestamps: { published: null, updated: new Date() } })
    const old = makeResult({
      timestamps: { published: null, updated: new Date('2020-01-01') },
    })
    const scoreRecent = computeScore(recent, 'foo bar')
    const scoreOld = computeScore(old, 'foo bar')
    expect(scoreRecent).toBeGreaterThan(scoreOld)
  })

  it('gives higher score when query terms match title', () => {
    const match = makeResult({ title: 'foo bar exact match', summary: 'something' })
    const noMatch = makeResult({ title: 'completely different', summary: 'something' })
    expect(computeScore(match, 'foo bar')).toBeGreaterThan(computeScore(noMatch, 'foo bar'))
  })

  it('returns value between 0 and 100', () => {
    const result = makeResult({})
    const s = computeScore(result, 'foo bar')
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})
