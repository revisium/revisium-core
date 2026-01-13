import { JsonSchema } from '@revisium/schema-toolkit/types';
import { SubSchemaPath } from '@revisium/prisma-pg-json';
import {
  createJsonSchemaStore,
  traverseStore,
  getDBJsonPathByJsonSchemaStore,
  pluginRefs,
} from '@revisium/schema-toolkit/lib';

export function findRefPaths(
  schema: JsonSchema,
  schemaId: string,
): SubSchemaPath[] {
  const paths: SubSchemaPath[] = [];
  const store = createJsonSchemaStore(schema, pluginRefs);

  traverseStore(store, (node) => {
    if (node.$ref === schemaId) {
      const dbPath = getDBJsonPathByJsonSchemaStore(node);
      const fieldPath = dbPath.startsWith('$.') ? dbPath.slice(2) : dbPath;
      paths.push({ path: fieldPath });
    }
  });

  return paths;
}
