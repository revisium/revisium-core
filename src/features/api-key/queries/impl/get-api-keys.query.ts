import { ApiKeyType, Prisma } from 'src/__generated__/client';

export class GetApiKeysQuery {
  constructor(
    public readonly data: {
      readonly userId?: string;
      readonly type?: ApiKeyType;
    },
  ) {}
}

export type GetApiKeysQueryReturnType = Array<
  Prisma.ApiKeyGetPayload<{
    omit: { keyHash: true; userId: true; lastUsedIp: true };
  }>
>;
