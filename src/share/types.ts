import { PrismaClient } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';

export type TransactionPrismaClient = Omit<
  PrismaClient,
  runtime.ITXClientDenyList
>;
