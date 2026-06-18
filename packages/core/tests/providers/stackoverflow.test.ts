import { describe, it, expect, vi } from 'vitest'
import { searchStackOverflow } from '../../src/providers/stackoverflow.js'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    items: [
      {
        question_id: 11828004,
        title: 'How to retry a fetch request in TypeScript?',
        link: 'https://stackoverflow.com/questions/11828004',
        body: 'I want to retry a failed fetch...',
        score: 42,
        view_count: 15000,
        answer_count: 3,
        creation_date: 1672531200,
        last_activity_date: 1704067200,
        tags: ['typescript', 'fetch'],
      },
    ],
  }),
}))

describe('searchStackOverflow', () => {
  it('maps SO API response to Result[]', async () => {
    const results = await searchStackOverflow('typescript fetch retry', {
      key: '',
      maxResults: 5,
    })
    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('stackoverflow')
    expect(results[0].kind).toBe('question')
    expect(results[0].id).toBe('stackoverflow:question:11828004')
    expect(results[0].metrics.votes).toBe(42)
    expect(results[0].metrics.answers).toBe(3)
  })
})
