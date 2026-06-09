'use client'
import { useState } from 'react'
import { SearchBar } from '../components/SearchBar'
import { ResultCard } from '../components/ResultCard'
import type { Result } from '@archdruid/core'

export default function SearchPage() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(query: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json() as Result[]
      setResults(data)
    } catch {
      setError('Search failed. Check that providers are configured.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">Search</h1>
        <p className="text-white/40 text-sm">Query GitHub, arXiv, Stack Overflow, and Reddit</p>
      </div>
      <SearchBar onSearch={handleSearch} loading={loading} />
      {error && <p className="text-[#ef4444] text-sm">{error}</p>}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-white/40 text-xs">{results.length} results</p>
          {results.map(r => <ResultCard key={r.id} result={r} />)}
        </div>
      )}
      {!loading && results.length === 0 && (
        <p className="text-white/20 text-sm text-center mt-16">Enter a query to search developer sources</p>
      )}
    </div>
  )
}
