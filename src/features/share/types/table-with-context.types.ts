import { Prisma } from 'src/__generated__/client';

export type TableWithContext =
  Prisma.TableGetPayload<Prisma.TableDefaultArgs> & {
    context: { revisionId?: string };
  };
