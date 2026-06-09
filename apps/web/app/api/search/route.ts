import { NextRequest, NextResponse } from 'next/server'
import { search } from '@archdruid/core'
import type { SearchOptions } from '@archdruid/core'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { query: string; options?: SearchOptions }
    if (!body.query) return NextResponse.json({ error: 'query required' }, { status: 400 })
    const results = await search(body.query, body.options)
    return NextResponse.json(results)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
