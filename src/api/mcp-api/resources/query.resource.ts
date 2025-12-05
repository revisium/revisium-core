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

      schemaToQueryMapping: {
        description: 'How to build queries based on your table schema',
        guide: [
          'For string fields: use string_contains, string_starts_with, string_ends_with, equals, in',
          'For number fields: use equals, gt, gte, lt, lte, in',
          'For boolean fields: use equals, not',
          'For date fields (format: date-time): use equals, gt, gte, lt, lte',
          'For nested objects: use dot notation in path (e.g., "address.city")',
          'For arrays: use bracket notation (e.g., "items[0]") or wildcard ("items[*]")',
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
