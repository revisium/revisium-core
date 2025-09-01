# SQL WHERE Clause Generator

Dynamic SQL WHERE condition generator for PostgreSQL, built on analysis of Prisma ORM architecture.

## 🎯 Purpose

Generate SQL queries "on-the-fly" from JavaScript condition objects, fully compatible with Prisma Client API. Provides high performance and flexibility for complex database queries.

## 📊 Performance

**Benchmark results (100 rows of data, complex conditions):**

- **Prisma ORM**: 5.22ms average
- **PG + Generator**: 2.00ms average (**2.61x faster!**)
- **SQL Generation**: 0.0792ms average (3.96% of total time)

## 🏗️ Architecture

### Based on Prisma Research

The generator was created after detailed study of Prisma ORM architecture:

1. **JavaScript/TypeScript client** (packages/client) - serializes queries to JSON Protocol
2. **JSON Protocol** - intermediate format between client and engine
3. **Query Engine (Rust)** - converts JSON to SQL (query-builders/sql-query-builder)
4. **FilterVisitor pattern** - recursive processing of WHERE conditions

**Our approach**: Direct SQL generation from JavaScript objects, bypassing intermediate layers.

### Components

```typescript
// Main interfaces
export interface WhereConditions {
  // String fields
  versionId?: string | StringFilter;
  createdId?: string | StringFilter;
  id?: string | StringFilter;
  hash?: string | StringFilter;
  schemaHash?: string | StringFilter;

  // Boolean field
  readonly?: boolean | BoolFilter;

  // Date fields
  createdAt?: string | Date | DateFilter;
  updatedAt?: string | Date | DateFilter;
  publishedAt?: string | Date | DateFilter;

  // JSON fields
  data?: JsonFilter;
  meta?: JsonFilter;

  // Logical operators
  AND?: WhereConditions[];
  OR?: WhereConditions[];
  NOT?: WhereConditions;
}
```

## ✨ Supported Filters

### StringFilter

- `equals`, `contains`, `startsWith`, `endsWith`
- `in`, `notIn` - array operations
- `lt`, `lte`, `gt`, `gte` - comparison
- `not` - negation
- `search` - full-text search via `plainto_tsquery`
- `mode: 'insensitive'` - case-insensitive operations

### BoolFilter

- `equals`, `not` - boolean operations

### DateFilter

- `equals`, `gt`, `gte`, `lt`, `lte` - date comparison
- `in`, `notIn` - date arrays
- Supports both `string` and `Date` objects

### JsonFilter

- `path: string[]` - JSON path access
- `equals` - exact value match
- `string_contains`, `string_starts_with`, `string_ends_with` - string operations
- `gt`, `gte`, `lt`, `lte` - numeric comparisons
- `in`, `notIn` - value arrays
- `array_contains`, `array_starts_with`, `array_ends_with` - array operations
- `not` - negation
- `mode: 'insensitive'` - case-insensitive string operations

### Logical Operators

- `AND: WhereConditions[]` - all conditions must be true
- `OR: WhereConditions[]` - at least one condition must be true
- `NOT: WhereConditions` - condition must be false
- **Full recursion support** - unlimited nesting depth

## 🚀 Usage

### Basic Example

```typescript
import { generateGetRowsQuery, WhereConditions, RowOrderInput } from './sql-generator';

const conditions: WhereConditions = {
  readonly: false,
  data: {
    path: ['category'],
    equals: 'admin',
  },
};

const orderBy: RowOrderInput[] = [
  { createdAt: 'desc' },
  { id: 'asc' },
];

const { sql, params } = generateGetRowsQuery(
  'table-id',
  10, // limit
  0, // offset
  conditions,
  orderBy, // optional
);

const result = await pgClient.query(sql, params);
```

### Complex Logical Operations

```typescript
const complexConditions: WhereConditions = {
  OR: [
    {
      AND: [
        { readonly: false },
        { data: { path: ['category'], equals: 'admin' } },
        {
          OR: [
            { data: { path: ['age'], gt: 25 } },
            { data: { path: ['score'], gte: 85 } },
          ],
        },
      ],
    },
    {
      NOT: {
        AND: [
          { data: { path: ['category'], equals: 'guest' } },
          { readonly: true },
        ],
      },
    },
  ],
};
```

### JSON Path Filtering

```typescript
// Simple path access
const jsonFilter: WhereConditions = {
  data: {
    path: ['user', 'profile', 'age'],
    gt: 25,
  },
};

// Array operations
const arrayFilter: WhereConditions = {
  data: {
    path: ['categories'],
    in: ['admin', 'moderator'],
  },
};

// Case-insensitive string search
const searchFilter: WhereConditions = {
  data: {
    path: ['name'],
    string_contains: 'john',
    mode: 'insensitive',
  },
};
```

## 📊 ORDER BY Support

### Basic Field Ordering

Sort by any Row table field with `asc` or `desc` direction:

```typescript
const orderBy: RowOrderInput[] = [
  { createdAt: 'desc' },    // Date field
  { id: 'asc' },            // String field
  { readonly: 'asc' },      // Boolean field
  { hash: 'desc' },         // String field
];

const { sql, params } = generateGetRowsQuery(
  'table-id', 10, 0, conditions, orderBy
);
```

**Supported Fields:**
- `versionId`, `createdId`, `id`, `hash`, `schemaHash` (String)
- `readonly` (Boolean)
- `createdAt`, `updatedAt`, `publishedAt` (Date)
- `data`, `meta` (JSON - see JSON Path Ordering)

### JSON Path Ordering

**🚀 Advanced Feature**: Sort by JSON field values using path expressions.

```typescript
const orderBy: RowOrderInput[] = [
  // Simple JSON path
  {
    data: {
      path: "name",           // Simple key access
      direction: 'asc',
      type: 'text'
    }
  },
  
  // Nested JSON path
  {
    data: {
      path: "user.profile.age", // Nested object access
      direction: 'desc',
      type: 'int'
    }
  },
  
  // Array element access
  {
    data: {
      path: "$.tags[0]",      // First array element
      direction: 'asc',
      type: 'text'
    }
  },
  
  // Date field sorting
  {
    data: {
      path: "createdDate",    // JSON date field
      direction: 'desc',
      type: 'timestamp'       // Cast to timestamp
    }
  },
  
  // Array aggregation with wildcard
  {
    data: {
      path: "$.products[*].price",  // All prices in array
      direction: 'desc',
      type: 'float',
      aggregation: 'max'            // MAX(price) among all products
    }
  },
  
  // Date array aggregation
  {
    data: {
      path: "$.events[*].date",     // All event dates in array
      direction: 'desc',
      type: 'timestamp',
      aggregation: 'max'            // Latest date among events
    }
  }
];
```

### JSON Path Types

**Supported `type` values for proper SQL casting:**
- `'text'` - String values
- `'int'` - Integer numbers
- `'float'` - Floating point numbers  
- `'boolean'` - Boolean values
- `'timestamp'` - Date/timestamp values (ISO 8601 strings)

### JSON Path Formats

**Simple paths:**
```typescript
"name"                    // data.name
"category"                // data.category  
"user.name"               // data.user.name
"settings.theme.color"    // data.settings.theme.color
```

**JSONPath syntax:**
```typescript
"$.name"                  // data.name (alternative syntax)
"$.user.profile.age"      // data.user.profile.age
"$.tags[0]"              // data.tags[0] (first element)
"$.tags[-1]"             // data.tags[-1] (last element)
"$.products[*].price"    // All prices in products array
"$.users[*].score"       // All scores in users array
```

### Array Aggregation

For paths with `[*]` wildcard, specify how to aggregate multiple values:

```typescript
{
  data: {
    path: "$.reviews[*].rating",
    direction: 'desc',
    type: 'float',
    aggregation: 'avg'        // Options: 'min', 'max', 'avg', 'first', 'last'
  }
}
```

**Aggregation options:**
- `'min'` - Minimum value in array
- `'max'` - Maximum value in array  
- `'avg'` - Average value in array
- `'first'` - First element (default)
- `'last'` - Last element

### Mixed Ordering

Combine regular fields with JSON path ordering:

```typescript
const orderBy: RowOrderInput[] = [
  { createdAt: 'desc' },              // Regular field
  {
    data: {
      path: "priority",               // JSON field
      direction: 'desc', 
      type: 'int'
    }
  },
  {
    meta: {
      path: "$.scores[*]",           // JSON array aggregation
      direction: 'desc',
      type: 'float',
      aggregation: 'max'
    }
  },
  { id: 'asc' }                      // Regular field
];
```

### Generated SQL Examples

**Regular field ordering:**
```sql
ORDER BY r."createdAt" DESC, r."id" ASC
```

**JSON path ordering:**
```sql
-- Simple path: data.name
ORDER BY (r."data"#>>'{name}')::text ASC

-- Nested path: data.user.age  
ORDER BY (r."data"#>>'{user,age}')::int DESC

-- Timestamp field: data.createdDate
ORDER BY (r."data"#>>'{createdDate}')::timestamp DESC

-- Array aggregation: MAX(data.products[*].price)
ORDER BY (
  SELECT MAX((value#>>'{price}')::float)
  FROM jsonb_array_elements(r."data"#>'{products}') AS value
) DESC

-- Timestamp array aggregation: MAX(data.events[*].date)
ORDER BY (
  SELECT MAX((value#>>'{date}')::timestamp)
  FROM jsonb_array_elements(r."data"#>'{events}') AS value
) DESC

-- Mixed ordering
ORDER BY 
  r."createdAt" DESC,
  (r."data"#>>'{priority}')::int DESC,
  (
    SELECT MAX((value)::float)
    FROM jsonb_array_elements(r."meta"#>'{scores}') AS value
  ) DESC,
  r."id" ASC
```

### Default Ordering

If no `orderBy` is specified, defaults to:
```sql
ORDER BY r."createdAt" DESC
```

## 🛠️ Development

### Adding New Filter Types

1. **Update types** in `types.ts`:

```typescript
export interface NewFilter {
  customOperation?: string;
  // ... other operations
}
```

2. **Add processing logic** in `WhereGenerator.processConditions()`:

```typescript
if (conditions.newField !== undefined) {
  clauses.push(this.processNewField('r."newField"', conditions.newField));
}
```

3. **Implement processor method**:

```typescript
private processNewField(fieldName: string, condition: string | NewFilter): string {
  // Implementation logic
}
```

4. **Add comprehensive tests** in `where-generator.spec.ts`

### Debugging SQL Output

The generator logs SQL and parameters during testing:

```typescript
console.log('Generated SQL:', sql);
console.log('Generated Params:', params);
```

### Performance Guidelines

- SQL generation should remain **< 1ms** for all complexity levels
- Use parameterized queries to prevent SQL injection
- Avoid string concatenation in hot paths
- Test with realistic data volumes (100+ rows)

## 📈 Performance Analysis

### Complexity Levels

| Level   | Average Time | Example                                           |
| ------- | ------------ | ------------------------------------------------- |
| Simple  | 0.0009ms     | `{ readonly: false }`                             |
| Medium  | 0.0026ms     | `{ AND: [{ readonly: false }, { data: {...} }] }` |
| Complex | 0.0079ms     | Deeply nested OR/AND/NOT combinations             |

### Comparison with Prisma

| Metric             | Prisma | Our Generator | Improvement         |
| ------------------ | ------ | ------------- | ------------------- |
| Average Query Time | 5.17ms | 1.99ms        | **2.60x faster**    |
| SQL Generation     | N/A    | 0.0774ms      | Minimal overhead    |
| Memory Usage       | Higher | Lower         | Reduced allocations |

## 🔍 Research Foundation

This implementation is based on analysis of:

1. **Prisma Client source code** - TypeScript query building patterns
2. **Prisma Query Engine** - Rust FilterVisitor implementation
3. **PostgreSQL documentation** - JSON operators and indexing
4. **Performance benchmarking** - Real-world query patterns

### Key Research Files Analyzed

- `packages/client/src/runtime/core/jsonProtocol/` - JSON serialization
- `query-engine/query-builders/sql-query-builder/` - SQL generation
- `query-engine/core/src/query_graph_builder/extractors/filters/` - Filter processing

### Research Repositories

- [Prisma Client](https://github.com/prisma/prisma)
- [Prisma Engines](https://github.com/prisma/prisma-engines)

## 🔧 Advanced Usage

### Custom SQL Integration

```typescript
// Get just the WHERE clause
const whereGenerator = new WhereGenerator(1);
const { sql, params } = whereGenerator.generateWhere(conditions);

// Use in custom query
const customSQL = `
  SELECT custom_fields 
  FROM custom_table 
  WHERE ${sql}
`;
```

### Performance Monitoring

```typescript
import { generateGetRowsQueryWithTiming } from './sql-generator';

const { sql, params, generationTimeMs } = generateGetRowsQueryWithTiming(
  tableId,
  take,
  skip,
  conditions,
);

console.log(`SQL generated in ${generationTimeMs}ms`);
```

## 📋 Version History

### v1.1 (Current)

- ✅ **ORDER BY Support**: Complete sorting functionality for all field types
- ✅ **JSON Path Ordering**: Advanced sorting by JSON field values with path expressions
- ✅ **Array Aggregation**: Sort by aggregated values from JSON arrays (min, max, avg, first, last)
- ✅ **Mixed Ordering**: Combine regular fields with JSON path sorting
- ✅ **96 comprehensive tests**: All ORDER BY functionality validated
- ✅ Complete logical operators (AND/OR/NOT)
- ✅ All filter types (String, Bool, Date, JSON)
- ✅ 2.6x performance improvement over Prisma
- ✅ Full TypeScript type safety

### v1.0

- ✅ WHERE clause generation for all field types
- ✅ JSON path filtering with complex operations
- ✅ Logical operators (AND/OR/NOT) with recursion
- ✅ Performance benchmarking and optimization

---

**Built with ❤️ for high-performance database queries**
