export class FindProjectIdentityQuery {
  constructor(
    public readonly data: {
      readonly revisionId?: string;
      readonly endpointId?: string;
      readonly projectId?: string;
      readonly organizationId?: string;
      readonly projectName?: string;
    },
  ) {}
}

export type FindProjectIdentityQueryData = FindProjectIdentityQuery['data'];

export type FindProjectIdentityQueryReturnType = {
  organizationId: string;
  projectName: string;
} | null;
