import { Prisma } from '@prisma/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';
import { RowWithContext } from 'src/features/share/types/row-with-context.types';

export class GetRowsQuery {
  constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly first: number;
      readonly after?: string;
      readonly orderBy?: Prisma.RowOrderByWithRelationInput[];
      readonly where?: Prisma.RowWhereInput;
    },
  ) {}
}

export type GetRowsQueryData = GetRowsQuery['data'];

export type GetRowsQueryReturnType = IPaginatedType<RowWithContext>;
