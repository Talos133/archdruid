import { XMLParser } from 'fast-xml-parser'
import type { Result, DateRange } from '../types.js'
import { makeStructuredId } from '../id.js'
import { computeScore } from '../score.js'
import { cacheSet } from '../cache.js'

interface ArxivOptions {
  maxResults: number
  dateRange?: DateRange | 'all'
}

const ARXIV_API = 'https://export.arxiv.org/api/query'
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

export async function searchArxiv(query: string, opts: ArxivOptions): Promise<Result[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    max_results: String(opts.maxResults),
    sortBy: 'submittedDate',
    sortOrder: 'descending',
  })

  const res = await fetch(`${ARXIV_API}?${params}`)
  const xml = await res.text()
  const parsed = parser.parse(xml)

  const entries = parsed?.feed?.entry
  if (!entries) return []
  const list = Array.isArray(entries) ? entries : [entries]

  const results: Result[] = list.map((entry: Record<string, unknown>) => {
    const rawId = String(entry.id ?? '')
    const arxivId = rawId.split('/abs/')[1]?.replace(/v\d+$/, '') ?? rawId
    const links = Array.isArray(entry.link) ? entry.link : [entry.link]
    const pdfLink = links.find((l: Record<string, string>) => l?.['@_title'] === 'pdf')
    const htmlLink = links.find((l: Record<string, string>) => l?.['@_rel'] === 'alternate')
    const updated = new Date(String(entry.updated ?? Date.now()))
    const published = entry.published ? new Date(String(entry.published)) : null

    const result: Result = {
      id: makeStructuredId('arxiv', 'paper', arxivId),
      provider: 'arxiv',
      kind: 'paper',
      title: String(entry.title ?? '').trim(),
      summary: String(entry.summary ?? '').trim(),
      score: 0,
      metrics: {},
      links: {
        html: String(htmlLink?.['@_href'] ?? `https://arxiv.org/abs/${arxivId}`),
        pdf: pdfLink ? String(pdfLink['@_href']) : undefined,
      },
      timestamps: { published, updated },
      evidence: [{ snippet: String(entry.summary ?? '').trim().slice(0, 300) }],
      attribution: { source: 'arxiv', method: 'api' },
    }
    result.score = computeScore(result, query)
    cacheSet(result)
    return result
  })

  if (opts.dateRange && opts.dateRange !== 'all') {
    const from = opts.dateRange.from.getTime()
    const to = ((opts.dateRange.to ?? new Date()).getTime())
    return results.filter(r => {
      const t = r.timestamps.updated.getTime()
      return t >= from && t <= to
    })
  }

  return results
}
