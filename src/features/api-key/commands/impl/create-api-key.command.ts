import { ApiKeyType, Prisma } from 'src/__generated__/client';

export class CreateApiKeyCommand {
  constructor(
    public readonly data: {
      readonly type: ApiKeyType;
      readonly name: string;
      readonly userId?: string;
      readonly serviceId?: string;
      readonly internalServiceName?: string;
      readonly organizationId?: string;
      readonly projectIds?: string[];
      readonly branchNames?: string[];
      readonly tableIds?: string[];
      readonly permissions?: Prisma.InputJsonValue;
      readonly readOnly?: boolean;
      readonly allowedIps?: string[];
      readonly expiresAt?: Date;
    },
  ) {}
}

export type CreateApiKeyCommandReturnType = {
  id: string;
  key: string;
};
