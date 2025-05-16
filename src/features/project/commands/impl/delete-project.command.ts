export class DeleteProjectCommand {
  constructor(public data: { organizationId: string; projectName: string }) {}
}

export type DeleteProjectCommandData = DeleteProjectCommand['data'];

export type DeleteProjectCommandReturnType = boolean;
