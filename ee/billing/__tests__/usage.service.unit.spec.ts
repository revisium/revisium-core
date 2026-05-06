import { EngineApiService } from '@revisium/engine';
import { LimitMetric } from 'src/features/billing/limits.interface';
import { SYSTEM_TABLE_PREFIX } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { UsageService } from '../usage/usage.service';

type DbStub = {
  table: { count: jest.Mock; findFirst: jest.Mock };
  revision: { findUnique: jest.Mock };
  branch: { count: jest.Mock };
  endpoint: { count: jest.Mock };
};

const makeService = () => {
  const db: DbStub = {
    table: { count: jest.fn(), findFirst: jest.fn() },
    revision: { findUnique: jest.fn() },
    branch: { count: jest.fn() },
    endpoint: { count: jest.fn() },
  };

  const transactionService = {
    getTransactionOrPrisma: jest.fn().mockReturnValue(db),
  } as unknown as TransactionPrismaService;

  const prisma = {} as PrismaService;
  const engine = {} as EngineApiService;

  const service = new UsageService(prisma, transactionService, engine);
  return { service, db };
};

describe('UsageService (unit)', () => {
  describe('computeUsage validation', () => {
    it('throws when ROWS_PER_TABLE is called without context', async () => {
      const { service } = makeService();

      await expect(
        service.computeUsage('org-1', LimitMetric.ROWS_PER_TABLE),
      ).rejects.toThrow('ROWS_PER_TABLE requires revisionId and tableId');
    });

    it('throws when ROWS_PER_TABLE has only revisionId', async () => {
      const { service } = makeService();

      await expect(
        service.computeUsage('org-1', LimitMetric.ROWS_PER_TABLE, {
          revisionId: 'rev-1',
        }),
      ).rejects.toThrow('ROWS_PER_TABLE requires revisionId and tableId');
    });

    it('throws when TABLES_PER_REVISION is called without revisionId', async () => {
      const { service } = makeService();

      await expect(
        service.computeUsage('org-1', LimitMetric.TABLES_PER_REVISION),
      ).rejects.toThrow('TABLES_PER_REVISION requires revisionId');
    });

    it('throws when BRANCHES_PER_PROJECT is called without projectId', async () => {
      const { service } = makeService();

      await expect(
        service.computeUsage('org-1', LimitMetric.BRANCHES_PER_PROJECT),
      ).rejects.toThrow('BRANCHES_PER_PROJECT requires projectId');
    });

    it('throws when ENDPOINTS_PER_PROJECT is called without projectId', async () => {
      const { service } = makeService();

      await expect(
        service.computeUsage('org-1', LimitMetric.ENDPOINTS_PER_PROJECT),
      ).rejects.toThrow('ENDPOINTS_PER_PROJECT requires projectId');
    });

    it('throws on an unknown metric (default exhaustive case)', async () => {
      const { service } = makeService();

      await expect(
        service.computeUsage(
          'org-1',
          'UNKNOWN_METRIC' as unknown as LimitMetric,
        ),
      ).rejects.toThrow(/Unknown limit metric/);
    });
  });

  describe('computeUsage success paths that hit the optional-chaining fallbacks', () => {
    it('ROWS_PER_TABLE returns 0 when the table is not found', async () => {
      const { service, db } = makeService();
      db.table.findFirst.mockResolvedValue(null);

      const result = await service.computeUsage(
        'org-1',
        LimitMetric.ROWS_PER_TABLE,
        { revisionId: 'rev-1', tableId: 'table-1' },
      );

      expect(result).toBe(0);
      expect(db.table.findFirst).toHaveBeenCalledTimes(1);
    });

    it('ROWS_PER_TABLE returns the row count when the table exists', async () => {
      const { service, db } = makeService();
      db.table.findFirst.mockResolvedValue({ _count: { rows: 7 } });

      const result = await service.computeUsage(
        'org-1',
        LimitMetric.ROWS_PER_TABLE,
        { revisionId: 'rev-1', tableId: 'table-1' },
      );

      expect(result).toBe(7);
    });

    it('TABLES_PER_REVISION returns 0 when no user tables are linked', async () => {
      const { service, db } = makeService();
      db.table.count.mockResolvedValue(0);

      const result = await service.computeUsage(
        'org-1',
        LimitMetric.TABLES_PER_REVISION,
        { revisionId: 'rev-1' },
      );

      expect(result).toBe(0);
    });

    it('TABLES_PER_REVISION returns the table count for the requested revision', async () => {
      const { service, db } = makeService();
      db.table.count.mockResolvedValue(4);

      const result = await service.computeUsage(
        'org-1',
        LimitMetric.TABLES_PER_REVISION,
        { revisionId: 'rev-1' },
      );

      expect(result).toBe(4);
      expect(db.table.count).toHaveBeenCalledWith({
        where: {
          revisions: { some: { id: 'rev-1' } },
          NOT: { id: { startsWith: SYSTEM_TABLE_PREFIX } },
        },
      });
    });

    it('BRANCHES_PER_PROJECT delegates to branch.count', async () => {
      const { service, db } = makeService();
      db.branch.count.mockResolvedValue(3);

      const result = await service.computeUsage(
        'org-1',
        LimitMetric.BRANCHES_PER_PROJECT,
        { projectId: 'proj-1' },
      );

      expect(result).toBe(3);
      expect(db.branch.count).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });
  });
});
