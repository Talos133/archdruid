'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',         label: 'Search',  icon: '🔍' },
  { href: '/sources',  label: 'Sources', icon: '⚡' },
  { href: '/connect',  label: 'Connect', icon: '🔌' },
  { href: '/history',  label: 'History', icon: '📋' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="glass flex flex-col gap-1 p-4 w-52 shrink-0 sticky top-0 h-screen z-10">
      <div className="flex items-center gap-2 mb-8 px-2">
        <span className="text-xl font-bold bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent">
          Archdruid
        </span>
      </div>
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-all ${
              active
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </aside>
  )
}
