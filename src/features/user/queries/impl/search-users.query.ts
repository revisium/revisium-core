import { User } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export class SearchUsersQuery {
  constructor(
    public readonly data: {
      readonly search?: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type SearchUsersQueryReturnType = IPaginatedType<
  Pick<User, 'id' | 'username' | 'email'>
>;
