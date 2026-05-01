import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
} from '../billing-client.interface';
import { UsageReporterService } from '../usage-reporter.service';
import { UsageService } from '../usage/usage.service';

describe('UsageReporterService', () => {
  let module: TestingModule;
  let service: UsageReporterService;
  let prisma: PrismaService;
  let mockBillingClient: jest.Mocked<IBillingClient> & { configured: boolean };
  let mockUsageService: jest.Mocked<UsageService>;
  let findManySpy: jest.SpyInstance;

  beforeAll(async () => {
    mockBillingClient = {
      configured: true,
      getOrgLimits: jest.fn(),
      createCheckout: jest.fn(),
      cancelSubscription: jest.fn(),
      getSubscription: jest.fn(),
      getProviders: jest.fn(),
      getPortalUrl: jest.fn(),
      getPlans: jest.fn(),
      getPlan: jest.fn(),
      activateEarlyAccess: jest.fn(),
      reportUsage: jest.fn().mockResolvedValue(undefined),
    };

    mockUsageService = {
      computeUsage: jest.fn().mockResolvedValue(0),
    } as any;

    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        UsageReporterService,
        { provide: UsageService, useValue: mockUsageService },
        { provide: BILLING_CLIENT_TOKEN, useValue: mockBillingClient },
      ],
    }).compile();

    service = module.get(UsageReporterService);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockBillingClient.configured = true;
    mockUsageService.computeUsage.mockResolvedValue(0);
    mockBillingClient.reportUsage.mockResolvedValue(undefined);
    findManySpy = jest.spyOn(prisma.organization, 'findMany');
  });

  afterEach(() => {
    findManySpy.mockRestore();
  });

  it('should report usage for organizations', async () => {
    await service.reportAllUsage();

    expect(mockBillingClient.reportUsage).toHaveBeenCalled();
  });

  it('should continue when reportUsage fails for an org', async () => {
    mockBillingClient.reportUsage
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValue(undefined);

    await expect(service.reportAllUsage()).resolves.not.toThrow();
  });

  it('should pass computed usage values', async () => {
    mockUsageService.computeUsage
      .mockResolvedValueOnce(5000)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(100_000);

    await service.reportAllUsage();

    expect(mockBillingClient.reportUsage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        row_versions: 5000,
        projects: 10,
        seats: 3,
        storage_bytes: 100_000,
      }),
    );
  });

  describe('when billing client is not configured', () => {
    beforeEach(() => {
      mockBillingClient.configured = false;
    });

    it('should no-op without querying organizations or reporting usage', async () => {
      await service.reportAllUsage();

      expect(findManySpy).not.toHaveBeenCalled();
      expect(mockUsageService.computeUsage).not.toHaveBeenCalled();
      expect(mockBillingClient.reportUsage).not.toHaveBeenCalled();
    });
  });
});
