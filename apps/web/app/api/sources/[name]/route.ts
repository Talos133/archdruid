import { NextRequest, NextResponse } from 'next/server'
import { loadConfig, saveConfig } from '@archdruid/core'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const body = await req.json() as Record<string, unknown>
    const cfg = await loadConfig()
    const sources = cfg.sources as unknown as Record<string, Record<string, unknown>>
    if (!sources[name]) return NextResponse.json({ error: 'Unknown source' }, { status: 404 })
    sources[name] = { ...sources[name], ...body }
    await saveConfig(cfg)
    return NextResponse.json(sources[name])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
