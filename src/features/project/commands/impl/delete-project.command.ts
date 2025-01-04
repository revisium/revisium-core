export class DeleteProjectCommand {
  constructor(public data: { organizationId: string; projectName: string }) {}
}
