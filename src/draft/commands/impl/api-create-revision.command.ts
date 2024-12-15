export class ApiCreateRevisionCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName: string;
      comment?: string;
    },
  ) {}
}
