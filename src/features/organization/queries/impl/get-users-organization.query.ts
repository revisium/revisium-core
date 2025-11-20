import { Role, User } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class GetUsersOrganizationQuery {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly first: number;
      after?: string;
    },
  ) {}
}

export type GetUsersOrganizationQueryReturnType = IPaginatedType<{
  id: string;
  user: User;
  role: Role;
}>;
