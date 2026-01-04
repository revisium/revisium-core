import { User } from 'src/__generated__/client';

export class GetUserQuery {
  constructor(public readonly data: { readonly userId: string }) {}
}

export type GetUserQueryData = GetUserQuery['data'];

export type GetUserQueryReturnType = Pick<
  User,
  'id' | 'username' | 'email' | 'roleId'
> & { hasPassword: boolean };
