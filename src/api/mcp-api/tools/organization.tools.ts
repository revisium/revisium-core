import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { McpSession } from '../mcp-session.service';
import { McpContext, McpToolRegistrar } from '../types';

export class OrganizationTools implements McpToolRegistrar {
  constructor(private readonly organizationApi: OrganizationApiService) {}

  register(
    server: McpServer,
    requireAuth: (context: McpContext) => McpSession,
  ): void {
    server.tool(
      'getOrganization',
      'Get organization by ID',
      {
        organizationId: z.string().describe('Organization ID'),
      },
      async ({ organizationId }, context) => {
        requireAuth(context);
        const result = await this.organizationApi.organization({
          organizationId,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'getProjects',
      'Get all projects in an organization',
      {
        organizationId: z.string().describe('Organization ID'),
        first: z.number().optional().describe('Number of items to fetch'),
        after: z.string().optional().describe('Cursor for pagination'),
      },
      async ({ organizationId, first, after }, context) => {
        requireAuth(context);
        const result = await this.organizationApi.getProjectsByOrganizationId({
          organizationId,
          first: first ?? 100,
          after,
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
