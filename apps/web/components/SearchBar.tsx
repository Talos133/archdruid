'use client'
import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  loading?: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (query.trim()) onSearch(query.trim()) }}
      className="flex gap-3"
    >
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search GitHub, arXiv, Stack Overflow, Reddit…"
        className="flex-1 glass px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#a78bfa]/50 transition-colors"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="px-6 py-3 rounded-[12px] bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
