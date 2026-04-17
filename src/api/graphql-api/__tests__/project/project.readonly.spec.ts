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

const projectQuery = gql`
  query project($data: GetProjectInput!) {
    project(data: $data) {
      id
      name
      isPublic
      createdAt
      organizationId
    }
  }
`;

const projectVars = (organizationId: string, projectName: string) => ({
  data: { organizationId, projectName },
});

describe('graphql - project (readonly)', () => {
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

  describe('project query', () => {
    const varsFor = (f: PrepareDataReturnType) =>
      projectVars(f.project.organizationId, f.project.projectName);

    describeAuthMatrix(
      'private project access',
      PRIVATE_RESOURCE_MATRIX,
      async ({ role, outcome }) => {
        const actor = kit.roleFor(fixture, role);
        if (outcome === 'ok') {
          const result = await actor.expectOk<{
            project: { id: string };
          }>(projectQuery, varsFor(fixture));
          expect(result.project.id).toBe(fixture.project.projectId);
        } else {
          await actor.expectForbidden(projectQuery, varsFor(fixture));
        }
      },
    );

    it('owner sees all requested fields', async () => {
      const result = await kit.owner(fixture).expectOk<{
        project: Record<string, unknown>;
      }>(projectQuery, varsFor(fixture));

      expect(result.project).toEqual(
        expect.objectContaining({
          id: fixture.project.projectId,
          name: fixture.project.projectName,
          isPublic: false,
          organizationId: fixture.project.organizationId,
          createdAt: expect.any(String),
        }),
      );
    });

    it('owner hitting a non-existent project returns not found', async () => {
      await kit
        .owner(fixture)
        .expectNotFound(
          projectQuery,
          projectVars(fixture.project.organizationId, 'non-existent-project'),
        );
    });

    it('anon hitting a non-existent project returns not found', async () => {
      await kit
        .anon()
        .expectNotFound(
          projectQuery,
          projectVars(fixture.project.organizationId, 'non-existent-project'),
        );
    });

    describe('public project', () => {
      it('anon can read', async () => {
        const result = await kit.anon().expectOk<{
          project: { id: string; isPublic: boolean };
        }>(projectQuery, varsFor(publicFixture));

        expect(result.project.id).toBe(publicFixture.project.projectId);
        expect(result.project.isPublic).toBe(true);
      });

      it('anon sees null userProject and userOrganization', async () => {
        const result = await kit.anon().expectOk<{
          project: {
            id: string;
            userProject: unknown;
            organization: { userOrganization: unknown };
          };
        }>(
          gql`
            query project($data: GetProjectInput!) {
              project(data: $data) {
                id
                isPublic
                userProject {
                  id
                }
                organization {
                  id
                  userOrganization {
                    id
                  }
                }
              }
            }
          `,
          varsFor(publicFixture),
        );

        expect(result.project.id).toBe(publicFixture.project.projectId);
        expect(result.project.userProject).toBeNull();
        expect(result.project.organization.userOrganization).toBeNull();
      });

      it('cross-owner can read', async () => {
        const result = await kit.crossOwner(fixture).expectOk<{
          project: { id: string; isPublic: boolean };
        }>(projectQuery, varsFor(publicFixture));

        expect(result.project.id).toBe(publicFixture.project.projectId);
        expect(result.project.isPublic).toBe(true);
      });
    });
  });

  describe('@ResolveField', () => {
    it('resolves rootBranch', async () => {
      const query = gql`
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
      `;
      const result = await kit.owner(fixture).expectOk<{
        project: { rootBranch: { id: string; isRoot: boolean } };
      }>(query, projectVars(fixture.project.organizationId, fixture.project.projectName));

      expect(result.project.rootBranch.id).toBe(fixture.project.branchId);
      expect(result.project.rootBranch.isRoot).toBe(true);
    });

    it('resolves organization', async () => {
      const query = gql`
        query project($data: GetProjectInput!) {
          project(data: $data) {
            id
            organization {
              id
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        project: { organization: { id: string } };
      }>(query, projectVars(fixture.project.organizationId, fixture.project.projectName));

      expect(result.project.organization.id).toBe(
        fixture.project.organizationId,
      );
    });

    it('resolves allBranches', async () => {
      const query = gql`
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
      `;
      const result = await kit.owner(fixture).expectOk<{
        project: {
          allBranches: { totalCount: number; edges: unknown[] };
        };
      }>(query, {
        data: {
          organizationId: fixture.project.organizationId,
          projectName: fixture.project.projectName,
        },
        branchesData: { first: 10 },
      });

      expect(result.project.allBranches.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.project.allBranches.edges).toBeDefined();
    });
  });
});
