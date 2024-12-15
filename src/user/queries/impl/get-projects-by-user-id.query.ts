import { Project } from '@prisma/client';
import { IPaginatedType } from 'src/share/pagination.interface';

export class GetProjectsByUserIdQuery {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetProjectsByUserIdQueryReturnType = IPaginatedType<Project>;
