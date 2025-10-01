import { Prisma, Row } from '@prisma/client';
import {
  JsonSchemaStore,
  JsonValueStore,
} from '@revisium/schema-toolkit/model';

export type AfterCreateRowOptions = {
  revisionId: string;
  tableId: string;
  rowId: string;
  data: Prisma.InputJsonValue;
  isRestore?: boolean;
};

export type AfterUpdateRowOptions = {
  revisionId: string;
  tableId: string;
  rowId: string;
  data: Prisma.InputJsonValue;
  isRestore?: boolean;
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
  afterCreateRow(options: InternalAfterCreateRowOptions): Promise<void> | void;
  afterUpdateRow(options: InternalAfterUpdateRowOptions): Promise<void> | void;
  computeRows(options: InternalComputeRowsOptions): Promise<void> | void;
  afterMigrateRows(
    options: InternalAfterMigrateRowsOptions,
  ): Promise<void> | void;
}
