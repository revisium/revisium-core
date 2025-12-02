import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Prisma } from 'src/__generated__/client';
import { TableApiService } from 'src/features/table/table-api.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import { JsonPatch } from '@revisium/schema-toolkit/types';
import { McpSession } from '../mcp-session.service';
import { McpContext, McpToolRegistrar } from '../types';

export class TableTools implements McpToolRegistrar {
  constructor(
    private readonly tableApi: TableApiService,
    private readonly draftApi: DraftApiService,
  ) {}

  register(
    server: McpServer,
    requireAuth: (context: McpContext) => McpSession,
  ): void {
    server.tool(
      'getTables',
      'Get all tables in a revision',
      {
        revisionId: z.string().describe('Revision ID'),
        first: z.number().optional().describe('Number of items'),
        after: z.string().optional().describe('Cursor'),
      },
      async ({ revisionId, first, after }, context) => {
        requireAuth(context);
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

    server.tool(
      'getTable',
      'Get a specific table',
      {
        revisionId: z.string().describe('Revision ID'),
        tableId: z.string().describe('Table ID'),
      },
      async ({ revisionId, tableId }, context) => {
        requireAuth(context);
        const result = await this.tableApi.getTable({ revisionId, tableId });
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.tool(
      'getTableSchema',
      'Get schema of a table',
      {
        revisionId: z.string().describe('Revision ID'),
        tableId: z.string().describe('Table ID'),
      },
      async ({ revisionId, tableId }, context) => {
        requireAuth(context);
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

    server.tool(
      'createTable',
      'Create a new table with schema. Read revisium://specs/schema resource first. IMPORTANT: If schema has foreignKey, the referenced table MUST exist first. Create tables in dependency order.',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z
          .string()
          .describe('Table ID (URL-friendly, e.g., "posts", "categories")'),
        schema: z
          .record(z.string(), z.unknown())
          .describe(
            'JSON Schema for the table. Must have type:object, properties with defaults, additionalProperties:false, required array. See schema-specification resource for examples.',
          ),
      },
      async ({ revisionId, tableId, schema }, context) => {
        requireAuth(context);
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

    server.tool(
      'updateTable',
      'Update table schema using JSON Patch. IMPORTANT: Always call getTableSchema first to understand current structure before updating.',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID'),
        patches: z
          .array(z.record(z.string(), z.unknown()))
          .describe(
            'JSON Patch operations (RFC 6902). Example: [{"op":"add","path":"/properties/newField","value":{"type":"string","default":""}},{"op":"add","path":"/required/-","value":"newField"}]',
          ),
      },
      async ({ revisionId, tableId, patches }, context) => {
        requireAuth(context);
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

    server.tool(
      'renameTable',
      'Rename a table',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Current table ID'),
        nextTableId: z.string().describe('New table ID'),
      },
      async ({ revisionId, tableId, nextTableId }, context) => {
        requireAuth(context);
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

    server.tool(
      'removeTable',
      'Remove a table',
      {
        revisionId: z.string().describe('Draft revision ID'),
        tableId: z.string().describe('Table ID to remove'),
      },
      async ({ revisionId, tableId }, context) => {
        requireAuth(context);
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
