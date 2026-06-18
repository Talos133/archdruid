import { describe, it, expect, vi } from 'vitest'
import { searchArxiv } from '../../src/providers/arxiv.js'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  text: async () => `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.07041v1</id>
    <title>Attention Is All You Need</title>
    <summary>We propose a new model architecture, the Transformer.</summary>
    <published>2023-01-17T00:00:00Z</published>
    <updated>2023-03-01T00:00:00Z</updated>
    <author><name>Vaswani</name></author>
    <link href="http://arxiv.org/abs/2301.07041v1" rel="alternate"/>
    <link href="http://arxiv.org/pdf/2301.07041v1" title="pdf" type="application/pdf"/>
  </entry>
</feed>`,
}))

describe('searchArxiv', () => {
  it('maps arXiv Atom feed to Result[]', async () => {
    const results = await searchArxiv('transformer attention', { maxResults: 5 })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('arxiv')
    expect(results[0].kind).toBe('paper')
    expect(results[0].id).toBe('arxiv:paper:2301.07041')
    expect(results[0].links.pdf).toContain('pdf')
    expect(results[0].timestamps.published).toBeInstanceOf(Date)
  })
})
