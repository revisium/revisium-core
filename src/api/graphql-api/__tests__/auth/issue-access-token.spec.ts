import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/testing/utils/prepareProject';
import { gql } from 'src/testing/utils/gql';
import { graphqlQuery, graphqlQueryError } from 'src/testing/utils/queryTest';
import { createFreshTestApp } from 'src/testing/e2e';

const ISSUE_ACCESS_TOKEN = gql`
  query issueAccessToken {
    issueAccessToken {
      accessToken
    }
  }
`;

const CREATE_PERSONAL_API_KEY = gql`
  mutation CreatePersonalApiKey($data: CreatePersonalApiKeyInput!) {
    createPersonalApiKey(data: $data) {
      apiKey {
        id
      }
      secret
    }
  }
`;

describe('graphql - issueAccessToken', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createFreshTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  let preparedData: PrepareDataReturnType;

  beforeEach(async () => {
    preparedData = await prepareData(app);
  });

  it('returns access token for JWT-authenticated user', async () => {
    const result = await graphqlQuery({
      query: ISSUE_ACCESS_TOKEN,
      app,
      token: preparedData.owner.token,
    });

    expect(result.issueAccessToken).toBeDefined();
    expect(typeof result.issueAccessToken.accessToken).toBe('string');
    expect(result.issueAccessToken.accessToken.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated request', async () => {
    return graphqlQueryError({
      query: ISSUE_ACCESS_TOKEN,
      app,
      token: undefined,
      error: /Unauthorized/,
    });
  });

  it('rejects API key authentication with 403', async () => {
    const createResult = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${preparedData.owner.token}`)
      .send({
        query: CREATE_PERSONAL_API_KEY,
        variables: { data: { name: 'test-issue-token' } },
      })
      .expect(200);

    const apiKey = (
      createResult.body as {
        data: { createPersonalApiKey: { secret: string } };
      }
    ).data.createPersonalApiKey.secret;

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('X-Api-Key', apiKey)
      .send({ query: ISSUE_ACCESS_TOKEN })
      .expect(200);

    const body = res.body as {
      errors?: Array<{ message: string }>;
    };

    expect(body.errors).toBeDefined();
    expect(body.errors![0].message).toMatch(
      /Access token can only be issued for JWT-authenticated sessions/,
    );
  });
});
