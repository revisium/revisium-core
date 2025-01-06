import { Project } from '@prisma/client';

export class GetProjectByIdQuery {
  constructor(
    public data: {
      readonly projectId: string;
    },
  ) {}
}

export type GetProjectByIdQueryReturnType = Project;
