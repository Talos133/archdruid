import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/cache.js', () => ({
  cacheGet: vi.fn().mockReturnValue({
    id: 'github:file:foo/bar/index.ts',
    provider: 'github' as const, kind: 'file' as const,
    title: 'index.ts', summary: 'foo', score: 80,
    metrics: { stars: 100 }, links: { html: 'https://github.com/foo/bar', raw: 'https://api.github.com/foo' },
    timestamps: { published: null, updated: new Date() },
    evidence: [], attribution: { source: 'github', method: 'api' as const },
  }),
  cacheSet: vi.fn(),
  cacheGetByUrl: vi.fn().mockReturnValue(undefined),
}))
vi.mock('../src/providers/github.js', () => ({
  getGitHubContent: vi.fn().mockResolvedValue({
    id: 'github:file:foo/bar/index.ts',
    provider: 'github' as const, kind: 'file' as const,
    title: 'index.ts', summary: 'foo', score: 80,
    metrics: { stars: 100 }, links: { html: 'https://github.com/foo/bar', raw: 'https://api.github.com/foo' },
    timestamps: { published: null, updated: new Date() },
    evidence: [], attribution: { source: 'github', method: 'api' as const },
    content: '// hello world',
  }),
}))
vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    sources: { github: { enabled: true, token: 'fake' }, arxiv: { enabled: true }, stackoverflow: { enabled: true, key: '' }, reddit: { enabled: false, clientId: '', clientSecret: '' } },
    defaults: { maxResults: 20, dateFilter: { enabled: false, lookbackMonths: 6, allowOverride: true } },
  }),
  historyPath: vi.fn().mockReturnValue('/tmp/archdruid-test-history.json'),
}))

import { getContent } from '../src/content.js'

describe('getContent', () => {
  it('fetches full content for a github result', async () => {
    const result = await getContent('github:file:foo/bar/index.ts')
    expect(result.content).toBe('// hello world')
  })
})
