'use client'
import { useEffect, useState } from 'react'
import type { Config } from '@archdruid/core'
type SourceConfig = Config['sources']

const SOURCE_META: Record<string, { label: string; color: string; note: string }> = {
  github:        { label: 'GitHub',         color: '#f97316', note: 'Required for code search. Get a token at github.com/settings/tokens' },
  arxiv:         { label: 'arXiv',          color: '#a78bfa', note: 'Public API · No rate limits' },
  stackoverflow: { label: 'Stack Overflow', color: '#facc15', note: 'Works without a key. Key raises rate limits.' },
  reddit:        { label: 'Reddit',         color: '#ef4444', note: 'Requires a Reddit app. Create one at reddit.com/prefs/apps' },
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceConfig | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sources').then(r => r.json()).then(setSources)
  }, [])

  async function update(name: string, patch: Record<string, unknown>) {
    setSaving(name)
    await fetch(`/api/sources/${name}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await fetch('/api/sources').then(r => r.json())
    setSources(updated)
    setSaving(null)
  }

  if (!sources) return <p className="text-white/40 text-sm">Loading…</p>

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">Sources</h1>
        <p className="text-white/40 text-sm">Toggle data sources and manage API credentials</p>
      </div>
      {(Object.keys(sources) as (keyof SourceConfig)[]).map(name => {
        const meta = SOURCE_META[name as string]
        const src = sources[name] as Record<string, unknown>
        return (
          <div key={String(name)} className="glass p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                <span className="font-medium text-white">{meta.label}</span>
              </div>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => update(String(name), { enabled: !src.enabled })}>
                <div className={`w-10 h-5 rounded-full transition-colors relative ${src.enabled ? 'bg-[#a78bfa]' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${src.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-white/60">{src.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            <p className="text-white/40 text-xs">{meta.note}</p>
            {'token' in src && (
              <input
                placeholder="GitHub personal access token"
                defaultValue={String(src.token ?? '')}
                onBlur={e => update(String(name), { token: e.target.value })}
                className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[#a78bfa]/40"
              />
            )}
            {'key' in src && (
              <input
                placeholder="Stack Overflow API key (optional)"
                defaultValue={String(src.key ?? '')}
                onBlur={e => update(String(name), { key: e.target.value })}
                className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-[#facc15]/40"
              />
            )}
            {'clientId' in src && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Client ID"
                  defaultValue={String(src.clientId ?? '')}
                  onBlur={e => update(String(name), { clientId: e.target.value })}
                  className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none"
                />
                <input
                  placeholder="Client Secret"
                  type="password"
                  defaultValue={String(src.clientSecret ?? '')}
                  onBlur={e => update(String(name), { clientSecret: e.target.value })}
                  className="glass px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none"
                />
              </div>
            )}
            {saving === String(name) && <p className="text-white/30 text-xs">Saving…</p>}
          </div>
        )
      })}
    </div>
  )
}
