export class UpdateUserProjectRoleCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly userId: string;
      readonly roleId: string;
    },
  ) {}
}

export type UpdateUserProjectRoleCommandReturnType = boolean;
