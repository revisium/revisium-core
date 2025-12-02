import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  getPublicProjectFixture,
  gqlQuery,
  gqlQueryExpectError,
  type PrepareDataReturnType,
} from 'src/__tests__/e2e/shared';

describe('graphql - branch (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;
  let publicFixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
    publicFixture = await getPublicProjectFixture(app);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const getBranchData = (f: PrepareDataReturnType) => ({
    organizationId: f.project.organizationId,
    projectName: f.project.projectName,
    branchName: f.project.branchName,
  });

  const getBranchesData = (f: PrepareDataReturnType) => ({
    organizationId: f.project.organizationId,
    projectName: f.project.projectName,
    first: 10,
  });

  describe('branch query', () => {
    const getQuery = (data: {
      organizationId: string;
      projectName: string;
      branchName: string;
    }) => ({
      query: gql`
        query branch($data: GetBranchInput!) {
          branch(data: $data) {
            id
            name
            isRoot
            createdAt
          }
        }
      `,
      variables: { data },
    });

    it('owner can get branch', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(getBranchData(fixture)),
      });

      expect(result.branch.id).toBe(fixture.project.branchId);
      expect(result.branch.name).toBe(fixture.project.branchName);
      expect(result.branch.isRoot).toBe(true);
    });

    it('cross-owner cannot get branch from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(getBranchData(fixture)),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot get branch from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(getBranchData(fixture)),
        },
        /You are not allowed to read on Project/,
      );
    });

    describe('public project', () => {
      it('unauthenticated can get branch from public project', async () => {
        const result = await gqlQuery({
          app,
          ...getQuery(getBranchData(publicFixture)),
        });

        expect(result.branch.id).toBe(publicFixture.project.branchId);
      });
    });
  });

  describe('branches query', () => {
    const getQuery = (data: {
      organizationId: string;
      projectName: string;
      first: number;
    }) => ({
      query: gql`
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
      `,
      variables: { data },
    });

    it('owner can get branches', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(getBranchesData(fixture)),
      });

      expect(result.branches.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.branches.edges).toBeDefined();
    });

    it('cross-owner cannot get branches from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(getBranchesData(fixture)),
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('branch with @ResolveField', () => {
    describe('project field', () => {
      const getQuery = (data: {
        organizationId: string;
        projectName: string;
        branchName: string;
      }) => ({
        query: gql`
          query branch($data: GetBranchInput!) {
            branch(data: $data) {
              id
              project {
                id
                name
              }
            }
          }
        `,
        variables: { data },
      });

      it('resolves project field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(getBranchData(fixture)),
        });

        expect(result.branch.project).toBeDefined();
        expect(result.branch.project.id).toBe(fixture.project.projectId);
      });
    });

    describe('start/head/draft revisions', () => {
      const getQuery = (data: {
        organizationId: string;
        projectName: string;
        branchName: string;
      }) => ({
        query: gql`
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
        `,
        variables: { data },
      });

      it('resolves start/head/draft fields', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(getBranchData(fixture)),
        });

        expect(result.branch.start).toBeDefined();
        expect(result.branch.start.isStart).toBe(true);
        expect(result.branch.head).toBeDefined();
        expect(result.branch.head.isHead).toBe(true);
        expect(result.branch.draft).toBeDefined();
        expect(result.branch.draft.isDraft).toBe(true);
      });
    });

    describe('revisions field', () => {
      const getQuery = (data: {
        organizationId: string;
        projectName: string;
        branchName: string;
      }) => ({
        query: gql`
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
        `,
        variables: { data, revisionsData: { first: 10 } },
      });

      it('resolves revisions field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(getBranchData(fixture)),
        });

        expect(result.branch.revisions).toBeDefined();
        expect(result.branch.revisions.totalCount).toBeGreaterThanOrEqual(1);
      });
    });

    describe('touched field', () => {
      const getQuery = (data: {
        organizationId: string;
        projectName: string;
        branchName: string;
      }) => ({
        query: gql`
          query branch($data: GetBranchInput!) {
            branch(data: $data) {
              id
              touched
            }
          }
        `,
        variables: { data },
      });

      it('resolves touched field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(getBranchData(fixture)),
        });

        expect(result.branch).toHaveProperty('touched');
      });
    });
  });
});
