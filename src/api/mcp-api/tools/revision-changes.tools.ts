import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionChangesApiService } from 'src/features/revision-changes/revision-changes-api.service';
import { McpSession } from '../mcp-session.service';
import { McpContext, McpToolRegistrar } from '../types';

export class RevisionChangesTools implements McpToolRegistrar {
  constructor(private readonly revisionChangesApi: RevisionChangesApiService) {}

  register(
    server: McpServer,
    requireAuth: (context: McpContext) => McpSession,
  ): void {
    server.tool(
      'getRevisionChanges',
      'Get summary of all changes in a revision (tables and rows added/modified/removed). Use this to see what changed in draft vs head.',
      {
        revisionId: z
          .string()
          .describe(
            'Revision ID (use draftRevisionId to see uncommitted changes)',
          ),
        compareWithRevisionId: z
          .string()
          .optional()
          .describe(
            'Optional: Compare with specific revision. If not provided, compares with parent revision.',
          ),
      },
      async ({ revisionId, compareWithRevisionId }, context) => {
        requireAuth(context);
        const result = await this.revisionChangesApi.revisionChanges({
          revisionId,
          compareWithRevisionId,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'getTableChanges',
      'Get detailed list of changed tables in a revision, including schema changes.',
      {
        revisionId: z.string().describe('Revision ID'),
        compareWithRevisionId: z
          .string()
          .optional()
          .describe('Optional: Compare with specific revision'),
        first: z.number().optional().describe('Number of items (default: 50)'),
        after: z.string().optional().describe('Cursor for pagination'),
      },
      async ({ revisionId, compareWithRevisionId, first, after }, context) => {
        requireAuth(context);
        const result = await this.revisionChangesApi.tableChanges({
          revisionId,
          compareWithRevisionId,
          first: first ?? 50,
          after,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'getRowChanges',
      'Get detailed list of changed rows in a revision, including field-level diffs.',
      {
        revisionId: z.string().describe('Revision ID'),
        compareWithRevisionId: z
          .string()
          .optional()
          .describe('Optional: Compare with specific revision'),
        first: z.number().optional().describe('Number of items (default: 50)'),
        after: z.string().optional().describe('Cursor for pagination'),
      },
      async ({ revisionId, compareWithRevisionId, first, after }, context) => {
        requireAuth(context);
        const result = await this.revisionChangesApi.rowChanges({
          revisionId,
          compareWithRevisionId,
          first: first ?? 50,
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
