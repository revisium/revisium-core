import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class RevisionTools implements McpToolRegistrar {
  constructor(
    private readonly revisionsApi: RevisionsApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_revision',
      {
        description: 'Get revision details',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        const result = await this.revisionsApi.revision({ revisionId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'get_parent_revision',
      {
        description:
          'Get the parent revision of a given revision. Returns null if the revision is the root (first) revision.',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          session.userId,
        );
        const result =
          await this.revisionsApi.resolveParentByRevision(revisionId);
        if (!result) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  { parent: null, message: 'This is the root revision' },
                  null,
                  2,
                ),
              },
            ],
          };
        }
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'create_revision',
      {
        description:
          'Commit changes in a draft revision. CRITICAL: ALWAYS ask user for permission before committing. Never commit automatically - head/draft may point to different environments and committing without permission can break production.',
        inputSchema: {
          organizationId: z.string().describe('Organization ID'),
          projectName: z.string().describe('Project name'),
          branchName: z.string().describe('Branch name'),
          comment: z.string().optional().describe('Commit comment'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ organizationId, projectName, branchName, comment }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByOrganizationProject(
          organizationId,
          projectName,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Revision,
            },
          ],
          session.userId,
        );
        const result = await this.draftApi.apiCreateRevision({
          organizationId,
          projectName,
          branchName,
          comment,
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
