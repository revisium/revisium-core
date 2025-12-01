export class UpdateProjectCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      isPublic: boolean;
    },
  ) {}
}

export type UpdateProjectCommandData = UpdateProjectCommand['data'];

export type UpdateProjectCommandReturnType = boolean;
