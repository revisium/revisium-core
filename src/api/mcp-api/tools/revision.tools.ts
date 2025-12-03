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
    server.tool(
      'getRevision',
      'Get revision details',
      {
        revisionId: z.string().describe('Revision ID'),
      },
      { readOnlyHint: true },
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

    server.tool(
      'commitRevision',
      'Commit changes in a draft revision. CRITICAL: ALWAYS ask user for permission before committing. Never commit automatically - head/draft may point to different environments and committing without permission can break production.',
      {
        organizationId: z.string().describe('Organization ID'),
        projectName: z.string().describe('Project name'),
        branchName: z.string().describe('Branch name'),
        comment: z.string().optional().describe('Commit comment'),
      },
      { readOnlyHint: false, destructiveHint: false },
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
