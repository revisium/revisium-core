import { Prisma } from '@prisma/client';

export type GetTablesByRevisionIdReturnType =
  Prisma.TableGetPayload<Prisma.TableDefaultArgs>[];
