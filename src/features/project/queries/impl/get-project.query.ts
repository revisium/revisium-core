import { Project } from '@prisma/client';

export class GetProjectQuery {
  constructor(
    public data: {
      readonly organizationId: string;
      readonly projectName: string;
    },
  ) {}
}

export type GetProjectQueryData = GetProjectQuery['data'];

export type GetProjectQueryReturnType = Project;
