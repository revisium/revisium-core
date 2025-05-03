import { Prisma, Row } from '@prisma/client';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';

export type AfterCreateRowOptions = {
  revisionId: string;
  tableId: string;
  rowId: string;
  data: Prisma.InputJsonValue;
};

export type AfterUpdateRowOptions = {
  revisionId: string;
  tableId: string;
  rowId: string;
  data: Prisma.InputJsonValue;
};

export type ComputeRowsOptions = {
  revisionId: string;
  tableId: string;
  rows: Row[];
};

export type AfterMigrateRowsOptions = {
  revisionId: string;
  tableId: string;
  rows: Row[];
};

export type InternalAfterCreateRowOptions = AfterCreateRowOptions & {
  schemaStore: JsonSchemaStore;
  valueStore: JsonValueStore;
};

export type InternalAfterUpdateRowOptions = AfterCreateRowOptions & {
  schemaStore: JsonSchemaStore;
  previousValueStore: JsonValueStore;
  valueStore: JsonValueStore;
};

export type InternalComputeRowsOptions = ComputeRowsOptions & {
  schemaStore: JsonSchemaStore;
};

export type InternalAfterMigrateRowsOptions = AfterMigrateRowsOptions & {
  schemaStore: JsonSchemaStore;
};

export interface IPluginService {
  isAvailable: boolean;
  afterCreateRow(options: InternalAfterCreateRowOptions): Promise<void>;
  afterUpdateRow(options: InternalAfterUpdateRowOptions): Promise<void>;
  computeRows(options: InternalComputeRowsOptions): Promise<void>;
  afterMigrateRows(options: InternalAfterMigrateRowsOptions): Promise<void>;
}
