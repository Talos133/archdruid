import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { historyPath } from '@archdruid/core'

export async function GET() {
  try {
    const raw = await readFile(historyPath(), 'utf8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json([])
  }
}
