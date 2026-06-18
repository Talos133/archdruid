// packages/core/src/providers/stackoverflow.ts
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface SOOptions {
  key: string
  maxResults: number
  dateRange?: DateRange | 'all'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
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
  if (!res.ok) return []

  const data = await res.json() as { items?: Record<string, unknown>[] }
  const items = data.items ?? []

  return items.map(item => {
    const bodyText = stripHtml(String(item.body ?? ''))
    const id = makeStructuredId('stackoverflow', 'question', String(item.question_id))
    const result: Result = {
      id,
      provider: 'stackoverflow',
      kind: 'question',
      title: String(item.title ?? ''),
      summary: bodyText.slice(0, 400),
      score: 0,
      metrics: {
        votes: Number(item.score ?? 0),
        views: Number(item.view_count ?? 0),
        answers: Number(item.answer_count ?? 0),
      },
      links: { html: String(item.link ?? '') },
      timestamps: {
        published: item.creation_date ? new Date(Number(item.creation_date) * 1000) : null,
        updated: new Date(Number(item.last_activity_date) * 1000),
      },
      evidence: [{ snippet: bodyText.slice(0, 300) }],
      attribution: { source: 'stackoverflow', method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })
}
