import { Prisma } from '@prisma/client';

export class GetRowsByTableQuery {
  constructor(
    public data: {
      readonly revisionId: string;
      readonly tableId: string;
      readonly tableVersionId: string;
      readonly first: number;
      readonly after?: string;
      readonly orderBy?: Prisma.RowOrderByWithRelationInput[];
    },
  ) {}
}
