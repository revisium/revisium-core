import { Prisma } from '@prisma/client';

export type TableWithContext =
  Prisma.TableGetPayload<Prisma.TableDefaultArgs> & {
    context: { revisionId?: string };
  };
