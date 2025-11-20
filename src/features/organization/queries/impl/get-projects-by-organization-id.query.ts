import { Project } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

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

export type GetProjectsByOrganizationIdQueryData =
  GetProjectsByOrganizationIdQuery['data'];

export type GetProjectsByOrganizationIdQueryReturnType =
  IPaginatedType<Project>;
