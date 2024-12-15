export class CreateRevisionCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName: string;
      comment?: string;
    },
  ) {}
}
