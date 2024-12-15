import { Role, User } from '@prisma/client';
import { IPaginatedType } from 'src/share/pagination.interface';

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
