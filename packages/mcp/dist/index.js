import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { falconDefinition, handleFalcon } from './tools/falcon.js';
import { pouchDefinition, handlePouch } from './tools/pouch.js';
const server = new Server({ name: 'archdruid', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [falconDefinition, pouchDefinition],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'falcon')
        return handleFalcon(args ?? {});
    if (name === 'pouch')
        return handlePouch(args ?? {});
    return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    };
});
export async function startMcpServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=index.js.map