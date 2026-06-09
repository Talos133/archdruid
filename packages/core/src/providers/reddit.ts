// packages/core/src/providers/reddit.ts
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface RedditOptions {
  clientId: string
  clientSecret: string
  maxResults: number
  dateRange?: DateRange | 'all'
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'archdruid/0.1.0',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Reddit OAuth failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function searchReddit(query: string, opts: RedditOptions): Promise<Result[]> {
  if (!opts.clientId || !opts.clientSecret) return []

  const token = await getAccessToken(opts.clientId, opts.clientSecret)
  const params = new URLSearchParams({
    q: query,
    limit: String(Math.min(opts.maxResults, 25)),
    sort: 'relevance',
    type: 'link',
    t: 'all',
  })

  const res = await fetch(`https://oauth.reddit.com/search?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'archdruid/0.1.0',
    },
  })
  if (!res.ok) return []

  const data = await res.json() as { data: { children: { data: Record<string, unknown> }[] } }

  let posts = data.data.children.map(c => c.data)

  if (opts.dateRange && opts.dateRange !== 'all') {
    const from = opts.dateRange.from.getTime() / 1000
    const to = ((opts.dateRange.to ?? new Date()).getTime()) / 1000
    posts = posts.filter(p => Number(p.created_utc) >= from && Number(p.created_utc) <= to)
  }

  return posts.map(post => {
    const id = makeStructuredId('reddit', 'post', `t3_${post.id}`)
    const updated = new Date(Number(post.created_utc) * 1000)
    const result: Result = {
      id,
      provider: 'reddit',
      kind: 'post',
      title: String(post.title ?? ''),
      summary: String(post.selftext ?? '').slice(0, 400),
      score: 0,
      metrics: {
        votes: Number(post.score ?? 0),
        answers: Number(post.num_comments ?? 0),
      },
      links: { html: String(post.url ?? '') },
      timestamps: { published: updated, updated },
      evidence: [{ snippet: String(post.selftext ?? '').slice(0, 300) }],
      attribution: { source: `reddit.com/r/${post.subreddit}`, method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })
}
