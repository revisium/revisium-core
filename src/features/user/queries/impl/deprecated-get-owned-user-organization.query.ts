import { UserOrganization } from 'src/__generated__/client';

export class DeprecatedGetOwnedUserOrganizationQuery {
  constructor(
    public readonly data: {
      readonly userId: string;
    },
  ) {}
}

export type DeprecatedGetOwnedUserOrganizationQueryData =
  DeprecatedGetOwnedUserOrganizationQuery['data'];

export type DeprecatedGetOwnedUserOrganizationQueryReturnType =
  UserOrganization | null;
