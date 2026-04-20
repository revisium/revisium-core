import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { NoopCacheService } from 'src/infrastructure/cache/services/noop-cache.service';
import { CACHE_SERVICE } from 'src/infrastructure/cache/services/cache.tokens';
import { BILLING_CLIENT_TOKEN } from '../billing-client.interface';
import { BillingCallbackController } from '../callback.controller';
import { LimitsService } from '../limits/limits.service';
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
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(BILLING_CLIENT_TOKEN)
      .useValue({ getOrgLimits: jest.fn() })
      .overrideProvider(CACHE_SERVICE)
      .useClass(NoopCacheService)
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string, defaultValue?: string) => {
          if (key === 'PAYMENT_SERVICE_SECRET') return TEST_SECRET;
          return defaultValue;
        },
      })
      .compile();

    controller = module.get(BillingCallbackController);
    limitsService = module.get(LimitsService);
  });

  afterAll(async () => {
    await module.close();
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
