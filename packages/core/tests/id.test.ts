import { describe, it, expect } from 'vitest'
import { makeStructuredId, makeHashId, parseProvider } from '../src/id.js'

describe('makeStructuredId', () => {
  it('github file', () => {
    expect(makeStructuredId('github', 'file', 'sindresorhus/p-retry/index.ts'))
      .toBe('github:file:sindresorhus/p-retry/index.ts')
  })
  it('arxiv paper', () => {
    expect(makeStructuredId('arxiv', 'paper', '2301.07041'))
      .toBe('arxiv:paper:2301.07041')
  })
})

describe('makeHashId', () => {
  it('produces 12-char hex suffix', () => {
    const id = makeHashId('github', 'https://github.com/foo/bar', 'Test Title')
    expect(id).toMatch(/^github:hash:[0-9a-f]{12}$/)
  })
  it('is deterministic', () => {
    const a = makeHashId('github', 'https://github.com/foo/bar', 'Test Title')
    const b = makeHashId('github', 'https://github.com/foo/bar', 'Test Title')
    expect(a).toBe(b)
  })
})

describe('parseProvider', () => {
  it('extracts provider from structured id', () => {
    expect(parseProvider('github:file:sindresorhus/p-retry/index.ts')).toBe('github')
    expect(parseProvider('arxiv:paper:2301.07041')).toBe('arxiv')
  })
})
