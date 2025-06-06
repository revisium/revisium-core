import { Prisma } from '@prisma/client';

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
