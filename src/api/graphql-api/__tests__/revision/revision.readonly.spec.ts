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

const revisionQuery = gql`
  query revision($data: GetRevisionInput!) {
    revision(data: $data) {
      id
      createdAt
      isHead
      isDraft
      isStart
    }
  }
`;

const revisionVars = (revisionId: string) => ({ data: { revisionId } });

describe('graphql - revision (readonly)', () => {
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

  describe('revision query', () => {
    describeAuthMatrix(
      'private project access',
      PRIVATE_RESOURCE_MATRIX,
      async ({ role, outcome }) => {
        const actor = kit.roleFor(fixture, role);
        const vars = revisionVars(fixture.project.draftRevisionId);
        if (outcome === 'ok') {
          const result = await actor.expectOk<{
            revision: { id: string; isDraft: boolean };
          }>(revisionQuery, vars);
          expect(result.revision.id).toBe(fixture.project.draftRevisionId);
          expect(result.revision.isDraft).toBe(true);
        } else {
          await actor.expectForbidden(revisionQuery, vars);
        }
      },
    );

    it('anon can read revision from public project', async () => {
      const result = await kit.anon().expectOk<{
        revision: { id: string };
      }>(revisionQuery, revisionVars(publicFixture.project.draftRevisionId));
      expect(result.revision.id).toBe(publicFixture.project.draftRevisionId);
    });
  });

  describe('@ResolveField', () => {
    it('resolves branch', async () => {
      const query = gql`
        query revision($data: GetRevisionInput!) {
          revision(data: $data) {
            id
            branch {
              id
              name
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        revision: { branch: { id: string } };
      }>(query, revisionVars(fixture.project.draftRevisionId));
      expect(result.revision.branch.id).toBe(fixture.project.branchId);
    });

    it('resolves parent', async () => {
      const query = gql`
        query revision($data: GetRevisionInput!) {
          revision(data: $data) {
            id
            parent {
              id
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        revision: { parent: { id: string } };
      }>(query, revisionVars(fixture.project.draftRevisionId));
      expect(result.revision.parent.id).toBe(fixture.project.headRevisionId);
    });

    it('resolves tables', async () => {
      const query = gql`
        query revision(
          $data: GetRevisionInput!
          $tablesData: GetRevisionTablesInput!
        ) {
          revision(data: $data) {
            id
            tables(data: $tablesData) {
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
        revision: { tables: { totalCount: number } };
      }>(query, {
        ...revisionVars(fixture.project.draftRevisionId),
        tablesData: { first: 10 },
      });
      expect(result.revision.tables.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('resolves endpoints', async () => {
      const query = gql`
        query revision($data: GetRevisionInput!) {
          revision(data: $data) {
            id
            endpoints {
              id
              type
            }
          }
        }
      `;
      const result = await kit.owner(fixture).expectOk<{
        revision: { endpoints: unknown[] };
      }>(query, revisionVars(fixture.project.draftRevisionId));
      expect(Array.isArray(result.revision.endpoints)).toBe(true);
    });
  });
});
