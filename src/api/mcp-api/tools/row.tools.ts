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
    server.registerTool(
      'get_rows',
      {
        description: 'Get rows from a table',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          tableId: z.string().describe('Table ID'),
          first: z.number().optional().describe('Number of items'),
          after: z.string().optional().describe('Cursor'),
        },
        annotations: { readOnlyHint: true },
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

    server.registerTool(
      'get_row',
      {
        description: 'Get a specific row',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID'),
        },
        annotations: { readOnlyHint: true },
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

    server.registerTool(
      'create_row',
      {
        description:
          'Create a new row in a table. IMPORTANT: If table has foreignKey fields, referenced rows MUST exist first. Create rows in dependency order.',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID (URL-friendly)'),
          data: z
            .record(z.string(), z.unknown())
            .describe(
              'Row data matching table schema. For foreignKey fields, use valid rowId from referenced table or empty string.',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
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

    server.registerTool(
      'update_row',
      {
        description: 'Update a row (replace all data)',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID'),
          data: z.record(z.string(), z.unknown()).describe('New row data'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
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

    server.registerTool(
      'patch_row',
      {
        description:
          'Patch a row using JSON Patch operations. ONLY "replace" operation is supported. Path is field name WITHOUT leading slash.',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID'),
          patches: z
            .array(z.record(z.string(), z.unknown()))
            .describe(
              'JSON Patch operations. ONLY replace supported. Path WITHOUT leading slash. Example: [{"op":"replace","path":"title","value":"New"}]. For nested: "address.city". For arrays: "items[0]" or "items[0].name".',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
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

    server.registerTool(
      'create_rows',
      {
        description:
          'Create multiple rows in a table. IMPORTANT: If table has foreignKey fields, referenced rows MUST exist first.',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rows: z
            .array(
              z.object({
                rowId: z.string().describe('Row ID (URL-friendly)'),
                data: z.record(z.string(), z.unknown()).describe('Row data'),
              }),
            )
            .max(1000)
            .describe('Array of rows to create (max 1000)'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, tableId, rows }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.create, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiCreateRows({
          revisionId,
          tableId,
          rows: rows.map((r) => ({
            rowId: r.rowId,
            data: r.data as Prisma.InputJsonValue,
          })),
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'update_rows',
      {
        description: 'Update multiple rows (replace all data for each row)',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rows: z
            .array(
              z.object({
                rowId: z.string().describe('Row ID'),
                data: z
                  .record(z.string(), z.unknown())
                  .describe('New row data'),
              }),
            )
            .max(1000)
            .describe('Array of rows to update (max 1000)'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, tableId, rows }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.update, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiUpdateRows({
          revisionId,
          tableId,
          rows: rows.map((r) => ({
            rowId: r.rowId,
            data: r.data as Prisma.InputJsonValue,
          })),
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'patch_rows',
      {
        description:
          'Patch multiple rows using JSON Patch operations. ONLY "replace" operation is supported.',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rows: z
            .array(
              z.object({
                rowId: z.string().describe('Row ID'),
                patches: z
                  .array(z.record(z.string(), z.unknown()))
                  .describe('JSON Patch operations'),
              }),
            )
            .max(1000)
            .describe('Array of rows to patch (max 1000)'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, tableId, rows }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.update, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiPatchRows({
          revisionId,
          tableId,
          rows: rows.map((r) => ({
            rowId: r.rowId,
            patches: r.patches as JsonValuePatchReplace[],
          })),
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'delete_rows',
      {
        description: 'Remove multiple rows',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowIds: z
            .array(z.string())
            .max(1000)
            .describe('Array of row IDs to remove (max 1000)'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({ revisionId, tableId, rowIds }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [{ action: PermissionAction.delete, subject: PermissionSubject.Row }],
          session.userId,
        );
        const result = await this.draftApi.apiRemoveRows({
          revisionId,
          tableId,
          rowIds,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'rename_row',
      {
        description: 'Rename a row (change row ID)',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Current row ID'),
          nextRowId: z.string().describe('New row ID'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
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

    server.registerTool(
      'delete_row',
      {
        description: 'Remove a row',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID to remove'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
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
