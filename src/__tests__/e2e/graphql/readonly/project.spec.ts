import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  getPublicProjectFixture,
  gqlQuery,
  gqlQueryExpectError,
  expectGraphQLFields,
  type PrepareDataReturnType,
} from 'src/__tests__/e2e/shared';

describe('graphql - project (readonly)', () => {
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

  describe('project query', () => {
    const getQuery = (organizationId: string, projectName: string) => ({
      query: gql`
        query project($data: GetProjectInput!) {
          project(data: $data) {
            id
            name
            isPublic
            createdAt
            organizationId
          }
        }
      `,
      variables: {
        data: { organizationId, projectName },
      },
    });

    it('owner can get project', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(
          fixture.project.organizationId,
          fixture.project.projectName,
        ),
      });

      expectGraphQLFields(result, 'project', [
        'id',
        'name',
        'isPublic',
        'createdAt',
        'organizationId',
      ]);
      expect(result.project.id).toBe(fixture.project.projectId);
    });

    it('cross-owner cannot get private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot get private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(
            fixture.project.organizationId,
            fixture.project.projectName,
          ),
        },
        /You are not allowed to read on Project/,
      );
    });

    describe('public project', () => {
      it('unauthenticated can get public project', async () => {
        const result = await gqlQuery({
          app,
          ...getQuery(
            publicFixture.project.organizationId,
            publicFixture.project.projectName,
          ),
        });

        expect(result.project.id).toBe(publicFixture.project.projectId);
        expect(result.project.isPublic).toBe(true);
      });
    });
  });

  describe('project with rootBranch @ResolveField', () => {
    const getQuery = (organizationId: string, projectName: string) => ({
      query: gql`
        query project($data: GetProjectInput!) {
          project(data: $data) {
            id
            rootBranch {
              id
              name
              isRoot
            }
          }
        }
      `,
      variables: {
        data: { organizationId, projectName },
      },
    });

    it('resolves rootBranch field', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(
          fixture.project.organizationId,
          fixture.project.projectName,
        ),
      });

      expect(result.project.rootBranch).toBeDefined();
      expect(result.project.rootBranch.id).toBe(fixture.project.branchId);
      expect(result.project.rootBranch.isRoot).toBe(true);
    });
  });

  describe('project with organization @ResolveField', () => {
    const getQuery = (organizationId: string, projectName: string) => ({
      query: gql`
        query project($data: GetProjectInput!) {
          project(data: $data) {
            id
            organization {
              id
            }
          }
        }
      `,
      variables: {
        data: { organizationId, projectName },
      },
    });

    it('resolves organization field', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(
          fixture.project.organizationId,
          fixture.project.projectName,
        ),
      });

      expect(result.project.organization).toBeDefined();
      expect(result.project.organization.id).toBe(
        fixture.project.organizationId,
      );
    });
  });

  describe('project with allBranches @ResolveField', () => {
    const getQuery = (organizationId: string, projectName: string) => ({
      query: gql`
        query project(
          $data: GetProjectInput!
          $branchesData: GetProjectBranchesInput!
        ) {
          project(data: $data) {
            id
            allBranches(data: $branchesData) {
              totalCount
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      `,
      variables: {
        data: { organizationId, projectName },
        branchesData: { first: 10 },
      },
    });

    it('resolves allBranches field', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(
          fixture.project.organizationId,
          fixture.project.projectName,
        ),
      });

      expect(result.project.allBranches).toBeDefined();
      expect(result.project.allBranches.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.project.allBranches.edges).toBeDefined();
    });
  });
});
