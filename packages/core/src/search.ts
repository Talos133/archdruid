import { loadConfig, historyPath } from './config.js'
import { searchGitHub } from './providers/github.js'
import { searchArxiv } from './providers/arxiv.js'
import { searchStackOverflow } from './providers/stackoverflow.js'
import { searchReddit } from './providers/reddit.js'
import type { Result, SearchOptions, DateRange, Provider } from './types.js'
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function search(query: string, opts: SearchOptions = {}): Promise<Result[]> {
  const cfg = await loadConfig()
  const t0 = Date.now()

  const allSources: Provider[] = ['github', 'arxiv', 'stackoverflow', 'reddit']
  const sources: Provider[] = opts.sources ?? allSources
  const maxResults = opts.maxResults ?? cfg.defaults.maxResults

  let dateRange: DateRange | 'all' | undefined
  if (opts.dateRange !== undefined) {
    dateRange = opts.dateRange
  } else if (cfg.defaults.dateFilter.enabled) {
    const from = new Date()
    from.setMonth(from.getMonth() - cfg.defaults.dateFilter.lookbackMonths)
    dateRange = { from }
  }

  const tasks: Promise<Result[]>[] = []

  if (sources.includes('github') && cfg.sources.github.enabled) {
    tasks.push(searchGitHub(query, {
      token: cfg.sources.github.token,
      maxResults,
      language: opts.language,
      minStars: opts.minStars,
      dateRange,
    }))
  }
  if (sources.includes('arxiv') && cfg.sources.arxiv.enabled) {
    tasks.push(searchArxiv(query, { maxResults, dateRange }))
  }
  if (sources.includes('stackoverflow') && cfg.sources.stackoverflow.enabled) {
    tasks.push(searchStackOverflow(query, {
      key: cfg.sources.stackoverflow.key,
      maxResults,
      dateRange,
    }))
  }
  if (sources.includes('reddit') && cfg.sources.reddit.enabled) {
    tasks.push(searchReddit(query, {
      clientId: cfg.sources.reddit.clientId,
      clientSecret: cfg.sources.reddit.clientSecret,
      maxResults,
      dateRange,
    }))
  }

  const settled = await Promise.allSettled(tasks)
  const results = settled
    .filter(s => s.status === 'fulfilled')
    .flatMap(s => (s as PromiseFulfilledResult<Result[]>).value)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  await appendHistory({
    query,
    sources,
    resultCount: results.length,
    durationMs: Date.now() - t0,
    calledFrom: opts.calledFrom ?? 'mcp',
  })

  return results
}

async function appendHistory(entry: object): Promise<void> {
  const path = historyPath()
  await mkdir(dirname(path), { recursive: true })
  try {
    const raw = await readFile(path, 'utf8').catch(() => '[]')
    const arr: unknown[] = JSON.parse(raw)
    arr.push({ ...entry, timestamp: new Date().toISOString() })
    if (arr.length > 200) arr.splice(0, arr.length - 200)
    await writeFile(path, JSON.stringify(arr, null, 2))
  } catch {
    // history is best-effort
  }
}
