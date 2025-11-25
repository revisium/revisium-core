import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/__generated__/client';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

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

  async getMigrationsForTableBetweenRevisions(
    fromRevisionId: string,
    toRevisionId: string,
    tableCreatedId: string,
  ): Promise<Prisma.JsonValue[]> {
    const toMigrations = await this.getMigrationsForTable(
      toRevisionId,
      tableCreatedId,
    );

    const fromMigrations = await this.getMigrationsForTable(
      fromRevisionId,
      tableCreatedId,
    );

    const fromMigrationIds = new Set(fromMigrations.map((m: any) => m.id));

    return toMigrations.filter((m: any) => !fromMigrationIds.has(m.id));
  }
}
