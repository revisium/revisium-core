import { GetProjectByIdQueryReturnType } from 'src/features/project/queries/impl';

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

export type ApiCreateProjectCommandReturnType = GetProjectByIdQueryReturnType;
