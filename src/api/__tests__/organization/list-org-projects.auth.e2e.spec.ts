import { gql } from 'src/testing/utils/gql';
import {
  operation,
  runAuthMatrix,
  type AuthMatrixCaseBase,
} from 'src/testing/kit/auth-permission';
import { usingFreshProject } from 'src/testing/scenarios/using-fresh-project';

interface ListOrgProjectsParams {
  organizationId: string;
}

const listOrgProjects = operation<ListOrgProjectsParams>({
  id: 'organization.listProjects',
  rest: {
    method: 'get',
    url: ({ organizationId }) => `/api/organization/${organizationId}/projects`,
    query: () => ({ first: 10 }),
  },
  gql: {
    query: gql`
      query projects($data: GetProjectsInput!) {
        projects(data: $data) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
      }
    `,
    variables: ({ organizationId }) => ({
      data: { organizationId, first: 10 },
    }),
  },
});

// `projects` uses OptionalAuthGuard and filters by caller visibility —
// it does NOT authorize, it scopes. Every caller gets 200 / no errors;
// owner sees their own project (totalCount >= 1), others see 0.
type MatrixCase = AuthMatrixCaseBase & { expectedCount: number };

const cases: MatrixCase[] = [
  { name: 'owner', role: 'owner', expected: 'allowed', expectedCount: 1 },
  {
    name: 'cross-owner',
    role: 'crossOwner',
    expected: 'allowed',
    expectedCount: 0,
  },
  {
    name: 'anonymous',
    role: 'anonymous',
    expected: 'allowed',
    expectedCount: 0,
  },
];

describe('list org projects auth', () => {
  const fresh = usingFreshProject();

  runAuthMatrix({
    op: listOrgProjects,
    cases,
    build: (c) => ({
      fixture: fresh.fixture,
      params: { organizationId: fresh.fixture.project.organizationId },
      assert: {
        gql: (data) => {
          const r = data as { projects: { totalCount: number } };
          if (c.expectedCount === 0) {
            expect(r.projects.totalCount).toBe(0);
          } else {
            expect(r.projects.totalCount).toBeGreaterThanOrEqual(
              c.expectedCount,
            );
          }
        },
        rest: (body) => {
          const r = body as { totalCount: number };
          if (c.expectedCount === 0) {
            expect(r.totalCount).toBe(0);
          } else {
            expect(r.totalCount).toBeGreaterThanOrEqual(c.expectedCount);
          }
        },
      },
    }),
  });
});
