import { UserOrganization } from 'src/__generated__/client';

export class GetUserOrganizationQuery {
  constructor(
    public readonly data: {
      readonly userId: string;
      readonly organizationId: string;
    },
  ) {}
}

export type GetUserOrganizationQueryData = GetUserOrganizationQuery['data'];

export type GetUserOrganizationQueryReturnType = UserOrganization | null;
