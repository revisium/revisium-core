import { UsageService } from '../usage/usage.service';

describe('UsageService unit', () => {
  const createService = () => {
    const prisma = {
      $queryRaw: jest.fn(),
    };
    const transactionService = {
      getTransactionOrPrisma: jest.fn().mockReturnValue(prisma),
    };

    return {
      prisma,
      transactionService,
      service: new UsageService(prisma as never, transactionService as never),
    };
  };

  it('converts bigint max endpoint counts in usage summary', async () => {
    const { prisma, service } = createService();

    prisma.$queryRaw.mockResolvedValue([{ maxCount: 7n }]);
    jest
      .spyOn(service, 'computeUsage')
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    await expect(
      service.computeUsageSummary('org-1', {
        row_versions: 20,
        projects: 5,
        seats: 5,
        storage_bytes: null,
        endpoints_per_project: 10,
      }),
    ).resolves.toEqual({
      rowVersions: { current: 12, limit: 20, percentage: 60 },
      projects: { current: 3, limit: 5, percentage: 60 },
      seats: { current: 2, limit: 5, percentage: 40 },
      storageBytes: { current: 0, limit: null, percentage: null },
      endpointsPerProject: { current: 7, limit: 10, percentage: 70 },
    });
  });

  it('falls back to zero max endpoint count when aggregation returns no rows', async () => {
    const { prisma, service } = createService();

    prisma.$queryRaw.mockResolvedValue([]);
    jest
      .spyOn(service, 'computeUsage')
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(service.computeUsageSummary('org-1')).resolves.toEqual({
      rowVersions: { current: 0, limit: null, percentage: null },
      projects: { current: 0, limit: null, percentage: null },
      seats: { current: 0, limit: null, percentage: null },
      storageBytes: { current: 0, limit: null, percentage: null },
      endpointsPerProject: { current: 0, limit: null, percentage: null },
    });
  });
});
