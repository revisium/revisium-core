import { User } from 'src/__generated__/client';

export class AdminUserQuery {
  constructor(public readonly data: { readonly userId: string }) {}
}

export type AdminUserQueryData = AdminUserQuery['data'];

export type AdminUserQueryReturnType = Pick<
  User,
  'id' | 'username' | 'email' | 'roleId'
>;
