import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  getTestApp,
  getReadonlyFixture,
  gqlKit,
  type GqlKit,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

const projectsQuery = gql`
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
`;

const projectsVars = (organizationId: string) => ({
  data: { organizationId, first: 10 },
});

describe('graphql - organization (readonly)', () => {
  let app: INestApplication;
  let kit: GqlKit;
  let fixture: PrepareDataReturnType;

  beforeAll(async () => {
    app = await getTestApp();
    kit = gqlKit(app);
    fixture = await getReadonlyFixture(app);
  });

  describe('projects query', () => {
    it('owner lists own-org projects', async () => {
      const result = await kit.owner(fixture).expectOk<{
        projects: { totalCount: number; edges: unknown[] };
      }>(projectsQuery, projectsVars(fixture.project.organizationId));

      expect(result.projects.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.projects.edges).toBeDefined();
    });

    it('cross-owner only sees own-org projects', async () => {
      const result = await kit.crossOwner(fixture).expectOk<{
        projects: { totalCount: number };
      }>(projectsQuery, projectsVars(fixture.anotherProject.organizationId));

      expect(result.projects.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('anon sees empty list', async () => {
      const result = await kit.anon().expectOk<{
        projects: { totalCount: number };
      }>(projectsQuery, projectsVars(fixture.project.organizationId));

      expect(result.projects.totalCount).toBe(0);
    });
  });
});
