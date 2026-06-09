import { NextResponse } from 'next/server'
import { loadConfig } from '@archdruid/core'
import type { Config } from '@archdruid/core'

export async function GET(): Promise<NextResponse<Config['sources']>> {
  const cfg = await loadConfig()
  return NextResponse.json(cfg.sources)
}
