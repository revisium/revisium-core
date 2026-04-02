import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';

describe('Billing GraphQL — noop (ee disabled)', () => {
  let app: INestApplication;
  let originalBillingEnabled: string | undefined;

  beforeAll(async () => {
    originalBillingEnabled = process.env.REVISIUM_BILLING_ENABLED;
    delete process.env.REVISIUM_BILLING_ENABLED;
    registerGraphqlEnums();

    const module: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (originalBillingEnabled !== undefined) {
      process.env.REVISIUM_BILLING_ENABLED = originalBillingEnabled;
    }
    await app.close();
  });

  const gql = (query: string) =>
    request(app.getHttpServer()).post('/graphql').send({ query });

  it('configuration.billing returns enabled=false', async () => {
    const res = await gql(`{
      configuration {
        billing { enabled earlyAccess }
      }
    }`).expect(200);

    expect(res.body.data.configuration.billing).toEqual({
      enabled: false,
      earlyAccess: false,
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
