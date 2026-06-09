import { describe, it, expect, vi } from 'vitest'

vi.mock('@archdruid/core', () => ({
  search: vi.fn().mockResolvedValue([
    {
      id: 'github:file:foo/bar/index.ts',
      provider: 'github', kind: 'file', title: 'index.ts', summary: 'foo',
      score: 80, metrics: { stars: 100 },
      links: { html: 'https://github.com/foo/bar' },
      timestamps: { published: null, updated: new Date().toISOString() },
      evidence: [{ snippet: 'const x = 1' }],
      attribution: { source: 'github', method: 'api' },
    },
  ]),
}))

import { handleFalcon } from '../src/tools/falcon.js'

describe('handleFalcon', () => {
  it('calls search and returns formatted JSON', async () => {
    const result = await handleFalcon({ query: 'typescript retry' })
    expect(result.isError).toBe(false)
    const data = JSON.parse(result.content[0].text)
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].id).toBe('github:file:foo/bar/index.ts')
  })

  it('returns error on missing query', async () => {
    const result = await handleFalcon({})
    expect(result.isError).toBe(true)
  })
})
