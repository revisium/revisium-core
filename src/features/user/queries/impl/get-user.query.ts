import { User } from '@prisma/client';

export class GetUserQuery {
  constructor(public readonly data: { readonly userId: string }) {}
}

export type GetUserQueryReturnType = Pick<User, 'id' | 'username' | 'email'>;
