export class ApiRevertChangesCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName: string;
    },
  ) {}
}
