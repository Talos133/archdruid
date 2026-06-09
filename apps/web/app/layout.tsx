import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '../components/Sidebar'

export const metadata: Metadata = {
  title: 'Archdruid',
  description: 'Local MCP server for developer knowledge retrieval',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="glow-orb w-96 h-96 bg-[#7c3aed] top-[-100px] left-[-100px]" />
        <div className="glow-orb w-80 h-80 bg-[#2563eb] bottom-[-80px] right-[-80px]" />
        <Sidebar />
        <main className="ml-52 p-8 min-h-screen relative z-[1]">
          {children}
        </main>
      </body>
    </html>
  )
}
