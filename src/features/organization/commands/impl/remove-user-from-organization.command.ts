export class RemoveUserFromOrganizationCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly userId: string;
    },
  ) {}
}

export type RemoveUserFromOrganizationCommandReturnType = boolean;
