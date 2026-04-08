import { Project } from 'src/__generated__/client';

export class GetProjectsByIdsQuery {
  constructor(
    public data: {
      readonly projectIds: string[];
    },
  ) {}
}

export type GetProjectsByIdsQueryData = GetProjectsByIdsQuery['data'];

export type GetProjectsByIdsQueryReturnType = Project[];
