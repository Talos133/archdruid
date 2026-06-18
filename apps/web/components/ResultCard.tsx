import type { Result } from '@archdruid/core'
import { SourceBadge } from './SourceBadge'

interface ResultCardProps {
  result: Result
  onFetchContent?: (id: string) => void
}

export function ResultCard({ result, onFetchContent }: ResultCardProps) {
  const date = result.timestamps.updated
    ? new Date(result.timestamps.updated).toLocaleDateString()
    : '—'

  return (
    <div className="glass p-5 flex flex-col gap-3 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SourceBadge provider={result.provider} />
            <span className="text-white/40 text-xs">{date}</span>
            {result.metrics.stars != null && (
              <span className="text-white/40 text-xs">★ {result.metrics.stars.toLocaleString()}</span>
            )}
          </div>
          <a
            href={result.links.html}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-white hover:text-[#a78bfa] transition-colors"
          >
            {result.title}
          </a>
        </div>
        <span className="text-xs text-[#a78bfa] font-medium shrink-0">{result.score}</span>
      </div>
      <p className="text-white/60 text-xs leading-relaxed line-clamp-3">{result.summary}</p>
      {result.evidence[0] && (
        <code className="text-xs bg-white/5 rounded px-2 py-1.5 text-white/50 line-clamp-2">
          {result.evidence[0].snippet}
        </code>
      )}
      {onFetchContent && (
        <button
          onClick={() => onFetchContent(result.id)}
          className="self-start text-xs text-[#60a5fa] hover:underline"
        >
          Fetch full content →
        </button>
      )}
    </div>
  )
}
