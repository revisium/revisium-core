import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Prisma } from 'src/__generated__/client';
import { RowApiService } from 'src/features/row/row-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { JsonValuePatchReplace } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';
import { mapToPrismaOrderBy } from 'src/api/utils/mapToPrismaOrderBy';

export class RowTools implements McpToolRegistrar {
  constructor(
    private readonly rowApi: RowApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_rows',
      {
        description: `Get rows from a table. Each row may include formulaErrors array if formula computation failed.

FILTERING with "where" parameter:
- where: Filter conditions using path-based syntax for the "data" field
  - path: Field path (e.g., "name", "stats.damage", "items[0].price", "items[*].quantity")
  - Operators: equals, not, gt, gte, lt, lte, in, notIn, string_contains, string_starts_with, string_ends_with, array_contains, array_starts_with, array_ends_with, search
  - Example: { "where": { "data": { "path": "price", "gte": 100 } } }
  - Computed (formula) fields can be used in where just like regular fields

SORTING with "orderBy" parameter:
- orderBy: Array of sort conditions
  - field: "createdAt", "updatedAt", "publishedAt", "id", or "data" (for sorting by data fields)
  - direction: "asc" or "desc"
  - path: Required when field is "data" - the path to the data field (e.g., "price", "stats.damage")
  - type: Required when field is "data" - "text", "int", "float", "boolean", or "timestamp"
  - aggregation: Optional for arrays - "min", "max", "avg", "first", "last"

  Examples:
  - Sort by createdAt: [{ "field": "createdAt", "direction": "desc" }]
  - Sort by data field: [{ "field": "data", "path": "price", "type": "int", "direction": "asc" }]
  - Sort by nested field: [{ "field": "data", "path": "stats.damage", "type": "int", "direction": "desc" }]

PATH SYNTAX for nested/array fields:
- "name" - top-level field
- "stats.strength" - nested object field
- "inventory[0].itemId" - array element by index
- "inventory[*].price" - all array elements (wildcard)

RESPONSE may include:
- formulaErrors: Array of formula computation errors if any formula failed
  - fieldPath: Path to the field that failed
  - error: Error message describing the failure`,
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          tableId: z.string().describe('Table ID'),
          first: z.number().optional().describe('Number of items'),
          after: z.string().optional().describe('Cursor'),
          where: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
              'Filter conditions. Example: { "data": { "path": "price", "gte": 100 } }',
            ),
          orderBy: z
            .array(
              z
                .object({
                  field: z
                    .enum([
                      'createdAt',
                      'updatedAt',
                      'publishedAt',
                      'id',
                      'data',
                    ])
                    .describe(
                      'Field to sort by. Use "data" for sorting by row data fields.',
                    ),
                  direction: z.enum(['asc', 'desc']).describe('Sort direction'),
                  path: z
                    .string()
                    .optional()
                    .describe(
                      'Path to data field. Required when field is "data".',
                    ),
                  type: z
                    .enum(['text', 'int', 'float', 'boolean', 'timestamp'])
                    .optional()
                    .describe('Data type. Required when field is "data".'),
                  aggregation: z
                    .enum(['min', 'max', 'avg', 'first', 'last'])
                    .optional()
                    .describe('Aggregation for arrays.'),
                })
                .refine(
                  (item) =>
                    item.field !== 'data' ||
                    (item.path !== undefined && item.type !== undefined),
                  {
                    message:
                      'When field is "data", both "path" and "type" are required',
                  },
                ),
            )
            .optional()
            .describe(
              'Sort conditions. Example: [{ "field": "data", "path": "price", "type": "int", "direction": "asc" }]',
            ),
        },
        annotations: { readOnlyHint: true },
      },
      async (
        { revisionId, tableId, first, after, where, orderBy },
        context,
      ) => {
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
        const prismaOrderBy = mapToPrismaOrderBy(orderBy);
        const result = await this.rowApi.getRows({
          revisionId,
          tableId,
          first: first ?? 50,
          after,
          where,
          orderBy: prismaOrderBy,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'search_rows',
      {
        description:
          'Full-text search across all fields of all rows in a revision. Returns matching rows with match details (path, value, highlight). Searches across ALL tables - no tableId needed.',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          query: z.string().describe('Search string to match against row data'),
          first: z.number().optional().describe('Number of items (default 50)'),
          after: z.string().optional().describe('Cursor for pagination'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, query, first, after }, context) => {
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
        const result = await this.rowApi.searchRows({
          revisionId,
          query,
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
        description: `Get a specific row. May include formulaErrors array if formula computation failed.

RESPONSE may include:
- formulaErrors: Array of formula computation errors if any formula failed
  - fieldPath: Path to the field that failed (e.g., "total" or "items[0].subtotal")
  - error: Error message describing the failure`,
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
        description: `Create a new row in a table. IMPORTANT: If table has foreignKey fields, referenced rows MUST exist first. Create rows in dependency order.

IMPORTANT for tables with computed fields (x-formula):
- Computed fields are marked as readOnly in schema
- When creating rows, you MUST still include computed fields in data with their default value
- The server will overwrite with the computed result
- Example: If schema has "total" with x-formula and default: 0, pass "total": 0 in row data

Example:
- Schema: { "price": {...}, "quantity": {...}, "total": { "type": "number", "default": 0, "readOnly": true, "x-formula": {...} } }
- Row data: { "price": 100, "quantity": 5, "total": 0 }  // total will be computed as 500`,
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rowId: z.string().describe('Row ID (URL-friendly)'),
          data: z
            .record(z.string(), z.unknown())
            .describe(
              'Row data matching table schema. For foreignKey fields, use a valid rowId from the referenced table. Empty string is NOT valid and will cause an error. For computed (x-formula) fields, include with default value.',
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
        description: `Create multiple rows in a table. IMPORTANT: If table has foreignKey fields, referenced rows MUST exist first.

IMPORTANT for tables with computed fields (x-formula):
- Computed fields are marked as readOnly in schema
- When creating rows, you MUST still include computed fields in data with their default value
- The server will overwrite with the computed result
- Example: If schema has "total" with x-formula and default: 0, pass "total": 0 in each row's data`,
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          rows: z
            .array(
              z.object({
                rowId: z.string().describe('Row ID (URL-friendly)'),
                data: z
                  .record(z.string(), z.unknown())
                  .describe(
                    'Row data matching table schema. For computed (x-formula) fields, include with default value.',
                  ),
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
      'get_row_foreign_keys_by',
      {
        description:
          'Get rows that reference a specific row via foreign key. Returns rows from a specified table that have a foreign key pointing to the given row.',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          tableId: z.string().describe('Table ID of the referenced row'),
          rowId: z.string().describe('Row ID being referenced'),
          foreignKeyByTableId: z
            .string()
            .describe('Table ID to search for referencing rows'),
          first: z
            .number()
            .optional()
            .describe('Number of items (default 100)'),
          after: z.string().optional().describe('Cursor'),
        },
        annotations: { readOnlyHint: true },
      },
      async (
        { revisionId, tableId, rowId, foreignKeyByTableId, first, after },
        context,
      ) => {
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
        const result = await this.rowApi.resolveRowForeignKeysBy({
          revisionId,
          tableId,
          rowId,
          foreignKeyByTableId,
          first: first ?? 100,
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
