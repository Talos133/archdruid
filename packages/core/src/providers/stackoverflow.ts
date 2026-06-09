import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface SOOptions {
  key: string
  maxResults: number
  dateRange?: DateRange | 'all'
}

export async function searchStackOverflow(query: string, opts: SOOptions): Promise<Result[]> {
  const params = new URLSearchParams({
    q: query,
    order: 'desc',
    sort: 'relevance',
    site: 'stackoverflow',
    pagesize: String(Math.min(opts.maxResults, 30)),
    filter: 'withbody',
    ...(opts.key ? { key: opts.key } : {}),
  })

  if (opts.dateRange && opts.dateRange !== 'all') {
    params.set('fromdate', String(Math.floor(opts.dateRange.from.getTime() / 1000)))
    if (opts.dateRange.to) {
      params.set('todate', String(Math.floor(opts.dateRange.to.getTime() / 1000)))
    }
  }

  const res = await fetch(`https://api.stackexchange.com/2.3/search/advanced?${params}`)
  const data = await res.json() as { items: Record<string, unknown>[] }

  return data.items.map(item => {
    const id = makeStructuredId('stackoverflow', 'question', String(item.question_id))
    const result: Result = {
      id,
      provider: 'stackoverflow',
      kind: 'question',
      title: String(item.title ?? ''),
      summary: String(item.body_markdown ?? '').slice(0, 400),
      score: 0,
      metrics: {
        votes: Number(item.score ?? 0),
        views: Number(item.view_count ?? 0),
        answers: Number(item.answer_count ?? 0),
      },
      links: { html: String(item.link ?? '') },
      timestamps: {
        published: new Date(Number(item.creation_date) * 1000),
        updated: new Date(Number(item.last_activity_date) * 1000),
      },
      evidence: [{ snippet: String(item.body_markdown ?? '').slice(0, 300) }],
      attribution: { source: 'stackoverflow', method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })
}
