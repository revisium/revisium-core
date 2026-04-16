import { UsageService } from '../usage/usage.service';

describe('UsageService unit', () => {
  const createService = () => {
    const prisma = {};
    const transactionService = {
      getTransactionOrPrisma: jest.fn().mockReturnValue(prisma),
    };

    return {
      prisma,
      transactionService,
      service: new UsageService(prisma as never, transactionService as never),
    };
  };

  it('builds organization usage summary without project-scoped endpoint metrics', async () => {
    const { service } = createService();

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
      }),
    ).resolves.toEqual({
      rowVersions: { current: 12, limit: 20, percentage: 60 },
      projects: { current: 3, limit: 5, percentage: 60 },
      seats: { current: 2, limit: 5, percentage: 40 },
      storageBytes: { current: 0, limit: null, percentage: null },
    });
  });
});
