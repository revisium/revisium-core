import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpSession } from './mcp-session.service';

export type McpContext = { sessionId?: string };

export interface McpToolRegistrar {
  register(
    server: McpServer,
    requireAuth: (context: McpContext) => McpSession,
  ): void;
}

export interface McpResourceRegistrar {
  register(server: McpServer): void;
}
