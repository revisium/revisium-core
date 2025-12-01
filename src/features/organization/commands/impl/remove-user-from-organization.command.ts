export class RemoveUserFromOrganizationCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly userId: string;
    },
  ) {}
}

export type RemoveUserFromOrganizationCommandData =
  RemoveUserFromOrganizationCommand['data'];

export type RemoveUserFromOrganizationCommandReturnType = boolean;
