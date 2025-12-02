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

describe('graphql - revision (readonly)', () => {
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

  describe('revision query', () => {
    const getQuery = (revisionId: string) => ({
      query: gql`
        query revision($data: GetRevisionInput!) {
          revision(data: $data) {
            id
            createdAt
            isHead
            isDraft
            isStart
          }
        }
      `,
      variables: {
        data: { revisionId },
      },
    });

    it('owner can get revision', async () => {
      const result = await gqlQuery({
        app,
        token: fixture.owner.token,
        ...getQuery(fixture.project.draftRevisionId),
      });

      expect(result.revision.id).toBe(fixture.project.draftRevisionId);
      expect(result.revision.isDraft).toBe(true);
    });

    it('cross-owner cannot get revision from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          token: fixture.anotherOwner.token,
          ...getQuery(fixture.project.draftRevisionId),
        },
        /You are not allowed to read on Project/,
      );
    });

    it('unauthenticated cannot get revision from private project', async () => {
      await gqlQueryExpectError(
        {
          app,
          ...getQuery(fixture.project.draftRevisionId),
        },
        /You are not allowed to read on Project/,
      );
    });

    describe('public project', () => {
      it('unauthenticated can get revision from public project', async () => {
        const result = await gqlQuery({
          app,
          ...getQuery(publicFixture.project.draftRevisionId),
        });

        expect(result.revision.id).toBe(publicFixture.project.draftRevisionId);
      });
    });
  });

  describe('revision with @ResolveField', () => {
    describe('branch field', () => {
      const getQuery = (revisionId: string) => ({
        query: gql`
          query revision($data: GetRevisionInput!) {
            revision(data: $data) {
              id
              branch {
                id
                name
              }
            }
          }
        `,
        variables: {
          data: { revisionId },
        },
      });

      it('resolves branch field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId),
        });

        expect(result.revision.branch).toBeDefined();
        expect(result.revision.branch.id).toBe(fixture.project.branchId);
      });
    });

    describe('parent field', () => {
      const getQuery = (revisionId: string) => ({
        query: gql`
          query revision($data: GetRevisionInput!) {
            revision(data: $data) {
              id
              parent {
                id
              }
            }
          }
        `,
        variables: {
          data: { revisionId },
        },
      });

      it('resolves parent field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId),
        });

        expect(result.revision.parent).toBeDefined();
        expect(result.revision.parent.id).toBe(fixture.project.headRevisionId);
      });
    });

    describe('tables field', () => {
      const getQuery = (revisionId: string) => ({
        query: gql`
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
        `,
        variables: {
          data: { revisionId },
          tablesData: { first: 10 },
        },
      });

      it('resolves tables field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId),
        });

        expect(result.revision.tables).toBeDefined();
        expect(result.revision.tables.totalCount).toBeGreaterThanOrEqual(1);
      });
    });

    describe('endpoints field', () => {
      const getQuery = (revisionId: string) => ({
        query: gql`
          query revision($data: GetRevisionInput!) {
            revision(data: $data) {
              id
              endpoints {
                id
                type
              }
            }
          }
        `,
        variables: {
          data: { revisionId },
        },
      });

      it('resolves endpoints field', async () => {
        const result = await gqlQuery({
          app,
          token: fixture.owner.token,
          ...getQuery(fixture.project.draftRevisionId),
        });

        expect(result.revision.endpoints).toBeDefined();
        expect(Array.isArray(result.revision.endpoints)).toBe(true);
      });
    });
  });
});
