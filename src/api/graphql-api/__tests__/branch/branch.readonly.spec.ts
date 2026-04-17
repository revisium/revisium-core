import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  describeAuthMatrix,
  getTestApp,
  getReadonlyFixture,
  getPublicProjectFixture,
  gqlKit,
  PRIVATE_RESOURCE_MATRIX,
  type GqlKit,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

const branchQuery = gql`
  query branch($data: GetBranchInput!) {
    branch(data: $data) {
      id
      name
      isRoot
      createdAt
    }
  }
`;

const branchesQuery = gql`
  query branches($data: GetBranchesInput!) {
    branches(data: $data) {
      totalCount
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const branchVars = (f: PrepareDataReturnType) => ({
  data: {
    organizationId: f.project.organizationId,
    projectName: f.project.projectName,
    branchName: f.project.branchName,
  },
});

const branchesVars = (f: PrepareDataReturnType) => ({
  data: {
    organizationId: f.project.organizationId,
    projectName: f.project.projectName,
    first: 10,
  },
});

describe('graphql - branch (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;
  let fixture: PrepareDataReturnType;
  let publicFixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
    fixture = await getReadonlyFixture(app);
    publicFixture = await getPublicProjectFixture(app);
  });

  describe('branch query', () => {
    describeAuthMatrix(
      'private project access',
      PRIVATE_RESOURCE_MATRIX,
      async ({ role, outcome }) => {
        const actor = kit.roleFor(fixture, role);
        if (outcome === 'ok') {
          const result = await actor.expectOk<{
            branch: { id: string; name: string; isRoot: boolean };
          }>(branchQuery, branchVars(fixture));
          expect(result.branch.id).toBe(fixture.project.branchId);
          expect(result.branch.name).toBe(fixture.project.branchName);
          expect(result.branch.isRoot).toBe(true);
        } else {
          await actor.expectForbidden(branchQuery, branchVars(fixture));
        }
      },
    );

    it('anon can get branch from public project', async () => {
      const result = await kit.anon().expectOk<{
        branch: { id: string };
      }>(branchQuery, branchVars(publicFixture));
      expect(result.branch.id).toBe(publicFixture.project.branchId);
    });
  });

  describe('branches query', () => {
    it('owner can list branches', async () => {
      const result = await kit.owner(fixture).expectOk<{
        branches: { totalCount: number; edges: unknown[] };
      }>(branchesQuery, branchesVars(fixture));
      expect(result.branches.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.branches.edges).toBeDefined();
    });

    it('cross-owner is forbidden from listing branches on private project', async () => {
      await kit
        .crossOwner(fixture)
        .expectForbidden(branchesQuery, branchesVars(fixture));
    });
  });

  describe('@ResolveField', () => {
    it('resolves project', async () => {
      const query = gql`
        query branch($data: GetBranchInput!) {
          branch(data: $data) {
            id
            project {
              id
              name
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        branch: { project: { id: string } };
      }>(query, branchVars(fixture));
      expect(result.branch.project.id).toBe(fixture.project.projectId);
    });

    it('resolves start/head/draft revisions', async () => {
      const query = gql`
        query branch($data: GetBranchInput!) {
          branch(data: $data) {
            id
            start {
              id
              isStart
            }
            head {
              id
              isHead
            }
            draft {
              id
              isDraft
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        branch: {
          start: { isStart: boolean };
          head: { isHead: boolean };
          draft: { isDraft: boolean };
        };
      }>(query, branchVars(fixture));
      expect(result.branch.start.isStart).toBe(true);
      expect(result.branch.head.isHead).toBe(true);
      expect(result.branch.draft.isDraft).toBe(true);
    });

    it('resolves revisions', async () => {
      const query = gql`
        query branch(
          $data: GetBranchInput!
          $revisionsData: GetBranchRevisionsInput!
        ) {
          branch(data: $data) {
            id
            revisions(data: $revisionsData) {
              totalCount
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        branch: { revisions: { totalCount: number } };
      }>(query, {
        ...branchVars(fixture),
        revisionsData: { first: 10 },
      });
      expect(result.branch.revisions.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('resolves touched', async () => {
      const query = gql`
        query branch($data: GetBranchInput!) {
          branch(data: $data) {
            id
            touched
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        branch: { touched: unknown };
      }>(query, branchVars(fixture));
      expect(result.branch).toHaveProperty('touched');
    });
  });
});
