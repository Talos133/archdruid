import { search } from '@archdruid/core';
export async function handleFalcon(args) {
    if (!args.query || typeof args.query !== 'string') {
        return {
            isError: true,
            content: [{ type: 'text', text: 'Missing required parameter: query' }],
        };
    }
    const opts = {};
    if (Array.isArray(args.sources))
        opts.sources = args.sources;
    if (typeof args.language === 'string')
        opts.language = args.language;
    if (typeof args.max_results === 'number')
        opts.maxResults = args.max_results;
    if (typeof args.from_date === 'string') {
        opts.dateRange = {
            from: new Date(args.from_date),
            to: typeof args.to_date === 'string' ? new Date(args.to_date) : undefined,
        };
    }
    const results = await search(args.query, opts);
    return {
        isError: false,
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    };
}
export const falconDefinition = {
    name: 'falcon',
    description: 'Search GitHub, arXiv, Stack Overflow, and Reddit for code examples, research papers, and developer discussions.',
    inputSchema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search terms' },
            sources: { type: 'array', items: { type: 'string', enum: ['github', 'arxiv', 'stackoverflow', 'reddit'] }, description: 'Subset of sources to search' },
            language: { type: 'string', description: 'Filter by programming language' },
            max_results: { type: 'number', description: '1–50, default from config' },
            from_date: { type: 'string', description: 'ISO 8601 date e.g. "2025-12-01"' },
            to_date: { type: 'string', description: 'ISO 8601 date, default today' },
        },
        required: ['query'],
    },
};
//# sourceMappingURL=falcon.js.map