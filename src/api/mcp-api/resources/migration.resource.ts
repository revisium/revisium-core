import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpResourceRegistrar } from '../types';

export class MigrationResource implements McpResourceRegistrar {
  register(server: McpServer): void {
    server.registerResource(
      'migration-specification',
      'revisium://specs/migration',
      {
        description:
          'Revisium Migration Specification for syncing schema changes between instances',
        mimeType: 'application/json',
      },
      async () => ({
        contents: [
          {
            uri: 'revisium://specs/migration',
            mimeType: 'application/json',
            text: JSON.stringify(this.getSpecification(), null, 2),
          },
        ],
      }),
    );
  }

  private getSpecification() {
    return {
      description:
        'Revisium Migration Specification. Migrations allow syncing schema and data changes between Revisium instances (dev → staging → prod).',
      concepts: {
        whatIsMigration:
          'A migration is a serialized record of schema changes (table create/update/rename/remove) that can be applied to another Revisium instance.',
        whenToUseMigrations: [
          'Syncing development changes to staging/production',
          'Replicating schema structure across environments',
          'Version-controlled schema evolution',
          'CI/CD pipeline deployments',
        ],
        migrationsVsRevisions: {
          revision:
            'Internal snapshot within a single Revisium instance. Like a git commit.',
          migration:
            'Portable change set that can be applied to any Revisium instance. Like a git patch file.',
        },
      },
      migrationTypes: {
        init: {
          description: 'Create a new table with schema',
          fields: {
            changeType: '"init"',
            id: 'Unique migration ID (MUST be ISO-8601 datetime string, e.g. "2026-03-28T10:00:00.000Z"). IDs are compared chronologically against existing migrations — non-datetime IDs will cause errors.',
            tableId: 'Table name to create',
            hash: 'Schema hash for integrity',
            schema: 'Full JSON Schema for the table',
          },
          example: {
            changeType: 'init',
            id: '2026-03-28T10:00:00.000Z',
            tableId: 'products',
            hash: 'abc123...',
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  default: '',
                  description: 'Product name',
                },
                price: {
                  type: 'number',
                  default: 0,
                  description: 'Price in cents',
                },
              },
              additionalProperties: false,
              required: ['name', 'price'],
            },
          },
        },
        update: {
          description: 'Update existing table schema using JSON Patch',
          fields: {
            changeType: '"update"',
            id: 'Unique migration ID (ISO-8601 datetime)',
            tableId: 'Table name to update',
            hash: 'Expected schema hash before update',
            patches: 'Array of JSON Patch operations',
          },
          example: {
            changeType: 'update',
            id: '2026-03-28T10:01:00.000Z',
            tableId: 'products',
            hash: 'abc123...',
            patches: [
              {
                op: 'add',
                path: '/properties/description',
                value: {
                  type: 'string',
                  default: '',
                  description: 'Product description',
                },
              },
              { op: 'add', path: '/required/-', value: 'description' },
            ],
          },
        },
        rename: {
          description: 'Rename a table',
          fields: {
            changeType: '"rename"',
            id: 'Unique migration ID (ISO-8601 datetime)',
            tableId: 'Current table name',
            nextTableId: 'New table name',
          },
          example: {
            changeType: 'rename',
            id: '2026-03-28T10:02:00.000Z',
            tableId: 'products',
            nextTableId: 'catalog_items',
          },
        },
        remove: {
          description: 'Remove a table',
          fields: {
            changeType: '"remove"',
            id: 'Unique migration ID (ISO-8601 datetime)',
            tableId: 'Table name to remove',
          },
          example: {
            changeType: 'remove',
            id: '2026-03-28T10:03:00.000Z',
            tableId: 'legacy_products',
          },
        },
      },
      workflow: {
        steps: [
          '1. Make changes in development Revisium instance',
          '2. Commit changes (creates new revision)',
          '3. Call getMigrations to get migration records from revision',
          '4. Export migrations to file or CI/CD system',
          '5. On target instance, call applyMigrations with the migration array',
          '6. Verify changes and commit if satisfied',
        ],
        tools: {
          getMigrations:
            'Get all migrations from a revision. Returns array of migration objects.',
          applyMigrations:
            'Apply array of migrations to a draft revision. Returns status for each migration.',
        },
      },
      applyMigrationsResult: {
        description: 'Each migration returns a result object',
        statuses: {
          applied: 'Migration successfully applied',
          skipped: 'Migration already applied or not applicable',
          failed: 'Migration failed - check error field',
        },
        example: [
          { id: '2026-03-28T10:00:00.000Z', status: 'applied' },
          { id: '2026-03-28T10:01:00.000Z', status: 'applied' },
          { id: '2026-03-28T10:02:00.000Z', status: 'skipped' },
          {
            id: '2026-03-28T10:03:00.000Z',
            status: 'failed',
            error: 'Table not found',
          },
        ],
      },
      bestPractices: [
        'Migration IDs MUST be ISO-8601 datetime strings (e.g., "2026-03-28T10:00:00.000Z"). Use incrementing timestamps for ordering.',
        'Apply migrations in order - init before update',
        'Test migrations on staging before production',
        'Keep migrations immutable once applied to any environment',
        'Use getMigrations from head revision for stable migrations',
      ],
    };
  }
}
