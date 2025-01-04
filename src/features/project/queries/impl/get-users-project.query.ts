import { Role, User } from '@prisma/client';
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

export type GetUsersProjectQueryReturnType = IPaginatedType<{
  id: string;
  user: User;
  role: Role;
}>;
