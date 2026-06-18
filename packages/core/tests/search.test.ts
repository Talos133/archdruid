import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/providers/github.js', () => ({
  searchGitHub: vi.fn().mockResolvedValue([
    {
      id: 'github:file:foo/bar/index.ts',
      provider: 'github', kind: 'file', title: 'index.ts', summary: 'foo',
      score: 80, metrics: { stars: 100 }, links: { html: 'https://github.com/foo/bar' },
      timestamps: { published: null, updated: new Date() },
      evidence: [], attribution: { source: 'github', method: 'api' },
    },
  ]),
}))
vi.mock('../src/providers/arxiv.js', () => ({ searchArxiv: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/providers/stackoverflow.js', () => ({ searchStackOverflow: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/providers/reddit.js', () => ({ searchReddit: vi.fn().mockResolvedValue([]) }))
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    sources: {
      github: { enabled: true, token: 'fake' },
      arxiv: { enabled: true },
      stackoverflow: { enabled: true, key: '' },
      reddit: { enabled: false, clientId: '', clientSecret: '' },
    },
    defaults: { maxResults: 20, dateFilter: { enabled: false, lookbackMonths: 6, allowOverride: true } },
  }),
  historyPath: vi.fn().mockReturnValue('/tmp/archdruid-test-history.json'),
}))

import { search } from '../src/search.js'

describe('search', () => {
  it('returns results from enabled providers', async () => {
    const results = await search('typescript retry')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].provider).toBe('github')
  })

  it('accepts source subset', async () => {
    const results = await search('typescript retry', { sources: ['github'] })
    expect(results.every(r => r.provider === 'github')).toBe(true)
  })
})
