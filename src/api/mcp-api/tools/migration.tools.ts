import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { Migration } from '@revisium/schema-toolkit/types';
import { McpSession } from '../mcp-session.service';
import { McpContext, McpToolRegistrar } from '../types';

export class MigrationTools implements McpToolRegistrar {
  constructor(
    private readonly revisionsApi: RevisionsApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(
    server: McpServer,
    requireAuth: (context: McpContext) => McpSession,
  ): void {
    server.tool(
      'getMigrations',
      'Get all migrations from a revision. Migrations are schema change records that can be applied to other Revisium instances. Read revisium://specs/migration resource for migration format details.',
      {
        revisionId: z
          .string()
          .describe(
            'Revision ID to get migrations from. Use headRevisionId for stable migrations.',
          ),
      },
      async ({ revisionId }, context) => {
        requireAuth(context);
        const result = await this.revisionsApi.migrations({ revisionId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'applyMigrations',
      'Apply migrations to a draft revision. Use this to sync schema changes from another Revisium instance. Read revisium://specs/migration resource first.',
      {
        revisionId: z
          .string()
          .describe('Draft revision ID to apply migrations to'),
        migrations: z
          .array(z.record(z.string(), z.unknown()))
          .describe(
            'Array of migration objects. Each migration has changeType (init/update/rename/remove), id, tableId, and type-specific fields.',
          ),
      },
      async ({ revisionId, migrations }, context) => {
        requireAuth(context);
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
