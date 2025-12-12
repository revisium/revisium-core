import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { gql } from 'src/__tests__/utils/gql';
import {
  prepareData,
  PrepareDataReturnType,
} from 'src/__tests__/utils/prepareProject';
import { graphqlQuery, graphqlQueryError } from 'src/__tests__/utils/queryTest';
import { CoreModule } from 'src/core/core.module';
import { registerGraphqlEnums } from 'src/api/graphql-api/registerGraphqlEnums';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { SystemTables } from 'src/features/share/system-tables.consts';

describe('graphql - tableChanges', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    registerGraphqlEnums();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule.forRoot({ mode: 'monolith' })],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('tableChanges query', () => {
    let preparedData: PrepareDataReturnType;

    beforeEach(async () => {
      preparedData = await prepareData(app);
    });

    it('owner can query tableChanges', async () => {
      const result = await graphqlQuery({
        ...getTableChangesQuery(preparedData.project.draftRevisionId),
        app,
        token: preparedData.owner.token,
      });

      expect(result.tableChanges).toBeDefined();
      expect(result.tableChanges.edges).toBeInstanceOf(Array);
      expect(result.tableChanges.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('another owner cannot query tableChanges', async () => {
      return graphqlQueryError({
        ...getTableChangesQuery(preparedData.project.draftRevisionId),
        app,
        token: preparedData.anotherOwner.token,
        error: /You are not allowed to read on Project/,
      });
    });

    it('returns viewsChanges with no changes when no views exist', async () => {
      const result = await graphqlQuery({
        ...getTableChangesQuery(preparedData.project.draftRevisionId),
        app,
        token: preparedData.owner.token,
      });

      const tableChange = result.tableChanges.edges.find(
        (edge: any) => edge.node.tableId === preparedData.project.tableId,
      );

      if (tableChange) {
        expect(tableChange.node.viewsChanges).toBeDefined();
        expect(tableChange.node.viewsChanges.hasChanges).toBe(false);
        expect(tableChange.node.viewsChanges.changes).toEqual([]);
      }
    });

    it('returns viewsChanges with added views', async () => {
      const { draftRevisionId, tableId } = preparedData.project;

      const viewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          createdId: nanoid(),
          versionId: viewsTableVersionId,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      await prismaService.row.create({
        data: {
          id: tableId,
          createdId: nanoid(),
          versionId: nanoid(),
          tables: {
            connect: { versionId: viewsTableVersionId },
          },
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [
              { id: 'default', name: 'Default', columns: null },
              { id: 'custom', name: 'Custom View', columns: [{ field: 'id' }] },
            ],
          },
          hash: nanoid(),
          schemaHash: nanoid(),
        },
      });

      const result = await graphqlQuery({
        ...getTableChangesQuery(draftRevisionId),
        app,
        token: preparedData.owner.token,
      });

      const tableChange = result.tableChanges.edges.find(
        (edge: any) => edge.node.tableId === tableId,
      );

      expect(tableChange).toBeDefined();
      expect(tableChange.node.viewsChanges.hasChanges).toBe(true);
      expect(tableChange.node.viewsChanges.changes.length).toBe(2);
      expect(tableChange.node.viewsChanges.addedCount).toBe(2);
      expect(tableChange.node.viewsChanges.changes[0].changeType).toBe('ADDED');
    });

    it('returns viewsChanges with modified views', async () => {
      const { draftRevisionId, headRevisionId, tableId } = preparedData.project;

      const headViewsTableCreatedId = nanoid();
      const headViewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          createdId: headViewsTableCreatedId,
          versionId: headViewsTableVersionId,
          system: true,
          revisions: {
            connect: { id: headRevisionId },
          },
        },
      });

      await prismaService.row.create({
        data: {
          id: tableId,
          createdId: nanoid(),
          versionId: nanoid(),
          tables: {
            connect: { versionId: headViewsTableVersionId },
          },
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [{ id: 'default', name: 'Default', columns: null }],
          },
          hash: nanoid(),
          schemaHash: nanoid(),
        },
      });

      const draftViewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          createdId: headViewsTableCreatedId,
          versionId: draftViewsTableVersionId,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      await prismaService.row.create({
        data: {
          id: tableId,
          createdId: nanoid(),
          versionId: nanoid(),
          tables: {
            connect: { versionId: draftViewsTableVersionId },
          },
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [
              {
                id: 'default',
                name: 'Default',
                columns: [{ field: 'id', width: 200 }],
              },
            ],
          },
          hash: nanoid(),
          schemaHash: nanoid(),
        },
      });

      const result = await graphqlQuery({
        ...getTableChangesQuery(draftRevisionId),
        app,
        token: preparedData.owner.token,
      });

      const tableChange = result.tableChanges.edges.find(
        (edge: any) => edge.node.tableId === tableId,
      );

      expect(tableChange).toBeDefined();
      expect(tableChange.node.viewsChanges.hasChanges).toBe(true);
      expect(tableChange.node.viewsChanges.modifiedCount).toBe(1);
      expect(tableChange.node.viewsChanges.changes[0].changeType).toBe(
        'MODIFIED',
      );
    });

    it('returns viewsChanges with renamed views', async () => {
      const { draftRevisionId, headRevisionId, tableId } = preparedData.project;

      const headViewsTableCreatedId = nanoid();
      const headViewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          createdId: headViewsTableCreatedId,
          versionId: headViewsTableVersionId,
          system: true,
          revisions: {
            connect: { id: headRevisionId },
          },
        },
      });

      await prismaService.row.create({
        data: {
          id: tableId,
          createdId: nanoid(),
          versionId: nanoid(),
          tables: {
            connect: { versionId: headViewsTableVersionId },
          },
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [{ id: 'default', name: 'Old Name', columns: null }],
          },
          hash: nanoid(),
          schemaHash: nanoid(),
        },
      });

      const draftViewsTableVersionId = nanoid();
      await prismaService.table.create({
        data: {
          id: SystemTables.Views,
          createdId: headViewsTableCreatedId,
          versionId: draftViewsTableVersionId,
          system: true,
          revisions: {
            connect: { id: draftRevisionId },
          },
        },
      });

      await prismaService.row.create({
        data: {
          id: tableId,
          createdId: nanoid(),
          versionId: nanoid(),
          tables: {
            connect: { versionId: draftViewsTableVersionId },
          },
          data: {
            version: 1,
            defaultViewId: 'default',
            views: [{ id: 'default', name: 'New Name', columns: null }],
          },
          hash: nanoid(),
          schemaHash: nanoid(),
        },
      });

      const result = await graphqlQuery({
        ...getTableChangesQuery(draftRevisionId),
        app,
        token: preparedData.owner.token,
      });

      const tableChange = result.tableChanges.edges.find(
        (edge: any) => edge.node.tableId === tableId,
      );

      expect(tableChange).toBeDefined();
      expect(tableChange.node.viewsChanges.hasChanges).toBe(true);
      expect(tableChange.node.viewsChanges.renamedCount).toBe(1);
      expect(tableChange.node.viewsChanges.changes[0].changeType).toBe(
        'RENAMED',
      );
      expect(tableChange.node.viewsChanges.changes[0].oldViewName).toBe(
        'Old Name',
      );
      expect(tableChange.node.viewsChanges.changes[0].viewName).toBe(
        'New Name',
      );
    });

    function getTableChangesQuery(revisionId: string) {
      return {
        query: gql`
          query tableChanges($data: GetTableChangesInput!) {
            tableChanges(data: $data) {
              edges {
                node {
                  tableId
                  changeType
                  oldTableId
                  newTableId
                  schemaMigrations {
                    migrationType
                  }
                  viewsChanges {
                    hasChanges
                    changes {
                      viewId
                      viewName
                      changeType
                      oldViewName
                    }
                    addedCount
                    modifiedCount
                    removedCount
                    renamedCount
                  }
                  rowChangesCount
                  addedRowsCount
                  modifiedRowsCount
                  removedRowsCount
                  renamedRowsCount
                }
                cursor
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
              totalCount
            }
          }
        `,
        variables: {
          data: {
            revisionId,
            first: 50,
          },
        },
      };
    }
  });
});
