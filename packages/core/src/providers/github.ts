import { Octokit } from '@octokit/rest'
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface GitHubOptions {
  token: string
  maxResults: number
  language?: string
  minStars?: number
  dateRange?: DateRange | 'all'
}

export async function searchGitHub(query: string, opts: GitHubOptions): Promise<Result[]> {
  if (!opts.token) return []

  const octokit = new Octokit({ auth: opts.token })

  let q = query
  if (opts.language) q += ` language:${opts.language}`
  if (opts.minStars) q += ` stars:>=${opts.minStars}`

  if (opts.dateRange && opts.dateRange !== 'all') {
    const from = opts.dateRange.from.toISOString().slice(0, 10)
    q += ` pushed:>=${from}`
  }

  try {
    const res = await octokit.rest.search.code({
      q,
      per_page: Math.min(opts.maxResults, 30),
    })

    const results: Result[] = res.data.items.map(item => {
      const repoName = item.repository.full_name
      const id = makeStructuredId('github', 'file', `${repoName}/${item.path}`)
      const result: Result = {
        id,
        provider: 'github',
        kind: 'file',
        title: item.path,
        summary: item.repository.description ?? repoName,
        score: 0,
        metrics: { stars: item.repository.stargazers_count ?? 0 },
        links: {
          html: item.html_url,
          raw: item.url,
        },
        timestamps: {
          published: null,
          updated: new Date(item.repository.updated_at ?? Date.now()),
        },
        evidence: (item.text_matches ?? []).map(m => ({ snippet: m.fragment ?? '' })),
        attribution: { source: 'github', method: 'api' },
      }
      result.score = computeScore(result, query)
      cacheSet(result)
      return result
    })

    return results
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 403) return []
    throw err
  }
}

export async function getGitHubContent(result: Result, token: string): Promise<Result> {
  if (!token) return result
  const octokit = new Octokit({ auth: token })
  if (!result.links.raw) return result

  const res = await octokit.request('GET {url}', { url: result.links.raw })
  const content = Buffer.from(res.data.content, 'base64').toString('utf8')
  return { ...result, content }
}
