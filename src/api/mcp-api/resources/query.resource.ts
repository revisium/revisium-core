import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpResourceRegistrar } from '../types';

export class QueryResource implements McpResourceRegistrar {
  register(server: McpServer): void {
    server.registerResource(
      'query-specification',
      'revisium://specs/query',
      {
        description:
          'Revisium Query Specification for filtering and sorting rows',
        mimeType: 'application/json',
      },
      async () => ({
        contents: [
          {
            uri: 'revisium://specs/query',
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
        'Revisium Query Specification for filtering and sorting rows. Based on @revisium/prisma-pg-json library.',
      overview: {
        purpose:
          'Filter and sort rows based on field values. Supports JSON path queries, logical operators, and full-text search.',
        dataField:
          'Row data is stored in "data" JSON field. Access fields via path: data.fieldName',
        systemFields: [
          'id - Row ID (string)',
          'createdAt - Creation timestamp (date)',
          'updatedAt - Last update timestamp (date)',
          'publishedAt - Publication timestamp (date, nullable)',
        ],
      },

      stringFilters: {
        description: 'Filters for string fields',
        operators: {
          equals: {
            description: 'Exact match',
            example: { data: { path: 'title', equals: 'Hello' } },
          },
          not: {
            description: 'Not equal',
            example: { data: { path: 'status', not: 'deleted' } },
          },
          contains: {
            description: 'Contains substring (use string_contains for JSON)',
            example: { data: { path: 'title', string_contains: 'world' } },
          },
          startsWith: {
            description: 'Starts with prefix',
            example: { data: { path: 'name', string_starts_with: 'Mr' } },
          },
          endsWith: {
            description: 'Ends with suffix',
            example: {
              data: { path: 'email', string_ends_with: '@gmail.com' },
            },
          },
          in: {
            description: 'Value in array',
            example: { data: { path: 'status', in: ['active', 'pending'] } },
          },
          notIn: {
            description: 'Value not in array',
            example: { data: { path: 'status', notIn: ['deleted', 'banned'] } },
          },
          mode: {
            description: 'Case sensitivity mode',
            example: {
              data: {
                path: 'title',
                string_contains: 'hello',
                mode: 'insensitive',
              },
            },
          },
        },
      },

      numberFilters: {
        description: 'Filters for number fields',
        operators: {
          equals: { example: { data: { path: 'count', equals: 10 } } },
          not: { example: { data: { path: 'priority', not: 0 } } },
          gt: {
            description: 'Greater than',
            example: { data: { path: 'price', gt: 100 } },
          },
          gte: {
            description: 'Greater than or equal',
            example: { data: { path: 'price', gte: 100 } },
          },
          lt: {
            description: 'Less than',
            example: { data: { path: 'stock', lt: 5 } },
          },
          lte: {
            description: 'Less than or equal',
            example: { data: { path: 'stock', lte: 5 } },
          },
          in: { example: { data: { path: 'priority', in: [1, 2, 3] } } },
          notIn: { example: { data: { path: 'priority', notIn: [0, 999] } } },
        },
      },

      booleanFilters: {
        description: 'Filters for boolean fields',
        operators: {
          equals: { example: { data: { path: 'isActive', equals: true } } },
          not: { example: { data: { path: 'isDeleted', not: true } } },
        },
      },

      dateFilters: {
        description: 'Filters for date fields (format: ISO 8601)',
        operators: {
          equals: {
            example: {
              data: { path: 'publishedAt', equals: '2024-01-01T00:00:00Z' },
            },
          },
          gt: {
            description: 'After date',
            example: { data: { path: 'createdAt', gt: '2024-01-01' } },
          },
          gte: {
            description: 'On or after date',
            example: { data: { path: 'createdAt', gte: '2024-01-01' } },
          },
          lt: {
            description: 'Before date',
            example: { data: { path: 'createdAt', lt: '2024-12-31' } },
          },
          lte: {
            description: 'On or before date',
            example: { data: { path: 'createdAt', lte: '2024-12-31' } },
          },
        },
      },

      jsonPathQueries: {
        description: 'Query nested JSON fields using path notation',
        pathFormats: {
          simple: {
            description: 'Simple field access',
            example: { data: { path: 'title', equals: 'Hello' } },
          },
          nested: {
            description: 'Nested field with dot notation',
            example: { data: { path: 'address.city', equals: 'Moscow' } },
          },
          arrayIndex: {
            description: 'Array element by index',
            example: { data: { path: 'items[0].name', equals: 'First' } },
          },
          negativeIndex: {
            description: 'Array element from end',
            example: {
              data: { path: 'history[-1].action', equals: 'created' },
            },
          },
          wildcard: {
            description: 'Any array element (searches all)',
            example: {
              data: { path: 'tags[*].name', string_contains: 'important' },
            },
          },
        },
        arrayOperations: {
          array_contains: {
            description: 'Array contains ALL specified elements',
            example: {
              data: {
                path: 'tags',
                array_contains: ['javascript', 'typescript'],
              },
            },
          },
          array_starts_with: {
            description: 'First array element equals value',
            example: {
              data: { path: 'priorities', array_starts_with: 'high' },
            },
          },
          array_ends_with: {
            description: 'Last array element equals value',
            example: { data: { path: 'steps', array_ends_with: 'done' } },
          },
        },
      },

      fullTextSearch: {
        description: 'PostgreSQL full-text search in JSON fields',
        basicSearch: {
          description: 'Search with default settings (all words must match)',
          example: {
            data: { path: 'content', search: 'database performance' },
          },
        },
        searchLanguage: {
          description:
            'Language for stemming (simple, english, russian, french, etc.)',
          example: {
            data: {
              path: 'description',
              search: 'running quickly',
              searchLanguage: 'english',
            },
          },
        },
        searchType: {
          description: 'plain (AND logic) or phrase (exact phrase)',
          plain: {
            description: 'All words must be present',
            example: {
              data: {
                path: 'content',
                search: 'database performance',
                searchType: 'plain',
              },
            },
          },
          phrase: {
            description: 'Exact phrase match',
            example: {
              data: {
                path: 'text',
                search: 'full-text search',
                searchType: 'phrase',
              },
            },
          },
        },
        searchIn: {
          description: 'What to search in',
          options: [
            'all - Keys + all values (default)',
            'values - Only values (excludes field names)',
            'keys - Only JSON field names',
            'strings - Only string values',
            'numbers - Only numeric values',
            'booleans - Only boolean values',
          ],
          example: {
            data: { path: '', search: 'Anton', searchIn: 'values' },
          },
        },
        rootSearch: {
          description: 'Search entire JSON document',
          example: { data: { path: '', search: 'postgresql' } },
        },
      },

      logicalOperators: {
        description: 'Combine multiple conditions',
        AND: {
          description: 'All conditions must match',
          example: {
            AND: [
              { data: { path: 'age', gte: 18 } },
              { data: { path: 'age', lte: 65 } },
            ],
          },
        },
        OR: {
          description: 'Any condition matches',
          example: {
            OR: [
              { data: { path: 'status', equals: 'active' } },
              { data: { path: 'status', equals: 'pending' } },
            ],
          },
        },
        NOT: {
          description: 'Condition must not match',
          example: {
            NOT: { data: { path: 'email', string_contains: 'spam' } },
          },
        },
        nested: {
          description: 'Nested logical operators',
          example: {
            AND: [
              { data: { path: 'isActive', equals: true } },
              {
                OR: [
                  { data: { path: 'role', equals: 'admin' } },
                  { data: { path: 'role', equals: 'moderator' } },
                ],
              },
              {
                NOT: { data: { path: 'status', equals: 'banned' } },
              },
            ],
          },
        },
      },

      orderBySpecification: {
        description: 'Sort rows by field values',
        simpleSort: {
          ascending: { data: { path: 'title', direction: 'asc' } },
          descending: { data: { path: 'createdAt', direction: 'desc' } },
        },
        jsonFieldSort: {
          description: 'Sort by JSON field with type hint for correct ordering',
          types: [
            'text - String sorting (alphabetical)',
            'int - Integer sorting',
            'float - Decimal number sorting',
            'boolean - Boolean sorting (false before true)',
            'timestamp - Date/time sorting',
          ],
          examples: {
            textSort: {
              data: { path: 'name', direction: 'asc', type: 'text' },
            },
            numberSort: {
              data: { path: 'price', direction: 'desc', type: 'float' },
            },
            integerSort: {
              data: { path: 'priority', direction: 'asc', type: 'int' },
            },
            dateSort: {
              data: {
                path: 'publishedAt',
                direction: 'desc',
                type: 'timestamp',
              },
            },
          },
        },
        arrayAggregationSort: {
          description: 'Sort by aggregated array values',
          aggregations: ['min', 'max', 'avg', 'first', 'last'],
          examples: {
            avgRating: {
              data: {
                path: 'reviews[*].rating',
                direction: 'desc',
                type: 'float',
                aggregation: 'avg',
              },
            },
            maxScore: {
              data: {
                path: 'scores',
                direction: 'desc',
                type: 'int',
                aggregation: 'max',
              },
            },
            firstTag: {
              data: { path: 'tags', direction: 'asc', aggregation: 'first' },
            },
          },
        },
        multipleSort: {
          description: 'Sort by multiple fields',
          example: [
            { data: { path: 'priority', direction: 'asc', type: 'int' } },
            {
              data: { path: 'createdAt', direction: 'desc', type: 'timestamp' },
            },
          ],
        },
      },

      completeExamples: {
        simpleFilter: {
          description: 'Filter active items',
          where: { data: { path: 'isActive', equals: true } },
        },
        rangeFilter: {
          description: 'Filter by price range',
          where: {
            AND: [
              { data: { path: 'price', gte: 100 } },
              { data: { path: 'price', lte: 500 } },
            ],
          },
        },
        searchWithFilters: {
          description: 'Combine full-text search with filters',
          where: {
            AND: [
              { data: { path: 'content', search: 'javascript tutorial' } },
              { data: { path: 'status', equals: 'published' } },
              { data: { path: 'rating', gte: 4 } },
            ],
          },
        },
        complexQuery: {
          description:
            'Complex query with nested logic, search, and multiple sorts',
          where: {
            AND: [
              { data: { path: 'isActive', equals: true } },
              {
                OR: [
                  { data: { path: 'category', equals: 'tech' } },
                  { data: { path: 'tags[*]', equals: 'featured' } },
                ],
              },
              {
                NOT: { data: { path: 'status', equals: 'draft' } },
              },
              {
                data: {
                  path: 'title',
                  string_contains: 'guide',
                  mode: 'insensitive',
                },
              },
            ],
          },
          orderBy: [
            { data: { path: 'priority', direction: 'asc', type: 'int' } },
            {
              data: { path: 'updatedAt', direction: 'desc', type: 'timestamp' },
            },
          ],
        },
        nestedObjectQuery: {
          description: 'Query nested object fields',
          where: {
            AND: [
              { data: { path: 'author.verified', equals: true } },
              { data: { path: 'author.followers', gte: 1000 } },
              {
                data: {
                  path: 'author.name',
                  string_contains: 'John',
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
        arrayQueryExample: {
          description: 'Query array elements',
          where: {
            OR: [
              { data: { path: 'tags', array_contains: ['javascript'] } },
              { data: { path: 'categories[0]', equals: 'programming' } },
              { data: { path: 'reviews[*].rating', gte: 5 } },
            ],
          },
        },
      },

      fileFieldQueries: {
        description:
          'Examples for querying file fields (fields with $ref: "File")',
        note: 'File fields have nested properties: status, fileId, url, fileName, hash, extension, mimeType, size, width, height',

        byStatus: {
          description: 'Filter by file upload status',
          examples: {
            uploadedFiles: {
              description: 'Find rows where file is uploaded',
              where: { data: { path: 'document.status', equals: 'uploaded' } },
            },
            pendingUploads: {
              description: 'Find rows where file is waiting for upload',
              where: { data: { path: 'avatar.status', equals: 'ready' } },
            },
            failedUploads: {
              description: 'Find rows where file upload failed',
              where: { data: { path: 'attachment.status', equals: 'error' } },
            },
          },
        },

        byExtension: {
          description: 'Filter by file extension',
          examples: {
            pdfFiles: {
              description: 'Find all PDF documents',
              where: { data: { path: 'document.extension', equals: 'pdf' } },
            },
            imageFiles: {
              description: 'Find common image formats',
              where: {
                OR: [
                  { data: { path: 'image.extension', equals: 'jpg' } },
                  { data: { path: 'image.extension', equals: 'jpeg' } },
                  { data: { path: 'image.extension', equals: 'png' } },
                  { data: { path: 'image.extension', equals: 'webp' } },
                ],
              },
            },
            extensionIn: {
              description: 'Find files with specific extensions using in',
              where: {
                data: {
                  path: 'attachment.extension',
                  in: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
                },
              },
            },
          },
        },

        byMimeType: {
          description: 'Filter by MIME type',
          examples: {
            allImages: {
              description: 'Find all image files',
              where: {
                data: {
                  path: 'photo.mimeType',
                  string_starts_with: 'image/',
                },
              },
            },
            allVideos: {
              description: 'Find all video files',
              where: {
                data: {
                  path: 'media.mimeType',
                  string_starts_with: 'video/',
                },
              },
            },
            specificMimeType: {
              description: 'Find PNG images specifically',
              where: { data: { path: 'image.mimeType', equals: 'image/png' } },
            },
          },
        },

        bySize: {
          description: 'Filter by file size (in bytes)',
          examples: {
            largeFiles: {
              description: 'Find files larger than 10MB',
              where: { data: { path: 'document.size', gt: 10485760 } },
            },
            smallFiles: {
              description: 'Find files smaller than 1MB',
              where: { data: { path: 'attachment.size', lt: 1048576 } },
            },
            sizeRange: {
              description: 'Find files between 1MB and 5MB',
              where: {
                AND: [
                  { data: { path: 'file.size', gte: 1048576 } },
                  { data: { path: 'file.size', lte: 5242880 } },
                ],
              },
            },
            nonEmptyFiles: {
              description: 'Find files with actual content (size > 0)',
              where: { data: { path: 'document.size', gt: 0 } },
            },
          },
        },

        byDimensions: {
          description: 'Filter images by width/height (in pixels)',
          examples: {
            wideImages: {
              description: 'Find images wider than 1920px',
              where: { data: { path: 'image.width', gt: 1920 } },
            },
            tallImages: {
              description: 'Find images taller than 1080px',
              where: { data: { path: 'image.height', gt: 1080 } },
            },
            minimumResolution: {
              description: 'Find images at least 800x600',
              where: {
                AND: [
                  { data: { path: 'photo.width', gte: 800 } },
                  { data: { path: 'photo.height', gte: 600 } },
                ],
              },
            },
            squareImages: {
              description:
                'Note: For aspect ratio queries, retrieve and filter in application',
              note: 'Database cannot compare two fields directly',
            },
            thumbnailSize: {
              description: 'Find small thumbnails (max 200px in any dimension)',
              where: {
                AND: [
                  { data: { path: 'thumb.width', lte: 200 } },
                  { data: { path: 'thumb.height', lte: 200 } },
                  { data: { path: 'thumb.width', gt: 0 } },
                ],
              },
            },
          },
        },

        byFileName: {
          description: 'Filter by original file name',
          examples: {
            exactName: {
              description: 'Find file by exact name',
              where: {
                data: { path: 'document.fileName', equals: 'report.pdf' },
              },
            },
            nameContains: {
              description: 'Find files with name containing text',
              where: {
                data: {
                  path: 'attachment.fileName',
                  string_contains: 'invoice',
                  mode: 'insensitive',
                },
              },
            },
            nameStartsWith: {
              description: 'Find files starting with prefix',
              where: {
                data: {
                  path: 'file.fileName',
                  string_starts_with: 'IMG_',
                },
              },
            },
          },
        },

        arrayOfFiles: {
          description: 'Query arrays of files (e.g., gallery, attachments)',
          examples: {
            anyFilePdf: {
              description: 'Find rows where any attachment is a PDF',
              where: {
                data: { path: 'attachments[*].extension', equals: 'pdf' },
              },
            },
            firstImageUploaded: {
              description: 'Find rows where first gallery image is uploaded',
              where: {
                data: { path: 'gallery[0].status', equals: 'uploaded' },
              },
            },
            anyLargeFile: {
              description: 'Find rows with any file larger than 5MB',
              where: { data: { path: 'files[*].size', gt: 5242880 } },
            },
            anyImageFile: {
              description: 'Find rows with any image in attachments',
              where: {
                data: {
                  path: 'attachments[*].mimeType',
                  string_starts_with: 'image/',
                },
              },
            },
          },
        },

        sorting: {
          description: 'Sort by file properties',
          examples: {
            bySize: {
              description: 'Sort by file size (largest first)',
              orderBy: {
                data: { path: 'document.size', direction: 'desc', type: 'int' },
              },
            },
            byFileName: {
              description: 'Sort alphabetically by file name',
              orderBy: {
                data: {
                  path: 'attachment.fileName',
                  direction: 'asc',
                  type: 'text',
                },
              },
            },
            byWidth: {
              description: 'Sort images by width',
              orderBy: {
                data: { path: 'image.width', direction: 'desc', type: 'int' },
              },
            },
          },
        },

        combinedQueries: {
          description: 'Complex file queries combining multiple conditions',
          examples: {
            uploadedImages: {
              description: 'Find uploaded image files only',
              where: {
                AND: [
                  { data: { path: 'photo.status', equals: 'uploaded' } },
                  {
                    data: {
                      path: 'photo.mimeType',
                      string_starts_with: 'image/',
                    },
                  },
                ],
              },
            },
            largeUploadedPdfs: {
              description: 'Find uploaded PDFs larger than 1MB',
              where: {
                AND: [
                  { data: { path: 'document.status', equals: 'uploaded' } },
                  { data: { path: 'document.extension', equals: 'pdf' } },
                  { data: { path: 'document.size', gt: 1048576 } },
                ],
              },
            },
            highResImages: {
              description: 'Find uploaded high-resolution images (4K+)',
              where: {
                AND: [
                  { data: { path: 'image.status', equals: 'uploaded' } },
                  { data: { path: 'image.width', gte: 3840 } },
                  { data: { path: 'image.height', gte: 2160 } },
                ],
              },
            },
            productsWithImages: {
              description: 'Find products with uploaded main image',
              where: {
                AND: [
                  { data: { path: 'mainImage.status', equals: 'uploaded' } },
                  { data: { path: 'isActive', equals: true } },
                ],
              },
              orderBy: {
                data: { path: 'name', direction: 'asc', type: 'text' },
              },
            },
          },
        },
      },

      schemaToQueryMapping: {
        description: 'How to build queries based on your table schema',
        guide: [
          'For string fields: use string_contains, string_starts_with, string_ends_with, equals, in',
          'For number fields: use equals, gt, gte, lt, lte, in',
          'For boolean fields: use equals, not',
          'For date fields (format: date-time): use equals, gt, gte, lt, lte',
          'For nested objects: use dot notation in path (e.g., "address.city")',
          'For arrays: use bracket notation (e.g., "items[0]") or wildcard ("items[*]")',
          'For file fields ($ref: "File"): use dot notation to access properties (e.g., "avatar.status", "document.extension", "image.width")',
          'For file arrays: use wildcard to search any file (e.g., "attachments[*].extension")',
        ],
        performanceTips: [
          'Put most selective filters first in AND arrays',
          'Use specific paths instead of root search when possible',
          'Prefer equals over contains for exact matches',
          'Use appropriate type hints in orderBy for correct sorting',
        ],
      },
    };
  }
}
