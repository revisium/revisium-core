import { Project } from '@prisma/client';
import { IPaginatedType } from 'src/share/pagination.interface';

export class GetProjectsByOrganizationIdQuery {
  constructor(
    public readonly data: {
      readonly userId?: string;
      readonly organizationId: string;
      readonly first: number;
      readonly after?: string;
    },
  ) {}
}

export type GetProjectsByOrganizationIdQueryReturnType =
  IPaginatedType<Project>;
