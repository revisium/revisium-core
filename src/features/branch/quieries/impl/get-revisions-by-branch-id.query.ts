import { Prisma } from 'src/__generated__/client';

export class GetRevisionsByBranchIdQuery {
  constructor(
    public data: {
      readonly branchId: string;
      readonly first: number;
      readonly after?: string;
      readonly before?: string;
      readonly inclusive?: boolean;
      readonly sort?: Prisma.SortOrder;
      readonly comment?: string;
    },
  ) {}
}
