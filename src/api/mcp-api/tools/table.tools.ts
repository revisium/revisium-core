import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Prisma } from 'src/__generated__/client';
import { TableApiService } from 'src/features/table/table-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { JsonPatch } from '@revisium/schema-toolkit/types';
import { PermissionAction, PermissionSubject } from 'src/features/auth/consts';
import { McpAuthHelpers, McpToolRegistrar } from '../types';
import {
  UriRevisionResolver,
  resolveRevisionId,
  revisionIdOrUri,
  draftRevisionIdOrUri,
} from '../uri';

export class TableTools implements McpToolRegistrar {
  constructor(
    private readonly tableApi: TableApiService,
    private readonly draftApi: DraftApiService,
    private readonly uriResolver: UriRevisionResolver,
  ) {}

  register(server: McpServer, auth: McpAuthHelpers): void {
    server.registerTool(
      'get_tables',
      {
        description: 'Get all tables in a revision',
        inputSchema: {
          ...revisionIdOrUri,
          first: z.number().optional().describe('Number of items'),
          after: z.string().optional().describe('Cursor'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri, first, after }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
        );
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
          ...revisionIdOrUri,
          tableId: z.string().describe('Table ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri, tableId }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
        );
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
        const result = await this.tableApi.getTable({ revisionId, tableId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      'count_rows',
      {
        description: 'Count rows in a table',
        inputSchema: {
          ...revisionIdOrUri,
          tableId: z.string().describe('Table ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri, tableId }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
        );
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
        const table = await this.tableApi.getTable({ revisionId, tableId });
        const count = await this.tableApi.getCountRowsInTable({
          tableVersionId: table.versionId,
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ count }, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      'get_table_schema',
      {
        description: 'Get schema of a table',
        inputSchema: {
          ...revisionIdOrUri,
          tableId: z.string().describe('Table ID'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ revisionId: rawRevisionId, uri, tableId }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
        );
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
- Arrays do NOT have "default" — only "type" and "items" are required
- Array items follow normal schema rules (strings need default, objects need properties, etc.)

Correct array of objects example:
{
  "values": {
    "type": "array",
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

Correct array of strings example:
{
  "tags": {
    "type": "array",
    "items": { "type": "string", "default": "" }
  }
}

DEFAULT VALUE RULES:
- string: "default": "" (REQUIRED)
- number: "default": 0 (REQUIRED)
- boolean: "default": false (REQUIRED)
- array: NO default (not allowed, only "type" and "items")
- object: NO default (not allowed, will cause validation error)
- $ref (File): NO default. Use { "$ref": "urn:jsonschema:io:revisium:file-schema:1.0.0" } — this is the ONLY valid $ref value

FILE FIELD RULES:
- File fields use $ref with exact value: "urn:jsonschema:io:revisium:file-schema:1.0.0"
- Single file: { "$ref": "urn:jsonschema:io:revisium:file-schema:1.0.0", "description": "Photo" }
- Array of files: { "type": "array", "items": { "$ref": "urn:jsonschema:io:revisium:file-schema:1.0.0" } }
- Do NOT use $ref: "File" or any other value

FOREIGN KEY RULES:
- Add "foreignKey" property to any string field: { "type": "string", "default": "", "foreignKey": "target-table-id" }
- Root level example: { "authorRef": { "type": "string", "default": "", "foreignKey": "users" } }
- Inside nested objects: same syntax on any string field
- Array of string foreignKeys: { "type": "array", "items": { "type": "string", "default": "", "foreignKey": "other-table" } }
- foreignKey value MUST be a valid rowId — empty string is NOT allowed
- foreignKey and x-formula CANNOT coexist on the same field
- Self-references (foreignKey pointing to same table) are NOT supported`,
        inputSchema: {
          ...draftRevisionIdOrUri,
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
      async ({ revisionId: rawRevisionId, uri, tableId, schema }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
          { mutation: true },
        );
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.create,
              subject: PermissionSubject.Table,
            },
          ],
          auth.userId,
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
          'Update table schema using JSON Patch. IMPORTANT: Always call get_table_schema first to understand current structure before updating. Do NOT manually add/remove/replace the "required" array or its elements — the system manages "required" automatically based on field defaults.',
        inputSchema: {
          ...draftRevisionIdOrUri,
          tableId: z.string().describe('Table ID'),
          patches: z
            .array(z.record(z.string(), z.unknown()))
            .describe(
              'JSON Patch operations (RFC 6902). Only patch fields under /properties. Do NOT patch /required — it is managed automatically. Example: [{"op":"add","path":"/properties/newField","value":{"type":"string","default":""}}]',
            ),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId: rawRevisionId, uri, tableId, patches }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
          { mutation: true },
        );
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
          ...draftRevisionIdOrUri,
          tableId: z.string().describe('Current table ID'),
          nextTableId: z.string().describe('New table ID'),
        },
        annotations: { readOnlyHint: false, destructiveHint: false },
      },
      async ({ revisionId: rawRevisionId, uri, tableId, nextTableId }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
          { mutation: true },
        );
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
          ...draftRevisionIdOrUri,
          tableId: z.string().describe('Table ID to remove'),
        },
        annotations: { readOnlyHint: false, destructiveHint: true },
      },
      async ({ revisionId: rawRevisionId, uri, tableId }) => {
        const revisionId = await resolveRevisionId(
          { revisionId: rawRevisionId, uri },
          this.uriResolver,
          { mutation: true },
        );
        await auth.checkPermissionByRevision(
          revisionId,
          [
            {
              action: PermissionAction.delete,
              subject: PermissionSubject.Table,
            },
          ],
          auth.userId,
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
