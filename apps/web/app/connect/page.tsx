'use client'
import { useState } from 'react'

const SNIPPETS = [
  {
    editor: 'Claude Code',
    file: '~/.claude/claude_desktop_config.json',
    color: '#a78bfa',
    code: JSON.stringify(
      { mcpServers: { archdruid: { command: 'archdruid', args: ['--mcp'] } } },
      null, 2
    ),
  },
  {
    editor: 'Cursor',
    file: '.cursor/mcp.json',
    color: '#60a5fa',
    code: JSON.stringify(
      { mcpServers: { archdruid: { command: 'archdruid', args: ['--mcp'] } } },
      null, 2
    ),
  },
  {
    editor: 'VS Code',
    file: '.vscode/settings.json',
    color: '#34d399',
    code: JSON.stringify(
      { 'mcp.servers': { archdruid: { command: 'archdruid', args: ['--mcp'] } } },
      null, 2
    ),
  },
]

export default function ConnectPage() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold text-white mb-1">Connect</h1>
        <p className="text-white/40 text-sm">Add Archdruid to your editor in one step</p>
      </div>
      <div className="glass p-4 text-sm text-white/60">
        <p className="mb-2 font-medium text-white">Prerequisites</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Install Archdruid globally: <code className="text-[#a78bfa]">npm install -g archdruid</code></li>
          <li>Verify: <code className="text-[#a78bfa]">archdruid --version</code></li>
        </ol>
      </div>
      {SNIPPETS.map(s => (
        <div key={s.editor} className="glass p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-white">{s.editor}</span>
              <span className="ml-2 text-white/30 text-xs">{s.file}</span>
            </div>
            <button
              onClick={() => copy(s.code, s.editor)}
              style={{ borderColor: `${s.color}40`, color: s.color }}
              className="text-xs border px-3 py-1 rounded-[20px] hover:opacity-80 transition-opacity"
            >
              {copied === s.editor ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="text-xs bg-black/20 rounded-[8px] p-3 text-white/60 overflow-x-auto">{s.code}</pre>
        </div>
      ))}
    </div>
  )
}
