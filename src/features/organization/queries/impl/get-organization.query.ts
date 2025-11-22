import { Organization } from 'src/__generated__/client';

export class GetOrganizationQuery {
  constructor(
    public readonly data: {
      readonly organizationId: string;
    },
  ) {}
}

export type GetOrganizationQueryData = GetOrganizationQuery['data'];

export type GetOrganizationQueryReturnType = Organization;
