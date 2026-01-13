import { Row, Table } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';
import {
  SubSchemaWhereInput as PrismaSubSchemaWhereInput,
  SubSchemaOrderByItem as PrismaSubSchemaOrderByItem,
} from '@revisium/prisma-pg-json';

export interface SubSchemaItemResult {
  row: Row;
  table: Table;
  fieldPath: string;
  data: Record<string, unknown>;
}

export type SubSchemaWhereInput = PrismaSubSchemaWhereInput;

export type SubSchemaOrderByInput = PrismaSubSchemaOrderByItem[];

export class GetSubSchemaItemsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly schemaId: string;
      readonly first: number;
      readonly after?: string;
      readonly where?: SubSchemaWhereInput;
      readonly orderBy?: SubSchemaOrderByInput;
    },
  ) {}
}

export type GetSubSchemaItemsQueryData = GetSubSchemaItemsQuery['data'];

export type GetSubSchemaItemsQueryReturnType =
  IPaginatedType<SubSchemaItemResult>;
