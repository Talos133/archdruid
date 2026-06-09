import { describe, it, expect, vi } from 'vitest'
import { searchGitHub } from '../../src/providers/github.js'

vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      rest: {
        search: {
          code: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  name: 'index.ts',
                  path: 'src/index.ts',
                  repository: {
                    full_name: 'foo/bar',
                    stargazers_count: 150,
                    updated_at: '2025-10-01T00:00:00Z',
                    html_url: 'https://github.com/foo/bar',
                    description: 'A test repo',
                  },
                  html_url: 'https://github.com/foo/bar/blob/main/src/index.ts',
                  url: 'https://api.github.com/repos/foo/bar/contents/src/index.ts',
                  text_matches: [{ fragment: 'const x = 1' }],
                },
              ],
            },
          }),
        },
      },
    })),
  }
})

describe('searchGitHub', () => {
  it('returns mapped results', async () => {
    const results = await searchGitHub('typescript retry', {
      token: 'fake',
      maxResults: 5,
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('github')
    expect(results[0].kind).toBe('file')
    expect(results[0].title).toBe('src/index.ts')
    expect(results[0].metrics.stars).toBe(150)
  })

  it('returns empty array on empty token without throwing', async () => {
    const results = await searchGitHub('typescript retry', {
      token: '',
      maxResults: 5,
    })
    expect(Array.isArray(results)).toBe(true)
  })
})
