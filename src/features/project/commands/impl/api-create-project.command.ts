export class ApiCreateProjectCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName?: string;
      fromRevisionId?: string;
    },
  ) {}
}
