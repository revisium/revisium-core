import { Injectable } from '@nestjs/common';
import { SchemaIds } from 'src/features/share/schema-ids.consts';
import { fileSchema } from 'src/features/share/schema/plugins/file-schema';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@Injectable()
export class SchemaStoreService {
  private refs: Record<string, JsonSchema> = {};

  constructor() {
    this.init();
  }

  public create(schema: JsonSchema) {
    return createJsonSchemaStore(schema, this.refs);
  }

  private init() {
    this.refs[SchemaIds.File] = fileSchema;
  }
}
