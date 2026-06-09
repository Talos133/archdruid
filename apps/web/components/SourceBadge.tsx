const COLORS: Record<string, string> = {
  github:        'bg-[#f97316]/20 text-[#f97316] border-[#f97316]/30',
  arxiv:         'bg-[#a78bfa]/20 text-[#a78bfa] border-[#a78bfa]/30',
  stackoverflow: 'bg-[#facc15]/20 text-[#facc15] border-[#facc15]/30',
  reddit:        'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30',
}

export function SourceBadge({ provider }: { provider: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${COLORS[provider] ?? 'bg-white/10 text-white/60 border-white/20'}`}>
      {provider}
    </span>
  )
}
