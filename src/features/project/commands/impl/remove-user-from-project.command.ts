export class RemoveUserFromProjectCommand {
  constructor(
    public readonly data: {
      readonly organizationId: string;
      readonly projectName: string;
      readonly userId: string;
    },
  ) {}
}

export type RemoveUserFromProjectCommandData =
  RemoveUserFromProjectCommand['data'];

export type RemoveUserFromProjectCommandReturnType = boolean;
