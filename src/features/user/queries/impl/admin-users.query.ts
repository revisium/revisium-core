import { User } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class AdminUsersQuery {
  constructor(
    public readonly data: {
      readonly search?: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type AdminUsersQueryData = AdminUsersQuery['data'];

export type AdminUsersQueryReturnType = IPaginatedType<
  Pick<User, 'id' | 'username' | 'email' | 'roleId'>
>;
