import { UserOrganizationRoles } from 'src/features/auth/consts';

export class AddUserToOrganizationCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly userId: string;
      readonly roleId: UserOrganizationRoles;
    },
  ) {}
}

export type AddUserToOrganizationCommandReturnType = boolean;
