import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { McpResourceRegistrar } from '../types';

/**
 * Creates a copy of metaSchema with enum removed from stringSchema.
 * enum is supported in the backend but hidden from MCP to prevent
 * AI agents from using it until UI support is ready.
 */
function createMcpMetaSchema() {
  const schema = JSON.parse(JSON.stringify(metaSchema));

  // Remove enum from stringSchema properties
  if (schema.$defs?.stringSchema?.properties?.enum) {
    delete schema.$defs.stringSchema.properties.enum;
  }

  return schema;
}

export class SchemaResource implements McpResourceRegistrar {
  private readonly mcpMetaSchema = createMcpMetaSchema();

  register(server: McpServer): void {
    server.registerResource(
      'schema-specification',
      'revisium://specs/schema',
      {
        description: 'Revisium Table Schema Specification',
        mimeType: 'application/json',
      },
      async () => ({
        contents: [
          {
            uri: 'revisium://specs/schema',
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
        'Revisium Table Schema Specification. Use this JSON Schema to create and update table schemas.',
      schema: this.mcpMetaSchema,
      examples: {
        simpleObject: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              default: '',
              description: 'Title of the item',
            },
            count: {
              type: 'number',
              default: 0,
              description: 'Number of items in stock',
            },
            active: {
              type: 'boolean',
              default: false,
              description: 'Whether the item is active',
            },
          },
          additionalProperties: false,
          required: ['title', 'count', 'active'],
        },
        withForeignKey: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              default: '',
              description: 'Product name',
            },
            categoryId: {
              type: 'string',
              default: '',
              description: 'Reference to category',
              foreignKey: 'categories',
            },
          },
          additionalProperties: false,
          required: ['name', 'categoryId'],
        },
        withMarkdown: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              default: '',
              description: 'Article title',
            },
            content: {
              type: 'string',
              default: '',
              description: 'Article content in Markdown format',
              contentMediaType: 'text/markdown',
            },
          },
          additionalProperties: false,
          required: ['title', 'content'],
        },
        withArray: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              default: '',
              description: 'Item name',
            },
            tags: {
              type: 'array',
              description: 'List of tags for categorization',
              items: { type: 'string', default: '' },
            },
          },
          additionalProperties: false,
          required: ['name', 'tags'],
        },
        withNestedObject: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              default: '',
              description: 'User name',
            },
            address: {
              type: 'object',
              description: 'User address information',
              properties: {
                city: {
                  type: 'string',
                  default: '',
                  description: 'City name',
                },
                country: {
                  type: 'string',
                  default: '',
                  description: 'Country name',
                },
              },
              additionalProperties: false,
              required: ['city', 'country'],
            },
          },
          additionalProperties: false,
          required: ['name', 'address'],
        },
      },
      rules: [
        'Root schema must be type: object',
        'All properties must have a default value',
        'additionalProperties must be false',
        'required array must list all property names',
        'IMPORTANT: Always add "description" field to each property explaining its purpose',
        'foreignKey references another table by tableId',
        'Supported types: string, number, boolean, object, array',
        'String formats: date-time, date, time, email, regex',
        'String contentMediaType: text/plain, text/markdown, text/html, application/json',
      ],
      foreignKeyRules: [
        'IMPORTANT: Tables with foreignKey must be created AFTER the referenced table exists',
        'Create tables in dependency order: first tables without foreignKey, then tables that reference them',
        'IMPORTANT: Self-references (foreignKey pointing to the same table) are NOT supported',
        'When creating rows with foreignKey fields, the referenced row must already exist',
        'foreignKey value must be a valid rowId from the referenced table, or empty string',
        'Example order: 1) create "categories" table, 2) create "products" table with foreignKey to categories',
      ],
      updateTableRules: [
        'Use JSON Patch operations (RFC 6902) to update table schema',
        'ALWAYS read getTableSchema first before updating to understand current structure',
        'Supported operations: add, remove, replace',
        'Path format: "/properties/fieldName" for adding/removing fields',
        'When adding a field, also add to required: {"op":"add","path":"/required/-","value":"fieldName"}',
        'IMPORTANT: To add/modify description or other attributes, you must REPLACE the entire property object',
        'Example: to add description to existing field, use op:"replace" with the FULL property definition including all existing attributes plus description',
        'IMPORTANT: Self-references (foreignKey pointing to the same table being updated) are NOT supported',
      ],
      updateTableExamples: {
        addNewField: [
          {
            op: 'add',
            path: '/properties/newField',
            value: {
              type: 'string',
              default: '',
              description: 'New field description',
            },
          },
          { op: 'add', path: '/required/-', value: 'newField' },
        ],
        addDescriptionToExisting: {
          note: 'Must replace entire property object, not just add description attribute',
          patch: {
            op: 'replace',
            path: '/properties/title',
            value: {
              type: 'string',
              default: '',
              description: 'Title of the item',
            },
          },
        },
      },
      patchRowRules: [
        'ONLY "replace" operation is supported',
        'Path is field name WITHOUT leading slash: "title" NOT "/title"',
        'For nested objects use dot notation: "address.city"',
        'For array items use bracket notation: "items[0]" or "items[0].name"',
        'Value can be primitive or entire object/array to replace',
      ],
      patchRowExamples: {
        updateStringField: {
          op: 'replace',
          path: 'title',
          value: 'New Title',
        },
        updateNestedField: {
          op: 'replace',
          path: 'metadata.description',
          value: 'New description',
        },
        updateArrayItem: {
          op: 'replace',
          path: 'items[0]',
          value: { name: 'Updated item', count: 5 },
        },
        updateNestedArrayField: {
          op: 'replace',
          path: 'items[0].name',
          value: 'New name',
        },
      },
      concepts: {
        revisionsVsMigrations: {
          revision:
            'Immutable snapshot of project state (tables + data) at a point in time. Like git commits. Created via commitRevision.',
          migration:
            'Export of schema/data changes between revisions for syncing between Revisium instances (dev → prod). Use getMigrations and applyMigrations tools.',
        },
        draftVsHead: {
          draftRevisionId:
            'Working state where you make changes. Required for all modification tools (createTable, createRow, updateTable, patchRow).',
          headRevisionId:
            'Latest committed (immutable) revision. Read-only tools can use either draft or head.',
        },
      },
      criticalWarnings: [
        'NEVER commit (commitRevision) without explicit user permission',
        'Head and draft revisions may point to different environments (dev/staging/prod)',
        'Committing without permission can break production data',
        'Always ask user before committing: "Do you want me to commit these changes?"',
      ],
      workflowTips: [
        'If user mentions a project but you do not know its name, ALWAYS call getProjects first to list available projects',
        'If unsure which project user refers to, list projects and ask user to confirm',
        'After login, call getProjects to see what projects exist in the organization',
        'Remember: organizationId is usually the same as username for personal accounts',
      ],
      dataModelingGuidance: {
        description:
          'Guidelines for designing optimal table structures based on query patterns',
        principles: [
          'Design schemas with query patterns in mind - fields you filter/sort by should be at root level for efficient querying',
          'Use foreignKey for relationships instead of embedding IDs manually',
          'Keep frequently filtered fields as simple types (string, number, boolean) at root level',
          'Nested objects are great for grouping related data but harder to filter/sort by',
          'Arrays are useful for tags/lists but have limited filtering capabilities',
        ],
        queryOptimization: [
          'Fields at data.fieldName level can be filtered and sorted efficiently',
          'Nested fields (data.nested.field) can be queried but with more complex syntax',
          'For frequently sorted fields, use number type for numeric sorting or string for alphabetic',
          'Boolean fields are efficient for status filtering (active, published, etc.)',
          'Date fields (format: date-time) enable temporal queries (before, after, range)',
        ],
        antiPatterns: [
          'AVOID deeply nested structures if you need to filter by inner fields',
          'AVOID storing sortable data inside arrays (hard to query)',
          'AVOID using string for numeric values if you need numeric sorting',
          'AVOID putting frequently queried fields inside nested objects',
        ],
        examples: {
          goodForFiltering: {
            description: 'Flat structure optimized for queries',
            schema: {
              title: { type: 'string', description: 'Searchable title' },
              status: {
                type: 'string',
                description: 'Filterable status',
              },
              priority: {
                type: 'number',
                description: 'Sortable priority',
              },
              isActive: { type: 'boolean', description: 'Quick filter' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Date range queries',
              },
            },
          },
          goodForGrouping: {
            description: 'Nested structure for organized but less queried data',
            schema: {
              name: { type: 'string', description: 'Main identifier' },
              metadata: {
                type: 'object',
                description: 'Grouped metadata (less frequently queried)',
                properties: {
                  author: { type: 'string' },
                  version: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };
  }
}
