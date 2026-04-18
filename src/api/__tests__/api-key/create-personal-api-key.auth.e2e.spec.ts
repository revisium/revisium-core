import { nanoid } from 'nanoid';
import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

const createPersonalApiKey = operation<{ name: string; projectIds: string[] }>({
  id: 'apiKey.createPersonal',
  gql: {
    query: gql`
      mutation createPersonalApiKey($data: CreatePersonalApiKeyInput!) {
        createPersonalApiKey(data: $data) {
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
  { name: 'cross-owner', role: 'crossOwner', expected: 'allowed' },
  { name: 'anonymous', role: 'anonymous', expected: 'unauthorized' },
];

describe('createPersonalApiKey auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: createPersonalApiKey,
    cases,
    build: () => ({
      fixture: fresh.fixture,
      params: {
        name: `key-${nanoid()}`,
        projectIds: [fresh.fixture.project.projectId],
      },
    }),
  });
});
