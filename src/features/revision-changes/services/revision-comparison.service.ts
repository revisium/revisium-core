import { Injectable } from '@nestjs/common';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { Prisma } from 'src/__generated__/client';

@Injectable()
export class RevisionComparisonService {
  constructor(private readonly transactionService: TransactionPrismaService) {}

  private get prisma() {
    return this.transactionService.getTransactionOrPrisma();
  }

  async getCompareRevisionId(
    revisionId: string,
    compareWithRevisionId?: string,
  ): Promise<string | null> {
    if (compareWithRevisionId) {
      return compareWithRevisionId;
    }

    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      select: { parentId: true },
    });

    return revision?.parentId ?? null;
  }

  async getParentRevisionId(revisionId: string): Promise<string | null> {
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      select: { parentId: true },
    });

    return revision?.parentId ?? null;
  }

  async getMigrationsForTable(
    revisionId: string,
    tableCreatedId: string,
  ): Promise<Prisma.JsonValue[]> {
    const migrationRows = await this.prisma.row.findMany({
      where: {
        tables: {
          some: {
            id: 'migration',
            revisions: {
              some: {
                id: revisionId,
              },
            },
          },
        },
        data: {
          path: ['tableId'],
          equals: tableCreatedId,
        },
      },
      select: {
        data: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    return migrationRows.map((row) => row.data);
  }
}
