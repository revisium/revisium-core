import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { EndpointType } from 'src/__generated__/client';
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
      endpoints_per_project: 2,
    },
  }),
  createCheckout: jest.fn().mockResolvedValue({
    checkoutUrl: 'https://checkout.example.com/session123',
  }),
  cancelSubscription: jest.fn().mockResolvedValue(undefined),
  getSubscription: jest.fn().mockResolvedValue(null),
  getProviders: jest.fn().mockResolvedValue([
    {
      id: 'stripe',
      name: 'Stripe',
      methods: ['card'],
      supportsRecurring: true,
    },
  ]),
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
        endpoints_per_project: 2,
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
        endpoints_per_project: 10,
      },
      features: { sso: true, audit: true },
    },
  ]),
  getPlan: jest.fn().mockImplementation((planId: string) => {
    if (planId === 'pro') {
      return Promise.resolve({
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
          endpoints_per_project: 10,
        },
        features: { sso: true, audit: true },
      });
    }
    return Promise.resolve(null);
  }),
  activateEarlyAccess: jest.fn().mockResolvedValue({
    status: 'early_adopter',
    planId: 'pro',
  }),
  reportUsage: jest.fn(),
};

describe('Billing GraphQL API (e2e)', () => {
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

  const createEndpointVersion = async (type: EndpointType) => {
    const created = await prisma.endpointVersion.upsert({
      where: { type_version: { type, version: 1 } },
      update: {},
      create: {
        id: nanoid(),
        type,
        version: 1,
      },
    });

    return created.id;
  };

  const createProjectWithEndpoints = async (organizationId: string) => {
    const projectId = nanoid();
    const projectName = `project-${projectId}`;
    const branchId = nanoid();
    const revisionId = nanoid();
    const secondBranchId = nanoid();
    const secondRevisionId = nanoid();
    const graphqlVersionId = await createEndpointVersion(EndpointType.GRAPHQL);
    const restVersionId = await createEndpointVersion(EndpointType.REST_API);

    await prisma.project.create({
      data: {
        id: projectId,
        name: projectName,
        organizationId,
        branches: {
          create: [
            {
              id: branchId,
              name: 'master',
              isRoot: true,
              revisions: {
                create: {
                  id: revisionId,
                  isHead: true,
                  isDraft: true,
                },
              },
            },
            {
              id: secondBranchId,
              name: 'feature',
              revisions: {
                create: {
                  id: secondRevisionId,
                  isHead: true,
                },
              },
            },
          ],
        },
      },
    });

    await prisma.endpoint.create({
      data: {
        id: nanoid(),
        type: EndpointType.GRAPHQL,
        revisionId,
        versionId: graphqlVersionId,
      },
    });
    await prisma.endpoint.create({
      data: {
        id: nanoid(),
        type: EndpointType.REST_API,
        revisionId,
        versionId: restVersionId,
      },
    });
    await prisma.endpoint.create({
      data: {
        id: nanoid(),
        type: EndpointType.REST_API,
        revisionId: secondRevisionId,
        versionId: restVersionId,
        isDeleted: true,
      },
    });

    return { projectId, projectName };
  };

  const gql = (
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ) => {
    const req = request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables });
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  describe('configuration.billing', () => {
    it('should return billing configuration', async () => {
      const res = await gql(`{
        configuration {
          billing { enabled }
        }
      }`).expect(200);

      expect(res.body.data.configuration.billing).toEqual({
        enabled: true,
      });
    });
  });

  describe('plans query', () => {
    it('should return plans with camelCase limits and features', async () => {
      const res = await gql(`{
        plans {
          id name isPublic monthlyPriceUsd yearlyPriceUsd
          limits { rowVersions projects seats storageBytes apiCallsPerDay rowsPerTable tablesPerRevision branchesPerProject endpointsPerProject }
          features
        }
      }`).expect(200);

      expect(res.body.data.plans).toHaveLength(2);
      const pro = res.body.data.plans[1];
      expect(pro.id).toBe('pro');
      expect(pro.limits.rowVersions).toBe(500_000);
      expect(pro.limits.apiCallsPerDay).toBe(50_000);
      expect(pro.limits.endpointsPerProject).toBe(10);
      expect(pro.features).toEqual({ sso: true, audit: true });
    });
  });

  describe('availableProviders query', () => {
    it('should return providers', async () => {
      const res = await gql(`{
        availableProviders {
          id name methods supportsRecurring
        }
      }`).expect(200);

      expect(res.body.data.availableProviders).toHaveLength(1);
      expect(res.body.data.availableProviders[0].id).toBe('stripe');
    });
  });

  describe('activateEarlyAccess mutation', () => {
    it('should activate early access and return subscription', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `mutation($data: ActivateEarlyAccessInput!) {
          activateEarlyAccess(data: $data) {
            planId status
          }
        }`,
        { data: { organizationId: orgId, planId: 'pro' } },
        token,
      ).expect(200);

      expect(res.body.data.activateEarlyAccess.planId).toBe('pro');
      expect(res.body.data.activateEarlyAccess.status).toBe('early_adopter');
    });
  });

  describe('createCheckout mutation', () => {
    it('should create checkout and return URL', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `mutation($data: CreateCheckoutInput!) {
          createCheckout(data: $data) { checkoutUrl }
        }`,
        {
          data: {
            organizationId: orgId,
            planId: 'pro',
            interval: 'monthly',
            successUrl: 'https://app.example.com/success',
            cancelUrl: 'https://app.example.com/cancel',
          },
        },
        token,
      ).expect(200);

      expect(res.body.data.createCheckout.checkoutUrl).toBe(
        'https://checkout.example.com/session123',
      );
    });

    it('should reject invalid interval', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `mutation($data: CreateCheckoutInput!) {
          createCheckout(data: $data) { checkoutUrl }
        }`,
        {
          data: {
            organizationId: orgId,
            planId: 'pro',
            interval: 'weekly',
            successUrl: 'https://app.example.com/success',
            cancelUrl: 'https://app.example.com/cancel',
          },
        },
        token,
      ).expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain(
        'interval must be monthly or yearly',
      );
    });

    it('should reject invalid redirect URL', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `mutation($data: CreateCheckoutInput!) {
          createCheckout(data: $data) { checkoutUrl }
        }`,
        {
          data: {
            organizationId: orgId,
            planId: 'pro',
            successUrl: 'not-a-url',
            cancelUrl: 'https://app.example.com/cancel',
          },
        },
        token,
      ).expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain(
        'must be a valid HTTP(S) URL',
      );
    });
  });

  describe('organization.usage', () => {
    it('should return limits from getOrgLimits even without subscription', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `query($data: GetOrganizationInput!) {
          organization(data: $data) {
            usage {
              rowVersions { current limit percentage }
              projects { current limit percentage }
              seats { current limit percentage }
              storageBytes { current limit percentage }
              endpointsPerProject { current limit percentage }
            }
          }
        }`,
        { data: { organizationId: orgId } },
        token,
      ).expect(200);

      const usage = res.body.data.organization.usage;
      expect(usage.rowVersions.limit).toBe(10_000);
      expect(usage.projects.limit).toBe(3);
      expect(usage.seats.limit).toBe(1);
      expect(usage.storageBytes.limit).toBe(500_000_000);
      expect(usage.endpointsPerProject.limit).toBe(2);
      expect(mockBillingClient.getOrgLimits).toHaveBeenCalledWith(orgId);
    });

    it('should compute percentage when limit is set', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `query($data: GetOrganizationInput!) {
          organization(data: $data) {
            usage {
              seats { current limit percentage }
            }
          }
        }`,
        { data: { organizationId: orgId } },
        token,
      ).expect(200);

      const seats = res.body.data.organization.usage.seats;
      expect(seats.current).toBe(1);
      expect(seats.limit).toBe(1);
      expect(seats.percentage).toBe(100);
    });
  });

  describe('project.endpointUsage', () => {
    it('should return project-scoped endpoint usage and limit', async () => {
      const { orgId, token } = await createOrgWithOwner();
      const { projectName } = await createProjectWithEndpoints(orgId);

      const res = await gql(
        `query($data: GetProjectInput!) {
          project(data: $data) {
            endpointUsage {
              current
              limit
              percentage
            }
          }
        }`,
        { data: { organizationId: orgId, projectName } },
        token,
      ).expect(200);

      expect(res.body.data.project.endpointUsage).toEqual({
        current: 2,
        limit: 2,
        percentage: 100,
      });
    });
  });

  describe('cancelSubscription mutation', () => {
    it('should cancel subscription', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await gql(
        `mutation($data: CancelSubscriptionInput!) {
          cancelSubscription(data: $data)
        }`,
        { data: { organizationId: orgId, cancelAtPeriodEnd: true } },
        token,
      ).expect(200);

      expect(res.body.data.cancelSubscription).toBe(true);
      expect(mockBillingClient.cancelSubscription).toHaveBeenCalledWith(
        orgId,
        true,
      );
    });
  });
});
