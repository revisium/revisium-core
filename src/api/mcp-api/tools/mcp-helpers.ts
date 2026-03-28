/**
 * Strips internal fields from row objects for compact MCP responses.
 * Keeps only: id, data, readonly, createdAt, updatedAt, formulaErrors.
 */
export function compactRow(row: Record<string, unknown>) {
  const compact: Record<string, unknown> = {
    id: row.id,
    data: row.data,
  };
  if (
    row.formulaErrors &&
    Array.isArray(row.formulaErrors) &&
    row.formulaErrors.length > 0
  ) {
    compact.formulaErrors = row.formulaErrors;
  }
  return compact;
}

/**
 * Applies compactRow to paginated edges result.
 */
export function compactRowEdges(result: {
  edges: { cursor: string; node: Record<string, unknown> }[];
  pageInfo: unknown;
  totalCount: number;
}) {
  return {
    ...result,
    edges: result.edges.map((edge) => ({
      cursor: edge.cursor,
      node: compactRow(edge.node),
    })),
  };
}

/**
 * Auto-fills default values for formula (x-formula) fields in row data.
 * Agents don't need to manually pass "total": 0 for computed fields.
 */
export function fillFormulaDefaults(
  schema: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!properties) return data;

  const filled = { ...data };

  for (const [key, fieldSchema] of Object.entries(properties)) {
    if (!fieldSchema || typeof fieldSchema !== 'object') continue;

    const hasFormula = 'x-formula' in fieldSchema;

    if (hasFormula && !(key in filled) && 'default' in fieldSchema) {
      filled[key] = fieldSchema.default;
      continue;
    }

    // Recurse into nested objects
    if (
      fieldSchema.type === 'object' &&
      key in filled &&
      filled[key] &&
      typeof filled[key] === 'object' &&
      !Array.isArray(filled[key])
    ) {
      filled[key] = fillFormulaDefaults(
        fieldSchema,
        filled[key] as Record<string, unknown>,
      );
    }

    // Recurse into array items (objects only)
    if (
      fieldSchema.type === 'array' &&
      key in filled &&
      Array.isArray(filled[key]) &&
      fieldSchema.items &&
      typeof fieldSchema.items === 'object' &&
      (fieldSchema.items as Record<string, unknown>).type === 'object'
    ) {
      filled[key] = (filled[key] as unknown[]).map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? fillFormulaDefaults(
              fieldSchema.items as Record<string, unknown>,
              item as Record<string, unknown>,
            )
          : item,
      );
    }
  }

  return filled;
}
