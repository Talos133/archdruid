import { describe, it, expect, vi } from 'vitest'
import { searchReddit } from '../../src/providers/reddit.js'

vi.stubGlobal('fetch', vi.fn()
  .mockResolvedValueOnce({
    ok: true,
    json: async () => ({ access_token: 'mock_token', token_type: 'bearer' }),
  })
  .mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: {
        children: [
          {
            data: {
              id: 'abc123',
              title: 'Best TypeScript fetch retry patterns?',
              selftext: 'Looking for retry patterns in TS...',
              url: 'https://www.reddit.com/r/typescript/comments/abc123',
              score: 87,
              num_comments: 14,
              created_utc: 1704067200,
              subreddit: 'typescript',
            },
          },
        ],
      },
    }),
  })
)

describe('searchReddit', () => {
  it('maps Reddit API response to Result[]', async () => {
    const results = await searchReddit('typescript fetch retry', {
      clientId: 'test_id',
      clientSecret: 'test_secret',
      maxResults: 5,
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('reddit')
    expect(results[0].kind).toBe('post')
    expect(results[0].id).toBe('reddit:post:t3_abc123')
    expect(results[0].metrics.votes).toBe(87)
  })
})
