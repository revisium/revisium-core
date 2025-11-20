import { Prisma } from 'src/__generated__/client';

export type RowWithContext = Prisma.RowGetPayload<Prisma.RowDefaultArgs> & {
  context: { revisionId: string; tableId: string };
};
