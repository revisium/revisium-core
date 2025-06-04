import { Injectable } from '@nestjs/common';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import {
  fileSchema,
  rowCreatedAtSchema,
  rowCreatedIdSchema,
  rowHashSchema,
  rowIdSchema,
  rowPublishedAtSchema,
  rowSchemaHashSchema,
  rowUpdatedAtSchema,
  rowVersionIdSchema,
} from 'src/features/share/schema/plugins';
import { createJsonSchemaStore } from 'src/features/share/utils/schema/lib/createJsonSchemaStore';
import { getInvalidFieldNamesInSchema } from 'src/features/share/utils/schema/lib/getInvalidFieldNamesInSchema';
import { JsonSchema } from 'src/features/share/utils/schema/types/schema.types';

@Injectable()
export class JsonSchemaStoreService {
  public readonly refs: Readonly<Record<string, JsonSchema>> = {
    [SystemSchemaIds.RowId]: rowIdSchema,
    [SystemSchemaIds.RowCreatedId]: rowCreatedIdSchema,
    [SystemSchemaIds.RowVersionId]: rowVersionIdSchema,
    [SystemSchemaIds.RowCreatedAt]: rowCreatedAtSchema,
    [SystemSchemaIds.RowPublishedAt]: rowPublishedAtSchema,
    [SystemSchemaIds.RowUpdatedAt]: rowUpdatedAtSchema,
    [SystemSchemaIds.RowHash]: rowHashSchema,
    [SystemSchemaIds.RowSchemaHash]: rowSchemaHashSchema,
    [SystemSchemaIds.File]: fileSchema,
  };

  constructor() {}

  public create(schema: JsonSchema) {
    return createJsonSchemaStore(schema, this.refs);
  }

  public getInvalidFieldNamesInSchema(schema: JsonSchema) {
    return getInvalidFieldNamesInSchema(schema, this.refs);
  }
}
