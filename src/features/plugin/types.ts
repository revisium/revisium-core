import { Prisma } from '@prisma/client';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';

export type CreateRowOptions = {
  revisionId: string;
  tableId: string;
  rowId: string;
  data: Prisma.InputJsonValue;
};

export type InternalCreateRowOptions = CreateRowOptions & {
  schemaStore: JsonSchemaStore;
  valueStore: JsonValueStore;
};

export interface IPluginService {
  createRow(options: InternalCreateRowOptions): Promise<void>;
}
