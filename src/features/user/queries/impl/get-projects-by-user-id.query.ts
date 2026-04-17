import { Project } from 'src/__generated__/client';
import { IPaginatedType } from '@revisium/engine';

export class GetProjectsByUserIdQuery {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetProjectsByUserIdQueryData = GetProjectsByUserIdQuery['data'];

export type GetProjectsByUserIdQueryReturnType = IPaginatedType<Project>;
