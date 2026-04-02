import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import {
  BILLING_CLIENT_TOKEN,
  IBillingClient,
} from 'ee/billing/billing-client.interface';

const unconfiguredBillingClient: IBillingClient = {
  configured: false,
  getOrgLimits: jest.fn(),
  createCheckout: jest.fn(),
  cancelSubscription: jest.fn(),
  getSubscription: jest.fn(),
  getProviders: jest.fn(),
  getPortalUrl: jest.fn(),
  getPlans: jest.fn(),
  getPlan: jest.fn(),
  activateEarlyAccess: jest.fn(),
  reportUsage: jest.fn(),
};

describe('Billing GraphQL — unconfigured payment service', () => {
  let app: INestApplication;

  beforeAll(async () => {
    registerGraphqlEnums();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(BILLING_CLIENT_TOKEN)
      .useValue(unconfiguredBillingClient)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const gql = (query: string) =>
    request(app.getHttpServer()).post('/graphql').send({ query });

  it('configuration.billing returns enabled=false', async () => {
    const res = await gql(`{
      configuration {
        billing { enabled }
      }
    }`).expect(200);

    expect(res.body.data.configuration.billing).toEqual({
      enabled: false,
    });
  });

  it('plans returns empty array', async () => {
    const res = await gql(`{
      plans { id name }
    }`).expect(200);

    expect(res.body.data.plans).toEqual([]);
  });

  it('availableProviders returns empty array', async () => {
    const res = await gql(`{
      availableProviders { id name }
    }`).expect(200);

    expect(res.body.data.availableProviders).toEqual([]);
  });
});
