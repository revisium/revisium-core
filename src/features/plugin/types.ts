import { Prisma, Row } from '@prisma/client';
import { JsonSchemaStore } from 'src/features/share/utils/schema/model/schema/json-schema.store';
import { JsonValueStore } from 'src/features/share/utils/schema/model/value/json-value.store';

export type CreateRowOptions = {
  revisionId: string;
  tableId: string;
  rowId: string;
  data: Prisma.InputJsonValue;
};

export type UpdateRowOptions = {
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

export type MigrateRowsOptions = {
  revisionId: string;
  tableId: string;
  rows: Row[];
};

export type InternalCreateRowOptions = CreateRowOptions & {
  schemaStore: JsonSchemaStore;
  valueStore: JsonValueStore;
};

export type InternalUpdateRowOptions = CreateRowOptions & {
  schemaStore: JsonSchemaStore;
  previousValueStore: JsonValueStore;
  valueStore: JsonValueStore;
};

export type InternalComputeRowsOptions = ComputeRowsOptions & {
  schemaStore: JsonSchemaStore;
};

export type InternalMigrateRowsOptions = MigrateRowsOptions & {
  schemaStore: JsonSchemaStore;
};

export interface IPluginService {
  createRow(options: InternalCreateRowOptions): Promise<void>;
  updateRow(options: InternalUpdateRowOptions): Promise<void>;
  computeRows(options: InternalComputeRowsOptions): Promise<void>;
  migrateRows(options: InternalComputeRowsOptions): Promise<void>;
}
