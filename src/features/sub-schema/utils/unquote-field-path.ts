/**
 * Strips jsonpath quoting from a field path produced by getDBJsonPathByJsonSchemaStore.
 * e.g. '"avatar"' → 'avatar', '"media"."thumbnail"' → 'media.thumbnail'
 */
export function unquoteFieldPath(fieldPath: string): string {
  return fieldPath.replaceAll(/"([^"]+)"/g, '$1');
}
