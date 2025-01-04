import { UserProjectRoles } from 'src/features/auth/consts';

export class AddUserToProjectCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly userId: string;
      readonly roleId: UserProjectRoles;
    },
  ) {}
}

export type AddUserToProjectCommandReturnType = boolean;
