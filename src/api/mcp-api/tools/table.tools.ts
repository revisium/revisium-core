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
      'getTables',
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
      'getTable',
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
      'getTableSchema',
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
      'createTable',
      {
        description:
          'Create a new table with schema. Read revisium://specs/schema resource first. IMPORTANT: If schema has foreignKey, the referenced table MUST exist first. Create tables in dependency order.',
        inputSchema: {
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
      'updateTable',
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
      'renameTable',
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
      'removeTable',
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
