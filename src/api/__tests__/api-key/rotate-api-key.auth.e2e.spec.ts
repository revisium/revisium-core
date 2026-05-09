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

const rotateApiKey = operation<{ id: string }>({
  id: 'apiKey.rotate',
  gql: {
    query: gql`
      mutation rotateApiKey($id: ID!) {
        rotateApiKey(id: $id) {
          apiKey {
            id
          }
          secret
        }
      }
    `,
    variables: ({ id }) => ({ id }),
  },
  rest: {
    method: 'post',
    url: ({ id }) => `/api/api-keys/${id}/rotate`,
  },
});

describe('rotateApiKey auth', () => {
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

  // Owner rotates own key. Cross-owner sees not_found (IDOR scoping). Anon
  // gated at auth. Each rotate creates a new id, so the test cannot reuse
  // ownerKeyId across cases — usingFreshProject already re-seeds beforeEach.
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
      op: rotateApiKey,
      cases: realKeyCases,
      build: () => ({
        fixture: fresh.fixture,
        params: { id: ownerKeyId },
      }),
    });
  });

  describe('non-existent key', () => {
    runAuthMatrix({
      op: rotateApiKey,
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
