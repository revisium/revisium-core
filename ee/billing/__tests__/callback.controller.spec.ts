import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { CacheService } from 'src/infrastructure/cache/services/cache.service';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { BILLING_CLIENT_TOKEN } from '../billing-client.interface';
import { BillingCacheService } from '../cache/billing-cache.service';
import { BillingCallbackController } from '../callback.controller';
import { LimitsService } from '../limits/limits.service';
import { UsageService } from '../usage/usage.service';
import { signRequest } from '../hmac';

const TEST_SECRET = 'test-callback-secret';

function fakeReq(body: unknown) {
  return { body } as any;
}

describe('BillingCallbackController', () => {
  let module: TestingModule;
  let controller: BillingCallbackController;
  let limitsService: LimitsService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        BillingCallbackController,
        LimitsService,
        BillingCacheService,
        UsageService,
        CacheService,
        { provide: CACHE_SERVICE, useClass: NoopCacheService },
        {
          provide: BILLING_CLIENT_TOKEN,
          useValue: { getOrgLimits: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'PAYMENT_SERVICE_SECRET') return TEST_SECRET;
              throw new Error(`Unknown key: ${key}`);
            },
          },
        },
      ],
    }).compile();

    controller = module.get(BillingCallbackController);
    limitsService = module.get(LimitsService);
  });

  afterAll(async () => {
    const prisma = module.get(PrismaService);
    await prisma.$disconnect();
  });

  it('should invalidate cache on valid callback', async () => {
    const spy = jest.spyOn(limitsService, 'invalidateCache');

    const payload = {
      event: 'subscription.updated',
      organizationId: 'test-org',
      providerId: 'stripe',
    };
    const body = JSON.stringify(payload);
    const { signature, timestamp } = signRequest(TEST_SECRET, body);

    await controller.handleCallback(fakeReq(payload), signature, timestamp);

    expect(spy).toHaveBeenCalledWith('test-org');
  });

  it('should reject invalid signature', async () => {
    const payload = {
      event: 'subscription.updated',
      organizationId: 'test-org',
      providerId: 'stripe',
    };

    await expect(
      controller.handleCallback(
        fakeReq(payload),
        'invalid-sig',
        Date.now().toString(),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject missing signature', async () => {
    const payload = {
      event: 'subscription.updated',
      organizationId: 'test-org',
      providerId: 'stripe',
    };

    await expect(
      controller.handleCallback(fakeReq(payload), '', ''),
    ).rejects.toThrow(UnauthorizedException);
  });
});
