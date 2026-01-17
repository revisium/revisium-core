import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UserApiService } from 'src/features/user/user-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class UserTools implements McpToolRegistrar {
  constructor(private readonly userApi: UserApiService) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'admin_get_user',
      {
        description:
          'Get user by ID (admin only). Returns all user fields including email.',
        inputSchema: {
          userId: z.string().describe('User ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ userId }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkSystemPermission(
          [{ action: PermissionAction.read, subject: PermissionSubject.User }],
          session.userId,
        );
        const result = await this.userApi.adminUser({ userId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'search_users',
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
