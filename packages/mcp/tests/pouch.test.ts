import { describe, it, expect, vi } from 'vitest'

vi.mock('@archdruid/core', () => ({
  getContent: vi.fn().mockResolvedValue({
    id: 'github:file:foo/bar/index.ts',
    provider: 'github', kind: 'file', title: 'index.ts', summary: 'foo',
    content: '// full file content here',
    score: 80, metrics: { stars: 100 },
    links: { html: 'https://github.com/foo/bar' },
    timestamps: { published: null, updated: new Date().toISOString() },
    evidence: [], attribution: { source: 'github', method: 'api' },
  }),
}))

import { handlePouch } from '../src/tools/pouch.js'

describe('handlePouch', () => {
  it('returns full content for a valid id', async () => {
    const result = await handlePouch({ id: 'github:file:foo/bar/index.ts' })
    expect(result.isError).toBe(false)
    const data = JSON.parse(result.content[0].text)
    expect(data.content).toBe('// full file content here')
  })

  it('returns error on missing id', async () => {
    const result = await handlePouch({})
    expect(result.isError).toBe(true)
  })
})
