export type Provider = 'github' | 'arxiv' | 'stackoverflow' | 'reddit'
export type Kind = 'file' | 'repo' | 'paper' | 'question' | 'post'

export interface DateRange {
  from: Date
  to?: Date
}

export interface SearchOptions {
  sources?: Provider[]
  maxResults?: number
  language?: string
  minStars?: number
  dateRange?: DateRange | 'all'
  calledFrom?: 'web' | 'mcp'
}

export interface Result {
  id: string
  provider: Provider
  kind: Kind
  title: string
  summary: string
  content?: string
  language?: string
  score: number
  metrics: {
    stars?: number
    votes?: number
    citations?: number
    views?: number
    answers?: number
  }
  links: {
    html: string
    raw?: string
    pdf?: string
  }
  timestamps: {
    published: Date | null
    updated: Date
  }
  evidence: { snippet: string; highlight?: string }[]
  attribution: { source: string; method: 'api' | 'headless' }
}

export interface SourceConfig {
  github: { enabled: boolean; token: string }
  arxiv: { enabled: boolean }
  stackoverflow: { enabled: boolean; key: string }
  reddit: { enabled: boolean; clientId: string; clientSecret: string }
}

export interface Config {
  sources: SourceConfig
  defaults: {
    maxResults: number
    dateFilter: {
      enabled: boolean
      lookbackMonths: number
      allowOverride: boolean
    }
  }
}

export interface HistoryEntry {
  query: string
  sources: Provider[]
  resultCount: number
  durationMs: number
  calledFrom: 'web' | 'mcp'
  timestamp: string
}
