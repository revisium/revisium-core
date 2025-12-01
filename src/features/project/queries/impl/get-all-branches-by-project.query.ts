import { Branch } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class GetAllBranchesByProjectQuery {
  constructor(
    public data: {
      readonly projectId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetAllBranchesByProjectQueryData =
  GetAllBranchesByProjectQuery['data'];

export type GetAllBranchesByProjectQueryReturnType = IPaginatedType<Branch>;
