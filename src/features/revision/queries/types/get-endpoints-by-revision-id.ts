import { Prisma } from '@prisma/client';

export type GetEndpointsByRevisionId =
  Prisma.EndpointGetPayload<Prisma.EndpointDeleteArgs>[];
