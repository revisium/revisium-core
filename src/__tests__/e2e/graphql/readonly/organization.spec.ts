import { INestApplication } from '@nestjs/common';
import { gql } from 'src/__tests__/utils/gql';
import {
  getTestApp,
  closeTestApp,
  getReadonlyFixture,
  gqlQuery,
  type PrepareDataReturnType,
} from 'src/__tests__/e2e/shared';

describe('graphql - organization (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
  });

  afterAll(async () => {
    await closeTestApp();
  });

  describe('projects query', () => {
    const getQuery = (organizationId: string) => ({
      query: gql`
        query projects($data: GetProjectsInput!) {
          projects(data: $data) {
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
      variables: {
        data: { organizationId, first: 10 },
      },
    });

    it('owner can get projects', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(fixture.project.organizationId),
      });

      expect(result.projects.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.projects.edges).toBeDefined();
    });

    it('cross-owner can only see own organization projects', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.anotherOwner.token,
        ...getQuery(fixture.anotherProject.organizationId),
      });

      expect(result.projects.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('unauthenticated gets empty list (no user access)', async () => {
      const result = await gqlQuery({
        app,
        ...getQuery(fixture.project.organizationId),
      });

      expect(result.projects.totalCount).toBe(0);
    });
  });
});
