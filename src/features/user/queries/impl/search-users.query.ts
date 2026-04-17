import { User } from 'src/__generated__/client';
import { IPaginatedType } from '@revisium/engine';

export class SearchUsersQuery {
  constructor(
    public readonly data: {
      readonly search?: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type SearchUsersQueryData = SearchUsersQuery['data'];

export type SearchUsersQueryReturnType = IPaginatedType<
  Pick<User, 'id' | 'username' | 'email'>
>;
