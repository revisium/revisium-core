import { INestApplication } from '@nestjs/common';
import { gql } from 'src/testing/utils/gql';
import {
  getTestApp,
  getReadonlyFixture,
  gqlQuery,
  gqlQueryExpectError,
  type PrepareDataReturnType,
} from 'src/testing/e2e';

describe('graphql - internal API key auth (readonly)', () => {
  let app: INestApplication;
  let fixture: PrepareDataReturnType;
  let internalKeyHeaders: Record<string, string>;

  beforeAll(async () => {
    app = await getTestApp();
    fixture = await getReadonlyFixture(app);
    const internalKey = process.env.INTERNAL_API_KEY_ENDPOINT!;
    expect(internalKey).toBeDefined();
    internalKeyHeaders = { 'X-Internal-Api-Key': internalKey };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('valid internal key - full read access', () => {
    it('can read project', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query project($data: GetProjectInput!) {
            project(data: $data) {
              id
              name
              isPublic
              organizationId
            }
          }
        `,
        variables: {
          data: {
            organizationId: fixture.project.organizationId,
            projectName: fixture.project.projectName,
          },
        },
      });

      expect(result.project.id).toBe(fixture.project.projectId);
      expect(result.project.organizationId).toBe(
        fixture.project.organizationId,
      );
    });

    it('can read branch', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query branch($data: GetBranchInput!) {
            branch(data: $data) {
              id
              name
              isRoot
            }
          }
        `,
        variables: {
          data: {
            organizationId: fixture.project.organizationId,
            projectName: fixture.project.projectName,
            branchName: fixture.project.branchName,
          },
        },
      });

      expect(result.branch.id).toBe(fixture.project.branchId);
      expect(result.branch.isRoot).toBe(true);
    });

    it('can read revision', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query revision($data: GetRevisionInput!) {
            revision(data: $data) {
              id
              isDraft
            }
          }
        `,
        variables: {
          data: { revisionId: fixture.project.draftRevisionId },
        },
      });

      expect(result.revision.id).toBe(fixture.project.draftRevisionId);
      expect(result.revision.isDraft).toBe(true);
    });

    it('can read tables', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query tables($data: GetTablesInput!) {
            tables(data: $data) {
              totalCount
              edges {
                node {
                  id
                  versionId
                }
              }
            }
          }
        `,
        variables: {
          data: {
            revisionId: fixture.project.headRevisionId,
            first: 100,
          },
        },
      });

      expect(result.tables.totalCount).toBeGreaterThanOrEqual(1);
      expect(result.tables.edges.length).toBeGreaterThanOrEqual(1);
    });

    it('can read row', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query row($data: GetRowInput!) {
            row(data: $data) {
              id
              versionId
              readonly
            }
          }
        `,
        variables: {
          data: {
            revisionId: fixture.project.draftRevisionId,
            tableId: fixture.project.tableId,
            rowId: fixture.project.rowId,
          },
        },
      });

      expect(result.row.id).toBe(fixture.project.rowId);
    });
  });

  describe('internal key bypasses org/project membership', () => {
    it('can read another owner project', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query project($data: GetProjectInput!) {
            project(data: $data) {
              id
              name
            }
          }
        `,
        variables: {
          data: {
            organizationId: fixture.anotherProject!.organizationId,
            projectName: fixture.anotherProject!.projectName,
          },
        },
      });

      expect(result.project.id).toBe(fixture.anotherProject!.projectId);
    });

    it('can read another owner revision', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query revision($data: GetRevisionInput!) {
            revision(data: $data) {
              id
              isDraft
            }
          }
        `,
        variables: {
          data: { revisionId: fixture.anotherProject!.draftRevisionId },
        },
      });

      expect(result.revision.id).toBe(fixture.anotherProject!.draftRevisionId);
    });

    it('can read another owner row', async () => {
      const result = await gqlQuery({
        app,
        headers: internalKeyHeaders,
        query: gql`
          query row($data: GetRowInput!) {
            row(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            revisionId: fixture.anotherProject!.draftRevisionId,
            tableId: fixture.anotherProject!.tableId,
            rowId: fixture.anotherProject!.rowId,
          },
        },
      });

      expect(result.row.id).toBe(fixture.anotherProject!.rowId);
    });
  });

  describe('invalid internal key', () => {
    const projectQuery = gql`
      query project($data: GetProjectInput!) {
        project(data: $data) {
          id
        }
      }
    `;

    it('invalid key format gets Unauthorized', async () => {
      await gqlQueryExpectError(
        {
          app,
          headers: { 'X-Internal-Api-Key': 'not-a-valid-key' },
          query: projectQuery,
          variables: {
            data: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
            },
          },
        },
        /Invalid API key format/,
      );
    });

    it('valid format but wrong key gets Unauthorized', async () => {
      await gqlQueryExpectError(
        {
          app,
          headers: { 'X-Internal-Api-Key': 'rev_aaaaaaaaaaaaaaaaaaaaaa' },
          query: projectQuery,
          variables: {
            data: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
            },
          },
        },
        /Invalid API key/,
      );
    });

    it('empty key gets Unauthorized', async () => {
      await gqlQueryExpectError(
        {
          app,
          headers: { 'X-Internal-Api-Key': '' },
          query: projectQuery,
          variables: {
            data: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
            },
          },
        },
        /Invalid API key format|You are not allowed to read on Project/,
      );
    });
  });

  describe('no auth header', () => {
    it('unauthenticated cannot read private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          query: gql`
            query project($data: GetProjectInput!) {
              project(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              organizationId: fixture.project.organizationId,
              projectName: fixture.project.projectName,
            },
          },
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot read row from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          query: gql`
            query row($data: GetRowInput!) {
              row(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              revisionId: fixture.project.draftRevisionId,
              tableId: fixture.project.tableId,
              rowId: fixture.project.rowId,
            },
          },
        },
        /You are not allowed to read on Project/,
      );
    });
  });

  describe('both headers simultaneously', () => {
    it('internal key takes precedence over bearer token', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.anotherOwner.token,
        headers: internalKeyHeaders,
        query: gql`
          query project($data: GetProjectInput!) {
            project(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            organizationId: fixture.project.organizationId,
            projectName: fixture.project.projectName,
          },
        },
      });

      expect(result.project.id).toBe(fixture.project.projectId);
    });
  });
});
