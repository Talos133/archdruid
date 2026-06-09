import { NextRequest, NextResponse } from 'next/server'
import { getContent } from '@archdruid/core'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await getContent(decodeURIComponent(id))
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 404 })
  }
}
