import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Prisma } from 'src/__generated__/client';
import { TableApiService } from 'src/features/table/table-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { JsonPatch } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';

export class TableTools implements McpToolRegistrar {
  constructor(
    private readonly tableApi: TableApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_tables',
      {
        description: 'Get all tables in a revision',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          first: z.number().optional().describe('Number of items'),
          after: z.string().optional().describe('Cursor'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, first, after }, context) => {
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
        const result = await this.tableApi.getTables({
          revisionId,
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
      'get_table',
      {
        description: 'Get a specific table',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          tableId: z.string().describe('Table ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, tableId }, context) => {
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
        const result = await this.tableApi.getTable({ revisionId, tableId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'get_table_schema',
      {
        description: 'Get schema of a table',
        inputSchema: {
          revisionId: z.string().describe('Revision ID'),
          tableId: z.string().describe('Table ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId, tableId }, context) => {
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
        const result = await this.tableApi.resolveTableSchema({
          revisionId,
          tableId,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'create_table',
      {
        description: `Create a new table with schema. Read revisium://specs/schema resource first. IMPORTANT: If schema has foreignKey, the referenced table MUST exist first. Create tables in dependency order.

SCHEMA REQUIREMENTS for computed fields (x-formula):
1. Field must have "readOnly": true
2. Field must have a "default" value (e.g., 0 for numbers, "" for strings)
3. Field MUST be included in the "required" array
4. When using in nested objects or array items, the nested "required" array must include the computed field

Example of correct schema with formula:
{
  "type": "object",
  "properties": {
    "price": { "type": "number", "default": 0 },
    "quantity": { "type": "number", "default": 0 },
    "total": {
      "type": "number",
      "default": 0,
      "readOnly": true,
      "x-formula": { "version": 1, "expression": "price * quantity" }
    }
  },
  "additionalProperties": false,
  "required": ["price", "quantity", "total"]  // <-- total MUST be here
}

ARRAY FIELD schema notes:
- Arrays need "default": [] at array level for the field to be optional
- Array items define their own defaults
- Don't add "default" inside "items" object itself - defaults go on individual item properties

Correct array example:
{
  "values": {
    "type": "array",
    "default": [],
    "items": {
      "type": "object",
      "properties": {
        "price": { "type": "number", "default": 0 }
      },
      "additionalProperties": false,
      "required": ["price"]
    }
  }
}

DEFAULT VALUE RULES:
- string: "default": "" (REQUIRED)
- number: "default": 0 (REQUIRED)
- boolean: "default": false (REQUIRED)
- array: "default": [] (REQUIRED)
- object: NO default (not allowed, will cause validation error)
- $ref (File): NO default (not allowed, only $ref and description)

FOREIGN KEY RULES:
- foreignKey can be on any string field: root level, inside nested objects, inside array items
- foreignKey value MUST be a valid rowId — empty string is NOT allowed
- foreignKey and x-formula CANNOT coexist on the same field
- Self-references (foreignKey pointing to same table) are NOT supported`,
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z
            .string()
            .describe('Table ID (URL-friendly, e.g., "posts", "categories")'),
          schema: z
            .record(z.string(), z.unknown())
            .describe(
              'JSON Schema for the table. Must have type:object, properties with defaults, additionalProperties:false, required array. Computed fields MUST be in required array. See schema-specification resource for examples.',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, tableId, schema }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Table,
            },
          ],
          session.userId,
        );
        const result = await this.draftApi.apiCreateTable({
          revisionId,
          tableId,
          schema: schema as Prisma.InputJsonValue,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'update_table',
      {
        description:
          'Update table schema using JSON Patch. IMPORTANT: Always call getTableSchema first to understand current structure before updating.',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID'),
          patches: z
            .array(z.record(z.string(), z.unknown()))
            .describe(
              'JSON Patch operations (RFC 6902). Example: [{"op":"add","path":"/properties/newField","value":{"type":"string","default":""}},{"op":"add","path":"/required/-","value":"newField"}]',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, tableId, patches }, context) => {
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
        const result = await this.draftApi.apiUpdateTable({
          revisionId,
          tableId,
          patches: patches as JsonPatch[],
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'rename_table',
      {
        description: 'Rename a table',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Current table ID'),
          nextTableId: z.string().describe('New table ID'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId, tableId, nextTableId }, context) => {
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
        const result = await this.draftApi.apiRenameTable({
          revisionId,
          tableId,
          nextTableId,
        });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'delete_table',
      {
        description: 'Remove a table',
        inputSchema: {
          revisionId: z.string().describe('Draft revision ID'),
          tableId: z.string().describe('Table ID to remove'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({ revisionId, tableId }, context) => {
        const session = auth.requireAuth(context);
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Table,
            },
          ],
          session.userId,
        );
        const result = await this.draftApi.apiRemoveTable({
          revisionId,
          tableId,
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
