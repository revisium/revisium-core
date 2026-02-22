import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { OrganizationApiService } from 'src/features/organization/organization-api.service';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class OrganizationTools implements McpToolRegistrar {
  constructor(private readonly organizationApi: OrganizationApiService) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_organization',
      {
        description: 'Get organization by ID',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ organizationId }) => {
        await auth.checkPermissionByOrganization(
          organizationId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Organization,
            },
          ],
          auth.userId,
        );
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

    server.registerTool(
      'get_projects',
      {
        description: 'Get all projects in an organization',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          first: z.number().optional().describe('Number of items to fetch'),
          after: z.string().optional().describe('Cursor for pagination'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ organizationId, first, after }) => {
        await auth.checkPermissionByOrganization(
          organizationId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Organization,
            },
          ],
          auth.userId,
        );
        const result = await this.organizationApi.getProjectsByOrganizationId({
          organizationId,
          first: first ?? 100,
          after,
          userId: auth.userId,
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
