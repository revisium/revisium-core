import { INestApplication } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import { getTestApp } from 'src/testing/e2e';
import { ApiKeyApiService } from 'src/features/api-key/api-key-api.service';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const revokeApiKey = operation<{ id: string }>({
  id: 'apiKey.revoke',
  gql: {
    query: gql`
      mutation revokeApiKey($id: ID!) {
        revokeApiKey(id: $id) {
          id
        }
      }
    `,
    variables: ({ id }) => ({ id }),
  },
});

describe('revokeApiKey auth', () => {
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

  // Owner can revoke their own key. Cross-owner hitting a foreign key's id
  // gets not_found (IDOR check: the resolver scopes by userId before the
  // resource lookup). Anon is gated at auth.
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
      op: revokeApiKey,
      cases: realKeyCases,
      build: () => ({
        fixture: fresh.fixture,
        params: { id: ownerKeyId },
      }),
    });
  });

  // Sanity: owner hitting a non-existent id also gets not_found.
  describe('non-existent key', () => {
    runAuthMatrix({
      op: revokeApiKey,
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
