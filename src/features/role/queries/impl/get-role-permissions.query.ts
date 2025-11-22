import { Permission } from 'src/__generated__/client';

export class GetRolePermissionsQuery {
  constructor(
    public readonly data: {
      readonly roleId: string;
    },
  ) {}
}

export type GetRolePermissionsQueryData = GetRolePermissionsQuery['data'];

export type GetRolePermissionsQueryReturnType = Permission[];
