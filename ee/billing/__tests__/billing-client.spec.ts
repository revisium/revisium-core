import { ConfigService } from '@nestjs/config';
import { BillingClient } from '../billing-client';

const BASE_URL = 'http://mock-payment:8082';
const SECRET = 'test-secret';

function createClient() {
  const configService = {
    getOrThrow: (key: string) => {
      if (key === 'PAYMENT_SERVICE_URL') return BASE_URL;
      if (key === 'PAYMENT_SERVICE_SECRET') return SECRET;
      throw new Error(`Unknown: ${key}`);
    },
  } as ConfigService;
  return new BillingClient(configService);
}

describe('BillingClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockFetch = (status: number, body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };

  const mockFetchEmpty = (status: number) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(null),
      text: () => Promise.resolve(''),
    });
  };

  it('getOrgLimits should call GET /orgs/:orgId/limits', async () => {
    const limits = {
      planId: 'pro',
      status: 'active',
      limits: {
        row_versions: 500_000,
        projects: 20,
        seats: 10,
        storage_bytes: null,
        api_calls_per_day: null,
      },
    };
    mockFetch(200, limits);
    const client = createClient();

    const result = await client.getOrgLimits('org-1');

    expect(result).toEqual(limits);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/orgs/org-1/limits`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Signature': expect.any(String),
          'X-Timestamp': expect.any(String),
        }),
      }),
    );
  });

  it('getSubscription should return null on 404', async () => {
    mockFetch(404, { message: 'Not found' });
    const client = createClient();

    const result = await client.getSubscription('org-none');

    expect(result).toBeNull();
  });

  it('getSubscription should return data on 200', async () => {
    const sub = {
      planId: 'pro',
      status: 'active',
      provider: 'stripe',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
    };
    mockFetch(200, sub);
    const client = createClient();

    const result = await client.getSubscription('org-1');

    expect(result).toEqual(sub);
  });

  it('getPlans should unwrap plans array', async () => {
    const plans = [
      { id: 'free', name: 'Free' },
      { id: 'pro', name: 'Pro' },
    ];
    mockFetch(200, { plans });
    const client = createClient();

    const result = await client.getPlans();

    expect(result).toEqual(plans);
  });

  it('getPlan should return null on 404', async () => {
    mockFetch(404, { message: 'Not found' });
    const client = createClient();

    const result = await client.getPlan('nonexistent');

    expect(result).toBeNull();
  });

  it('getProviders should unwrap providers array', async () => {
    const providers = [
      {
        id: 'stripe',
        name: 'Stripe',
        methods: ['card'],
        supportsRecurring: true,
      },
    ];
    mockFetch(200, { providers });
    const client = createClient();

    const result = await client.getProviders({ country: 'US' });

    expect(result).toEqual(providers);
  });

  it('createCheckout should POST and return result', async () => {
    mockFetch(200, { checkoutUrl: 'https://stripe.com/pay' });
    const client = createClient();

    const result = await client.createCheckout({
      organizationId: 'org-1',
      planId: 'pro',
      successUrl: 'https://x.com/ok',
      cancelUrl: 'https://x.com/cancel',
    });

    expect(result.checkoutUrl).toBe('https://stripe.com/pay');
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/checkout`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('cancelSubscription should POST', async () => {
    mockFetchEmpty(200);
    const client = createClient();

    await expect(client.cancelSubscription('org-1')).resolves.not.toThrow();
  });

  it('activateEarlyAccess should POST and return result', async () => {
    mockFetch(200, { status: 'early_adopter', planId: 'pro' });
    const client = createClient();

    const result = await client.activateEarlyAccess('org-1', 'pro');

    expect(result).toEqual({ status: 'early_adopter', planId: 'pro' });
  });

  it('reportUsage should POST', async () => {
    mockFetchEmpty(200);
    const client = createClient();

    await expect(
      client.reportUsage('org-1', {
        row_versions: 100,
        projects: 1,
        seats: 1,
        storage_bytes: 0,
      }),
    ).resolves.not.toThrow();
  });

  it('should throw on non-ok GET response', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = createClient();

    await expect(client.getOrgLimits('org-1')).rejects.toThrow(
      'GET /orgs/org-1/limits failed: 500',
    );
  });

  it('should throw on non-ok POST response', async () => {
    mockFetch(400, { message: 'Bad request' });
    const client = createClient();

    await expect(
      client.createCheckout({
        organizationId: 'org-1',
        planId: 'bad',
        successUrl: 'x',
        cancelUrl: 'y',
      }),
    ).rejects.toThrow('POST /checkout failed: 400');
  });

  it('getPortalUrl should pass query params', async () => {
    mockFetch(200, { url: 'https://portal.stripe.com' });
    const client = createClient();

    const result = await client.getPortalUrl(
      'org-1',
      'https://app.com/billing',
    );

    expect(result.url).toBe('https://portal.stripe.com');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('organizationId=org-1'),
      expect.any(Object),
    );
  });
});
