export class CreateProjectCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName?: string;
      fromRevisionId?: string;
    },
  ) {}
}

export type CreateProjectCommandReturnType = string;
