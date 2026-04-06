import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { hashedPassword } from 'src/__tests__/utils/prepareProject';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
} from '../billing-client.interface';

const mockBillingClient: jest.Mocked<IBillingClient> = {
  configured: true,
  getOrgLimits: jest.fn().mockResolvedValue({
    planId: 'free',
    status: 'free',
    limits: {
      row_versions: 10_000,
      projects: 3,
      seats: 1,
      storage_bytes: 500_000_000,
      api_calls_per_day: 1_000,
      rows_per_table: 1_000,
      tables_per_revision: 10,
      branches_per_project: 3,
    },
  }),
  createCheckout: jest.fn(),
  cancelSubscription: jest.fn(),
  getSubscription: jest.fn().mockResolvedValue(null),
  getProviders: jest.fn().mockResolvedValue([]),
  getPortalUrl: jest.fn(),
  getPlans: jest.fn().mockResolvedValue([
    {
      id: 'free',
      name: 'Free',
      isPublic: true,
      monthlyPriceUsd: 0,
      yearlyPriceUsd: 0,
      limits: {
        row_versions: 10_000,
        projects: 3,
        seats: 1,
        storage_bytes: 500_000_000,
        api_calls_per_day: 1_000,
        rows_per_table: 1_000,
        tables_per_revision: 10,
        branches_per_project: 3,
      },
      features: {},
    },
    {
      id: 'pro',
      name: 'Pro',
      isPublic: true,
      monthlyPriceUsd: 29,
      yearlyPriceUsd: 290,
      limits: {
        row_versions: 500_000,
        projects: 20,
        seats: 10,
        storage_bytes: 10_000_000_000,
        api_calls_per_day: 50_000,
        rows_per_table: 10_000,
        tables_per_revision: 100,
        branches_per_project: 20,
      },
      features: { sso: true, audit: true },
    },
  ]),
  getPlan: jest.fn(),
  activateEarlyAccess: jest.fn(),
  reportUsage: jest.fn(),
};

describe('Billing REST API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    registerGraphqlEnums();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(BILLING_CLIENT_TOKEN)
      .useValue(mockBillingClient)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  const createOrgWithOwner = async () => {
    const orgId = nanoid();
    const userId = nanoid();

    await prisma.organization.create({
      data: { id: orgId, createdId: nanoid() },
    });
    const user = await prisma.user.create({
      data: {
        id: userId,
        username: `user-${userId}`,
        password: hashedPassword,
        isEmailConfirmed: true,
        roleId: 'systemUser',
        userOrganizations: {
          create: {
            id: nanoid(),
            organizationId: orgId,
            roleId: 'organizationOwner',
          },
        },
      },
    });
    const token = authService.login({
      username: user.username!,
      sub: user.id,
    });

    return { orgId, userId, token };
  };

  describe('GET /billing/plans', () => {
    it('should return plans without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/billing/plans')
        .expect(200);

      expect(res.body.plans).toBeDefined();
      expect(res.body.plans.length).toBeGreaterThan(0);
      expect(res.body.plans[0]).toHaveProperty('id');
      expect(res.body.plans[0]).toHaveProperty('name');
    });
  });

  describe('GET /billing/:orgId/subscription', () => {
    it('should return null when no subscription', async () => {
      mockBillingClient.getSubscription.mockResolvedValueOnce(null);
      const { orgId, token } = await createOrgWithOwner();
      const res = await request(app.getHttpServer())
        .get(`/api/billing/${orgId}/subscription`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body === null || res.text === '' || res.text === 'null').toBe(
        true,
      );
    });

    it('should return subscription when exists', async () => {
      const { orgId, token } = await createOrgWithOwner();
      mockBillingClient.getSubscription.mockResolvedValueOnce({
        planId: 'pro',
        status: 'early_adopter',
        provider: null,
        interval: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAt: null,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/billing/${orgId}/subscription`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.planId).toBe('pro');
      expect(res.body.status).toBe('early_adopter');
    });
  });

  describe('GET /billing/:orgId/usage', () => {
    it('should return usage summary', async () => {
      mockBillingClient.getSubscription.mockResolvedValue(null);
      mockBillingClient.getPlan.mockResolvedValue(null);
      const { orgId, token } = await createOrgWithOwner();
      const res = await request(app.getHttpServer())
        .get(`/api/billing/${orgId}/usage`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.rowVersions).toHaveProperty('current');
      expect(res.body.rowVersions).toHaveProperty('limit');
      expect(res.body.rowVersions).toHaveProperty('percentage');
      expect(res.body.projects).toBeDefined();
      expect(res.body.seats).toBeDefined();
      expect(res.body.storageBytes).toBeDefined();
    });
  });

  describe('GraphQL: plans query', () => {
    it('should return plans', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `{ plans { id name monthlyPriceUsd } }`,
        })
        .expect(200);

      expect(res.body.data.plans.length).toBeGreaterThan(0);
      expect(res.body.data.plans[0].id).toBeDefined();
    });
  });

});
