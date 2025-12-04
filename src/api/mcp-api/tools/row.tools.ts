import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Prisma } from 'src/__generated__/client';
import { RowApiService } from 'src/features/row/row-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { JsonValuePatchReplace } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class RowTools implements McpToolRegistrar {
  constructor(
    private readonly rowApi: RowApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.tool(
      'getRows',
      'Get rows from a table',
      {
        revisionId: z.string().describe('Revision ID'),
        tableId: z.string().describe('Table ID'),
        first: z.number().optional().describe('Number of items'),
        after: z.string().optional().describe('Cursor'),
      },
      async ({ revisionId, tableId, first, after }, context) => {
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
        const result = await this.rowApi.getRows({
          revisionId,
          tableId,
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
      'getRow',
      'Get a specific row',
      {
        revisionId: z.string().describe('Revision ID'),
        tableId: z.string().describe('Table ID'),
        rowId: z.string().describe('Row ID'),
      },
      async ({ revisionId, tableId, rowId }, context) => {
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
        const result = await this.rowApi.getRow({ revisionId, tableId, rowId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'createRow',
      'Create a new row in a table. IMPORTANT: If table has foreignKey fields, referenced rows MUST exist first. Create rows in dependency order.',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID'),
        rowId: z.string().describe('Row ID (URL-friendly)'),
        data: z
          .record(z.string(), z.unknown())
          .describe(
            'Row data matching table schema. For foreignKey fields, use valid rowId from referenced table or empty string.',
          ),
      },
      async ({ revisionId, tableId, rowId, data }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.create, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiCreateRow({
          revisionId,
          tableId,
          rowId,
          data: data as Prisma.InputJsonValue,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'updateRow',
      'Update a row (replace all data)',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID'),
        rowId: z.string().describe('Row ID'),
        data: z.record(z.string(), z.unknown()).describe('New row data'),
      },
      async ({ revisionId, tableId, rowId, data }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.update, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiUpdateRow({
          revisionId,
          tableId,
          rowId,
          data: data as Prisma.InputJsonValue,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'patchRow',
      'Patch a row using JSON Patch operations. ONLY "replace" operation is supported. Path is field name WITHOUT leading slash.',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID'),
        rowId: z.string().describe('Row ID'),
        patches: z
          .array(z.record(z.string(), z.unknown()))
          .describe(
            'JSON Patch operations. ONLY replace supported. Path WITHOUT leading slash. Example: [{"op":"replace","path":"title","value":"New"}]. For nested: "address.city". For arrays: "items[0]" or "items[0].name".',
          ),
      },
      async ({ revisionId, tableId, rowId, patches }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.update, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiPatchRow({
          revisionId,
          tableId,
          rowId,
          patches: patches as JsonValuePatchReplace[],
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'renameRow',
      'Rename a row (change row ID)',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID'),
        rowId: z.string().describe('Current row ID'),
        nextRowId: z.string().describe('New row ID'),
      },
      async ({ revisionId, tableId, rowId, nextRowId }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.update, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiRenameRow({
          revisionId,
          tableId,
          rowId,
          nextRowId,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'removeRow',
      'Remove a row',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID'),
        rowId: z.string().describe('Row ID to remove'),
      },
      async ({ revisionId, tableId, rowId }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.delete, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiRemoveRow({
          revisionId,
          tableId,
          rowId,
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
