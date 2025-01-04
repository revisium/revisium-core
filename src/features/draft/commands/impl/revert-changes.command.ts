export class RevertChangesCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      branchName: string;
    },
  ) {}
}
