import { Project } from 'src/__generated__/client';

export class GetProjectByIdQuery {
  constructor(
    public data: {
      readonly projectId: string;
    },
  ) {}
}

export type GetProjectByIdQueryData = GetProjectByIdQuery['data'];

export type GetProjectByIdQueryReturnType = Project;
