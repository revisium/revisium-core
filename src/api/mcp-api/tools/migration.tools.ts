import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RevisionsApiService } from 'src/features/revision/revisions-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { Migration } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';
import {
  UriRevisionResolver,
  resolveRevisionId,
  revisionIdOrUri,
  draftRevisionIdOrUri,
} from '../uri';

export class MigrationTools implements McpToolRegistrar {
  constructor(
    private readonly revisionsApi: RevisionsApiService,
    private readonly draftApi: DraftApiService,
    private readonly uriResolver: UriRevisionResolver,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_migrations',
      {
        description:
          'Get all migrations from a revision. Migrations are schema change records that can be applied to other Revisium instances. Read revisium://specs/migration resource for migration format details.',
        inputSchema: {
          ...revisionIdOrUri,
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri }) => {
        const revisionId = await resolveRevisionId({ revisionId: rawRevisionId, uri }, this.uriResolver);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.read,
              subject: PermissionSubject.Project,
            },
          ],
          auth.userId,
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
      'apply_migrations',
      {
        description:
          'Apply migrations to a draft revision. Use this to sync schema changes from another Revisium instance. Migration IDs MUST be ISO-8601 datetime strings. Use the exact same format returned by get_migrations.',
        inputSchema: {
          ...draftRevisionIdOrUri,
          migrations: z
            .array(z.record(z.string(), z.unknown()))
            .describe(
              'Array of migration objects from get_migrations. Each has: changeType (init/update/rename/remove), id (ISO-8601 datetime), tableId, and type-specific fields (schema for init, patches for update, nextTableId for rename). Pass the objects exactly as returned by get_migrations.',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId: rawRevisionId, uri, migrations }) => {
        const revisionId = await resolveRevisionId({ revisionId: rawRevisionId, uri }, this.uriResolver, { mutation: true });
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Table,
            },
          ],
          auth.userId,
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
