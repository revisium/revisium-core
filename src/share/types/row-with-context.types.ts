import { Prisma } from '@prisma/client';

export type RowWithContext = Prisma.RowGetPayload<Prisma.RowDefaultArgs> & {
  context: { revisionId: string; tableId: string };
};
