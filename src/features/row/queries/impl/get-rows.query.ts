import { Prisma } from '@prisma/client';
import {
  JsonValueType,
  JsonAggregation,
  OrderByConditions,
} from '@revisium/prisma-pg-json';
import { IPaginatedType } from 'src/features/share/pagination.interface';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export type JsonOrder = {
  data: {
    path: string;
    direction: 'asc' | 'desc';
    type: JsonValueType;
    aggregation?: JsonAggregation;
  };
};

export class GetRowsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly first: number;
      readonly after?: string;
      readonly orderBy?: OrderByConditions[];
      readonly where?: Prisma.RowWhereInput;
    },
  ) {}
}

export type GetRowsQueryData = GetRowsQuery['data'];

export type GetRowsQueryReturnType = IPaginatedType<RowWithContext>;
