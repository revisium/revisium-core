import { UserProject } from 'src/__generated__/client';

export class GetUserProjectQuery {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly projectId: string;
    },
  ) {}
}

export type GetUserProjectQueryData = GetUserProjectQuery['data'];

export type GetUserProjectQueryReturnType = UserProject | null;
