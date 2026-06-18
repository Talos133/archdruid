import { getContent } from '@archdruid/core'

interface PouchArgs {
  id?: unknown
}

export async function handlePouch(args: PouchArgs): Promise<{ isError: boolean; content: { type: string; text: string }[] }> {
  if (!args.id || typeof args.id !== 'string') {
    return {
      isError: true,
      content: [{ type: 'text', text: 'Missing required parameter: id' }],
    }
  }

  try {
    const result = await getContent(args.id)
    return {
      isError: false,
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Failed to fetch content: ${(err as Error).message}` }],
    }
  }
}

export const pouchDefinition = {
  name: 'pouch',
  description: 'Fetch the full content of a result returned by falcon. Use to read a complete file, paper abstract, or thread.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: { type: 'string', description: 'Result ID from a previous falcon call' },
    },
    required: ['id'],
  },
}
