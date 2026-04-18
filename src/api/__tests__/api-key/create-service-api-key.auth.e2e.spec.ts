import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface CreateServiceApiKeyParams {
  name: string;
  organizationId: string;
  projectIds: string[];
  permissions: { rules: Array<{ action: string[]; subject: string[] }> };
}

const createServiceApiKey = operation<CreateServiceApiKeyParams>({
  id: 'apiKey.createService',
  gql: {
    query: gql`
      mutation createServiceApiKey($data: CreateServiceApiKeyInput!) {
        createServiceApiKey(data: $data) {
          apiKey {
            id
          }
          secret
        }
      }
    `,
    variables: (p) => ({ data: p }),
  },
});

const cases: AuthMatrixCaseBase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed' },
  { name: 'cross-owner', role: 'crossOwner', expected: 'forbidden' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('createServiceApiKey auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createServiceApiKey,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        name: `svc-${nanoid()}`,
        organizationId: fresh.fixture.project.organizationId,
        projectIds: [fresh.fixture.project.projectId],
        permissions: { rules: [{ action: ['read'], subject: ['all'] }] },
      },
    }),
  });
});
