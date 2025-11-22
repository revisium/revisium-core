import { Role } from 'src/__generated__/client';

export class GetRoleQuery {
  constructor(
    public readonly data: {
      readonly roleId: string;
    },
  ) {}
}

export type GetRoleQueryData = GetRoleQuery['data'];

export type GetRoleQueryReturnType = Role;
