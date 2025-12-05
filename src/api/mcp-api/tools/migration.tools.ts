import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { Migration } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class MigrationTools implements McpToolRegistrar {
  constructor(
    private readonly revisionsApi: RevisionsApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'getMigrations',
      {
        description:
          'Get all migrations from a revision. Migrations are schema change records that can be applied to other Revisium instances. Read revisium://specs/migration resource for migration format details.',
        inputSchema: {
          revisionId: z
            .string()
            .describe(
              'Revision ID to get migrations from. Use headRevisionId for stable migrations.',
            ),
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
        const result = await this.revisionsApi.migrations({ revisionId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'applyMigrations',
      {
        description:
          'Apply migrations to a draft revision. Use this to sync schema changes from another Revisium instance. Read revisium://specs/migration resource first.',
        inputSchema: {
          revisionId: z
            .string()
            .describe('Draft revision ID to apply migrations to'),
          migrations: z
            .array(z.record(z.string(), z.unknown()))
            .describe(
              'Array of migration objects. Each migration has changeType (init/update/rename/remove), id, tableId, and type-specific fields.',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, migrations }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Table,
            },
          ],
          session.userId,
        );
        const result = await this.draftApi.applyMigrations({
          revisionId,
          migrations: migrations as Migration[],
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
