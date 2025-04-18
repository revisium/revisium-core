import { Injectable } from '@nestjs/common';
import { SchemaIds } from 'src/features/share/schema-ids.consts';
import { fileSchema } from 'src/features/share/schema/plugins/file-schema';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getInvalidFieldNamesInSchema } from 'src/features/share/utils/schema/lib/getInvalidFieldNamesInSchema';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@Injectable()
export class JsonSchemaStoreService {
  public readonly refs: Readonly<Record<string, JsonSchema>> = {
    [SchemaIds.File]: fileSchema,
  };

  constructor() {}

  public create(schema: JsonSchema) {
    return createJsonSchemaStore(schema, this.refs);
  }

  public getInvalidFieldNamesInSchema(schema: JsonSchema) {
    return getInvalidFieldNamesInSchema(schema);
  }
}
