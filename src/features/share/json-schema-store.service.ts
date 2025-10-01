import { Injectable } from '@nestjs/common';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
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
import { createJsonSchemaStore } from '@revisium/schema-toolkit/lib';
import { getInvalidFieldNamesInSchema } from '@revisium/schema-toolkit/lib';
import { JsonSchema } from '@revisium/schema-toolkit/types';

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
