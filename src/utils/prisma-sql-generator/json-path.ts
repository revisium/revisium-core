/**
 * JSON Path Parsing Utilities
 *
 * Handles conversion of various JSON path formats to PostgreSQL path arrays
 */

export type JsonValueType = 'text' | 'int' | 'float' | 'boolean' | 'timestamp';
export type JsonAggregation = 'min' | 'max' | 'avg' | 'first' | 'last';

/**
 * Parse JSON path string to PostgreSQL path array
 *
 * Examples:
 * - "name" → ["name"]
 * - "user.age" → ["user", "age"]
 * - "$.users[0].name" → ["users", "0", "name"]
 * - "$.products[*].price" → ["products", "*", "price"]
 */
export function parseJsonPath(path: string): string[] {
  if (typeof path !== 'string') {
    throw new Error('JSON path must be a string');
  }

  // Remove leading $. if present
  const cleanPath = path.startsWith('$.') ? path.substring(2) : path;

  // Handle simple dot notation
  if (!cleanPath.includes('[')) {
    return cleanPath === '' ? [] : cleanPath.split('.');
  }

  // Handle JSONPath with array access
  const parts: string[] = [];
  let current = '';
  let inBracket = false;

  for (let i = 0; i < cleanPath.length; i++) {
    const char = cleanPath[i];

    if (char === '[') {
      if (current) {
        parts.push(current);
        current = '';
      }
      inBracket = true;
    } else if (char === ']') {
      if (current) {
        parts.push(current); // Array index or *
        current = '';
      }
      inBracket = false;
    } else if (char === '.' && !inBracket) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Get SQL type for JSON values with validation
 */
export function getSqlType(type: JsonValueType | string): string {
  switch (type) {
    case 'text':
      return 'text';
    case 'int':
      return 'int';
    case 'float':
      return 'float';
    case 'boolean':
      return 'boolean';
    case 'timestamp':
      return 'timestamp';
    default:
      // Log warning for unknown types in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Unknown JSON type "${type}", defaulting to "text"`);
      }
      return 'text';
  }
}

/**
 * Validate JSON path array
 */
export function validateJsonPath(path: string[]): void {
  if (!Array.isArray(path)) {
    throw new Error('JSON path must be an array');
  }

  if (path.length === 0) {
    throw new Error('JSON path cannot be empty');
  }

  for (const segment of path) {
    if (typeof segment !== 'string') {
      throw new Error('All JSON path segments must be strings');
    }
  }
}

/**
 * Check if JSON path contains array wildcard
 */
export function hasArrayWildcard(path: string | string[]): boolean {
  const pathStr = Array.isArray(path) ? path.join('.') : path;
  return pathStr.includes('[*]') || pathStr.includes('*');
}

/**
 * Build PostgreSQL path parameter for JSON operations
 */
export function buildJsonPathParam(path: string[]): string {
  validateJsonPath(path);
  return `{${path.join(',')}}`;
}

/**
 * Handle array aggregation by modifying path for last element access
 */
export function handleArrayAggregation(
  path: string[],
  aggregation: JsonAggregation,
): string[] {
  const modifiedPath = [...path];

  if (aggregation === 'last') {
    modifiedPath.push('-1'); // PostgreSQL syntax for last element
  } else {
    modifiedPath.push('0'); // Default to first element for other aggregations
  }

  return modifiedPath;
}

/**
 * Find wildcard position in path array
 */
export function findWildcardIndex(path: string[]): number {
  return path.indexOf('*');
}

/**
 * Split path at wildcard for complex aggregation
 */
export function splitPathAtWildcard(path: string[]): {
  beforeStar: string[];
  afterStar: string[];
  starIndex: number;
} {
  const starIndex = findWildcardIndex(path);

  if (starIndex === -1) {
    return {
      beforeStar: path,
      afterStar: [],
      starIndex: -1,
    };
  }

  return {
    beforeStar: path.slice(0, starIndex),
    afterStar: path.slice(starIndex + 1),
    starIndex,
  };
}
