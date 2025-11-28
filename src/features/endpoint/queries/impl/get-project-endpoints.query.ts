import { EndpointType } from 'src/__generated__/client';
import { IPaginatedType } from 'src/features/share/pagination.interface';

export type GetProjectEndpointsData = {
  organizationId: string;
  projectName: string;
  branchId?: string;
  type?: EndpointType;
  first: number;
  after?: string;
};

export type GetProjectEndpointsReturnType = IPaginatedType<{
  id: string;
  createdAt: Date;
  type: EndpointType;
  revisionId: string;
}>;

export class GetProjectEndpointsQuery {
  constructor(public readonly data: GetProjectEndpointsData) {}
}
