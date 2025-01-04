export class UpdateProjectCommand {
  constructor(
    public data: {
      organizationId: string;
      projectName: string;
      isPublic: boolean;
    },
  ) {}
}
