import { Prisma } from 'src/__generated__/client';

export class GetApiKeyByIdQuery {
  constructor(
    public readonly data: {
      readonly keyId: string;
    },
  ) {}
}

export type GetApiKeyByIdQueryReturnType = Prisma.ApiKeyGetPayload<{
  omit: { keyHash: true };
}>;
