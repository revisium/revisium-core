import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionChangesApiService } from 'src/features/revision-changes/revision-changes-api.service';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class RevisionChangesTools implements McpToolRegistrar {
  constructor(private readonly revisionChangesApi: RevisionChangesApiService) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'getRevisionChanges',
      {
        description:
          'Get summary of all changes in a revision (tables and rows added/modified/removed). Use this to see what changed in draft vs head.',
        inputSchema: {
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
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, compareWithRevisionId }, context) => {
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

    server.registerTool(
      'getTableChanges',
      {
        description:
          'Get detailed list of changed tables in a revision, including schema changes.',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          compareWithRevisionId: z
            .string()
            .optional()
            .describe('Optional: Compare with specific revision'),
          first: z
            .number()
            .optional()
            .describe('Number of items (default: 50)'),
          after: z.string().optional().describe('Cursor for pagination'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, compareWithRevisionId, first, after }, context) => {
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

    server.registerTool(
      'getRowChanges',
      {
        description:
          'Get detailed list of changed rows in a revision, including field-level diffs.',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          compareWithRevisionId: z
            .string()
            .optional()
            .describe('Optional: Compare with specific revision'),
          first: z
            .number()
            .optional()
            .describe('Number of items (default: 50)'),
          after: z.string().optional().describe('Cursor for pagination'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, compareWithRevisionId, first, after }, context) => {
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
