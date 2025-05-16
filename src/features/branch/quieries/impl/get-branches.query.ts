import { Branch } from '@prisma/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class GetBranchesQuery {
  constructor(
    public data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetBranchesQueryData = GetBranchesQuery['data'];

export type GetBranchesQueryReturnType = IPaginatedType<Branch>;
