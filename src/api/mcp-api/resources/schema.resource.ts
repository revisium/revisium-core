import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { formulaSpec } from '@revisium/schema-toolkit/formula';
import { SchemaObject } from 'ajv';
import { FormulaService } from 'src/features/plugin/formula';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { McpResourceRegistrar } from '../types';

/**
 * Creates a copy of metaSchema with enum removed from stringSchema.
 * enum is supported in the backend but hidden from MCP to prevent
 * AI agents from using it until UI support is ready.
 */
function createMcpMetaSchema() {
  const schema = structuredClone(metaSchema) as SchemaObject;

  // Remove enum from stringSchema properties
  if (schema.$defs?.stringSchema?.properties?.enum) {
    delete schema.$defs.stringSchema.properties.enum;
  }

  return schema;
}

export class SchemaResource implements McpResourceRegistrar {
  private readonly mcpMetaSchema = createMcpMetaSchema();
  private readonly fileRef = SystemSchemaIds.File;

  constructor(private readonly formulaService: FormulaService) {}

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
    const formulaAvailable = this.formulaService.isAvailable;

    return {
      description:
        'Revisium Table Schema Specification. Use this JSON Schema to create and update table schemas.',
      formulaAvailable,
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
        withFormulas: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              default: '',
              description: 'First name',
            },
            lastName: {
              type: 'string',
              default: '',
              description: 'Last name',
            },
            fullName: {
              type: 'string',
              default: '',
              readOnly: true,
              description: 'Computed full name',
              'x-formula': {
                version: 1,
                expression: 'firstName + " " + lastName',
              },
            },
            price: {
              type: 'number',
              default: 0,
              description: 'Unit price',
            },
            quantity: {
              type: 'number',
              default: 0,
              description: 'Quantity',
            },
            total: {
              type: 'number',
              default: 0,
              readOnly: true,
              description: 'Computed total (price * quantity)',
              'x-formula': { version: 1, expression: 'price * quantity' },
            },
            inStock: {
              type: 'boolean',
              default: false,
              readOnly: true,
              description: 'Computed availability',
              'x-formula': { version: 1, expression: 'quantity > 0' },
            },
          },
          additionalProperties: false,
          required: [
            'firstName',
            'lastName',
            'fullName',
            'price',
            'quantity',
            'total',
            'inStock',
          ],
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
        withSingleFile: {
          description: 'Table with a single file field for document upload',
          type: 'object',
          properties: {
            title: {
              type: 'string',
              default: '',
              description: 'Document title',
            },
            document: {
              $ref: this.fileRef,
              description: 'Uploaded document (PDF, DOC, etc.)',
            },
          },
          additionalProperties: false,
          required: ['title', 'document'],
        },
        withFileGallery: {
          description: 'Table with array of files for image gallery',
          type: 'object',
          properties: {
            albumName: {
              type: 'string',
              default: '',
              description: 'Photo album name',
            },
            coverImage: {
              $ref: this.fileRef,
              description: 'Main cover image',
            },
            photos: {
              type: 'array',
              items: { $ref: this.fileRef },
              description:
                'Gallery photos (add items to upload multiple files)',
            },
          },
          additionalProperties: false,
          required: ['albumName', 'coverImage', 'photos'],
        },
        productWithImages: {
          description: 'E-commerce product with main image and gallery',
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
              description: 'Product price',
            },
            description: {
              type: 'string',
              default: '',
              contentMediaType: 'text/markdown',
              description: 'Product description in Markdown',
            },
            mainImage: {
              $ref: this.fileRef,
              description: 'Primary product image',
            },
            gallery: {
              type: 'array',
              items: { $ref: this.fileRef },
              description: 'Additional product images',
            },
            categoryId: {
              type: 'string',
              default: '',
              foreignKey: 'categories',
              description: 'Product category reference',
            },
          },
          additionalProperties: false,
          required: [
            'name',
            'price',
            'description',
            'mainImage',
            'gallery',
            'categoryId',
          ],
        },
        blogPostWithMedia: {
          description: 'Blog post with featured image and attachments',
          type: 'object',
          properties: {
            title: {
              type: 'string',
              default: '',
              description: 'Post title',
            },
            slug: {
              type: 'string',
              default: '',
              description: 'URL-friendly identifier',
            },
            content: {
              type: 'string',
              default: '',
              contentMediaType: 'text/markdown',
              description: 'Post content in Markdown',
            },
            featuredImage: {
              $ref: this.fileRef,
              description: 'Hero image displayed at top of post',
            },
            attachments: {
              type: 'array',
              items: { $ref: this.fileRef },
              description: 'Downloadable files (PDFs, docs, etc.)',
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
              default: '',
              description: 'Publication date',
            },
            authorId: {
              type: 'string',
              default: '',
              foreignKey: 'authors',
              description: 'Post author reference',
            },
          },
          additionalProperties: false,
          required: [
            'title',
            'slug',
            'content',
            'featuredImage',
            'attachments',
            'publishedAt',
            'authorId',
          ],
        },
        userProfile: {
          description: 'User profile with avatar and document uploads',
          type: 'object',
          properties: {
            username: {
              type: 'string',
              default: '',
              description: 'Unique username',
            },
            email: {
              type: 'string',
              format: 'email',
              default: '',
              description: 'User email address',
            },
            avatar: {
              $ref: this.fileRef,
              description: 'Profile picture (recommended: square image)',
            },
            resume: {
              $ref: this.fileRef,
              description: 'Resume/CV document (PDF format recommended)',
            },
            portfolio: {
              type: 'array',
              items: { $ref: this.fileRef },
              description: 'Portfolio samples and work examples',
            },
            bio: {
              type: 'string',
              default: '',
              contentMediaType: 'text/markdown',
              description: 'User biography',
            },
          },
          additionalProperties: false,
          required: [
            'username',
            'email',
            'avatar',
            'resume',
            'portfolio',
            'bio',
          ],
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
        formulaAvailable
          ? 'x-formula: computed field with expression (string, number, boolean types only)'
          : 'x-formula: NOT AVAILABLE on this server',
        'Default value rules: string → default: "", number → default: 0, boolean → default: false',
        'Do NOT add "default" to array, object, or $ref (File) fields',
      ],
      commonMistakes: [
        'Do NOT add "default" to object types — objects never have default',
        'Do NOT add "default" to array types — arrays never have default',
        'Do NOT add "default" to $ref fields (File) — only $ref and description allowed',
        'DO add "default" to every primitive field (string, number, boolean)',
        'foreignKey value CANNOT be empty string — it must be a valid rowId from referenced table',
        'When adding a foreignKey field to a table that already has rows, existing rows must have valid FK references — adding a new required FK field to a table with data will fail unless the array is empty',
      ],
      ...(formulaAvailable && {
        formulaSpec: {
          version: formulaSpec.version,
          description: formulaSpec.description,
          syntax: formulaSpec.syntax,
          functions: formulaSpec.functions,
          features: formulaSpec.features,
          schemaUsage: formulaSpec.schemaUsage,
          examples: formulaSpec.examples,
        },
        formulaLimitations: [
          'Formulas can ONLY reference fields within the SAME ROW — no cross-row or cross-table references',
          'Formula field types: string, number, boolean only — NOT object, array, or $ref',
          'CANNOT combine foreignKey and x-formula on the same field',
          'Circular dependencies are rejected (a → b → a)',
        ],
      }),
      foreignKeyRules: [
        'IMPORTANT: Tables with foreignKey must be created AFTER the referenced table exists',
        'Create tables in dependency order: first tables without foreignKey, then tables that reference them',
        'IMPORTANT: Self-references (foreignKey pointing to the same table) are NOT supported',
        'When creating rows with foreignKey fields, the referenced row must already exist',
        'foreignKey value MUST be a valid rowId from the referenced table. Empty string is NOT allowed — it will fail validation',
        'Example order: 1) create "categories" table, 2) create "products" table with foreignKey to categories',
      ],
      foreignKeyLocations: [
        'Root-level string field: { "categoryId": { "type": "string", "default": "", "foreignKey": "categories" } }',
        'Inside nested object: { "metadata": { "type": "object", "properties": { "authorId": { "type": "string", "default": "", "foreignKey": "authors" } } } }',
        'Inside array items (object): { "items": { "type": "array", "items": { "type": "object", "properties": { "productId": { "type": "string", "default": "", "foreignKey": "products" } } } } }',
        'Inside array of strings: { "relatedIds": { "type": "array", "items": { "type": "string", "default": "", "foreignKey": "related-table" } } }',
        'CANNOT be combined with x-formula on the same field',
      ],
      foreignKeyUpdateRules: [
        'Adding a foreignKey field to a table with existing rows will fail — existing rows have empty default value which is not a valid FK reference',
        'Safe to add foreignKey field to an EMPTY table (no rows)',
        'Adding an ARRAY field with foreignKey in items is safe even with existing rows — empty array means no items to validate',
        'Removing a foreignKey field is safe — no referential integrity to check',
        'Cannot delete a table that is referenced by foreignKey from another table',
        'Renaming a table automatically updates all foreignKey references in other tables',
      ],
      fileFieldRules: [
        `Use $ref: "${this.fileRef}" to define a file field`,
        'File fields are automatically initialized with status="ready" and a unique fileId when row is created',
        'Use uploadFile tool to upload actual file content using the generated fileId',
        'After upload, status changes to "uploaded" and url becomes available',
        `For arrays of files, use type: "array" with items: { $ref: "${this.fileRef}" }`,
        'Maximum file size: 50MB',
        'For images, width and height are automatically extracted after upload',
        'File content is immutable - only fileName can be modified after upload',
        'See revisium://specs/file resource for detailed file upload workflow',
      ],
      fileDataRules: [
        'IMPORTANT: When creating rows with file fields, pass an EMPTY file object with all fields set to empty/zero values',
        'The system will automatically generate a unique fileId and set status to "ready" for the file field',
        'After row creation, use uploadFile tool with the generated fileId to upload actual file content',
        'For arrays of files, pass an array of empty file objects - each will get its own fileId',
      ],
      emptyFileObject: {
        extension: '',
        fileId: '',
        fileName: '',
        hash: '',
        height: 0,
        mimeType: '',
        size: 0,
        status: '',
        url: '',
        width: 0,
      },
      fileSchemaRef: this.fileRef,
      fileFieldExamples: {
        singleFile: {
          note: 'Simple file field for document upload',
          schema: { $ref: this.fileRef, description: 'Uploaded document' },
        },
        arrayOfFiles: {
          note: 'Array of files for gallery or attachments',
          schema: {
            type: 'array',
            items: { $ref: this.fileRef },
            description: 'Multiple file uploads',
          },
        },
        addFileFieldToExistingTable: {
          note: 'JSON Patch to add file field to existing table',
          patches: [
            {
              op: 'add',
              path: '/properties/attachment',
              value: { $ref: this.fileRef, description: 'File attachment' },
            },
            { op: 'add', path: '/required/-', value: 'attachment' },
          ],
        },
        addFileArrayToExistingTable: {
          note: 'JSON Patch to add array of files to existing table',
          patches: [
            {
              op: 'add',
              path: '/properties/images',
              value: {
                type: 'array',
                items: { $ref: this.fileRef },
                description: 'Image gallery',
              },
            },
            { op: 'add', path: '/required/-', value: 'images' },
          ],
        },
      },
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
