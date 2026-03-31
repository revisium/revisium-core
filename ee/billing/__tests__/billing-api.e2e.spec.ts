import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import request from 'supertest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { hashedPassword } from 'src/__tests__/utils/prepareProject';

describe('Billing REST API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    process.env.REVISIUM_BILLING_ENABLED = 'true';
    process.env.REVISIUM_LICENSE_KEY = 'test-key';
    delete process.env.EARLY_ACCESS_ENABLED;
    registerGraphqlEnums();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
  });

  afterAll(async () => {
    delete process.env.REVISIUM_BILLING_ENABLED;
    delete process.env.REVISIUM_LICENSE_KEY;
    delete process.env.EARLY_ACCESS_ENABLED;
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
        .get('/billing/plans')
        .expect(200);

      expect(res.body.plans).toBeDefined();
      expect(res.body.plans.length).toBeGreaterThan(0);
      expect(res.body.plans[0]).toHaveProperty('id');
      expect(res.body.plans[0]).toHaveProperty('name');
      expect(res.body.plans[0]).toHaveProperty('maxRowVersions');
      expect(res.body.earlyAccess).toBe(false);
    });
  });

  describe('GET /billing/:orgId/subscription', () => {
    it('should return null when no subscription', async () => {
      const { orgId, token } = await createOrgWithOwner();
      const res = await request(app.getHttpServer())
        .get(`/billing/${orgId}/subscription`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body === null || res.text === '' || res.text === 'null').toBe(
        true,
      );
    });

    it('should return subscription when exists', async () => {
      const { orgId, token } = await createOrgWithOwner();
      await prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId: 'pro',
          status: 'early_adopter',
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/billing/${orgId}/subscription`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.planId).toBe('pro');
      expect(res.body.status).toBe('early_adopter');
    });
  });

  describe('GET /billing/:orgId/usage', () => {
    it('should return usage summary', async () => {
      const { orgId, token } = await createOrgWithOwner();
      const res = await request(app.getHttpServer())
        .get(`/billing/${orgId}/usage`)
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

  describe('POST /billing/:orgId/early-access', () => {
    it('should reject when EARLY_ACCESS_ENABLED is not set', async () => {
      const { orgId, token } = await createOrgWithOwner();
      const res = await request(app.getHttpServer())
        .post(`/billing/${orgId}/early-access`)
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'pro' })
        .expect(400);

      expect(res.body.message).toContain(
        'Early access is not currently available',
      );
    });
  });

  describe('GraphQL: plans query', () => {
    it('should return plans', async () => {
      const res = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `{ plans { id name maxRowVersions maxProjects maxSeats monthlyPriceUsd } }`,
        })
        .expect(200);

      expect(res.body.data.plans.length).toBeGreaterThan(0);
      expect(res.body.data.plans[0].id).toBeDefined();
    });
  });

  describe('GraphQL: activateEarlyAccess mutation', () => {
    it('should reject when early access is disabled', async () => {
      const { orgId, token } = await createOrgWithOwner();

      const res = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: `mutation($data: ActivateEarlyAccessInput!) {
            activateEarlyAccess(data: $data) { id status planId }
          }`,
          variables: { data: { organizationId: orgId, planId: 'pro' } },
        })
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain(
        'Early access is not currently available',
      );
    });
  });
});
