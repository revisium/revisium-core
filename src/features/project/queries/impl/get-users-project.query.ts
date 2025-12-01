import { Role, User } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class GetUsersProjectQuery {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly first: number;
      after?: string;
    },
  ) {}
}

export type GetUsersProjectQueryData = GetUsersProjectQuery['data'];

export type GetUsersProjectQueryReturnType = IPaginatedType<{
  id: string;
  user: User;
  role: Role;
}>;
