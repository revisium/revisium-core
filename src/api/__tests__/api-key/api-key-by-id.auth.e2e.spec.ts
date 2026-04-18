import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import { getFullTestApp as getTestApp } from 'src/testing/e2e/test-app';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const apiKeyById = operation<{ id: string }>({
  id: 'apiKey.byId',
  gql: {
    query: gql`
      query apiKeyById($id: ID!) {
        apiKeyById(id: $id) {
          id
        }
      }
    `,
    variables: ({ id }) => ({ id }),
  },
});

describe('apiKeyById auth', () => {
  const fresh = usingFreshProject();
  let app: INestApplication;
  let ownerKeyId: string;

  beforeEach(async () => {
    app = await getTestApp();
    const apiKey = app.get(ApiKeyApiService);
    const created = await apiKey.createPersonalApiKey({
      name: `k-${nanoid()}`,
      userId: fresh.fixture.owner.user.id,
    });
    ownerKeyId = created.id;
  });

  const realKeyCases: AuthMatrixCaseBase[] = [
    { name: 'owner (own key)', role: 'owner', expected: 'allowed' },
    {
      name: 'cross-owner (foreign)',
      role: 'crossOwner',
      expected: 'not_found',
    },
    { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
  ];

  describe('real key', () => {
    runAuthMatrix({
      op: apiKeyById,
      cases: realKeyCases,
      build: () => ({
        fixture: fresh.fixture,
        params: { id: ownerKeyId },
      }),
    });
  });

  describe('non-existent key', () => {
    runAuthMatrix({
      op: apiKeyById,
      cases: [
        { name: 'owner (missing)', role: 'owner', expected: 'not_found' },
        {
          name: 'cross-owner (missing)',
          role: 'crossOwner',
          expected: 'not_found',
        },
      ],
      build: () => ({
        fixture: fresh.fixture,
        params: { id: nanoid() },
      }),
    });
  });
});
