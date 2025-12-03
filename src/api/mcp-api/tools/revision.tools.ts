import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { McpSession } from '../mcp-session.service';
import { McpContext, McpToolRegistrar } from '../types';

export class RevisionTools implements McpToolRegistrar {
  constructor(
    private readonly revisionsApi: RevisionsApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(
    server: McpServer,
    requireAuth: (context: McpContext) => McpSession,
  ): void {
    server.tool(
      'getRevision',
      'Get revision details',
      {
        revisionId: z.string().describe('Revision ID'),
      },
      async ({ revisionId }, context) => {
        requireAuth(context);
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
      async ({ organizationId, projectName, branchName, comment }, context) => {
        requireAuth(context);
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
