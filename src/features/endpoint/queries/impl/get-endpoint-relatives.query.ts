import { Branch, Endpoint, Project, Revision } from '@prisma/client';

export class GetEndpointRelativesQuery {
  constructor(public readonly data: { readonly endpointId: string }) {}
}

export type GetEndpointRelativesQueryData = GetEndpointRelativesQuery['data'];

export type GetEndpointRelativesQueryReturnType = {
  endpoint: Endpoint;
  revision: Revision;
  branch: Branch;
  project: Project;
};
