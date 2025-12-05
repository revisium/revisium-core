import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UserApiService } from 'src/features/user/user-api.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class UserTools implements McpToolRegistrar {
  constructor(private readonly userApi: UserApiService) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'getUser',
      {
        description: 'Get user by ID',
        inputSchema: {
          userId: z.string().describe('User ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ userId }, context) => {
        auth.requireAuth(context);
        const result = await this.userApi.getUser({ userId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'searchUsers',
      {
        description: 'Search users by username or email',
        inputSchema: {
          search: z
            .string()
            .optional()
            .describe('Search query (username or email)'),
          first: z.number().optional().describe('Number of results'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ search, first }, context) => {
        auth.requireAuth(context);
        const result = await this.userApi.searchUsers({
          search,
          first: first ?? 20,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );
  }
}
