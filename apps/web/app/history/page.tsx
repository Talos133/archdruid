'use client'
import { useEffect, useState } from 'react'
import { SourceBadge } from '../../components/SourceBadge'
import type { HistoryEntry } from '@archdruid/core'

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then((data: HistoryEntry[]) =>
      setEntries([...data].reverse())
    )
  }, [])

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">History</h1>
        <p className="text-white/40 text-sm">Recent search queries (last 200)</p>
      </div>
      {entries.length === 0 && (
        <p className="text-white/20 text-sm text-center mt-16">No history yet — run a search to get started</p>
      )}
      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <div key={i} className="glass px-5 py-4 flex items-center gap-4">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-sm text-white font-medium truncate">{entry.query}</span>
              <div className="flex items-center gap-2">
                {entry.sources.map(s => <SourceBadge key={s} provider={s} />)}
                <span className="text-white/30 text-xs">{entry.resultCount} results</span>
                <span className="text-white/30 text-xs">{entry.durationMs}ms</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-white/20 text-xs">{new Date(entry.timestamp).toLocaleDateString()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${entry.calledFrom === 'mcp' ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'bg-white/10 text-white/40'}`}>
                {entry.calledFrom}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
