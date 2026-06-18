import { cacheGet } from './cache.js'
import { loadConfig } from './config.js'
import { getGitHubContent } from './providers/github.js'
import type { Result } from './types.js'

export async function getContent(id: string): Promise<Result> {
  const cached = cacheGet(id)
  if (!cached) throw new Error(`Result not found in session cache: ${id}`)

  const cfg = await loadConfig()

  if (cached.provider === 'github') {
    return getGitHubContent(cached, cfg.sources.github.token)
  }

  // arXiv, SO, Reddit — return as-is (summary is the content for these)
  return { ...cached, content: cached.summary }
}
