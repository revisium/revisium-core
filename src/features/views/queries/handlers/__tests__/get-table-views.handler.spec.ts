import { CacheModule } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { nanoid } from 'nanoid';
import hash from 'object-hash';
import { SHARE_QUERIES_HANDLERS } from 'src/features/share/queries/handlers';
import { tableViewsSchema } from 'src/features/share/schema/table-views-schema';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { GetTableViewsHandler } from 'src/features/views/queries/handlers/get-table-views.handler';
import { GetTableViewsQuery } from 'src/features/views/queries/impl';
import { DEFAULT_VIEW_ID, TableViewsData } from 'src/features/views/types';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

const DEFAULT_VIEWS_DATA: TableViewsData = {
  version: 1,
  defaultViewId: DEFAULT_VIEW_ID,
  views: [
    {
      id: DEFAULT_VIEW_ID,
      name: 'Default',
      columns: null,
      sorts: [],
      search: '',
    },
  ],
};

describe('GetTableViewsHandler', () => {
  describe('when views table does not exist', () => {
    it('should return default views data', async () => {
      const { draftRevisionId, tableId } = await prepareBranchWithTable();

      const result = await handler.execute(
        new GetTableViewsQuery({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      expect(result).toEqual(DEFAULT_VIEWS_DATA);
      expect(result.version).toBe(1);
      expect(result.defaultViewId).toBe(DEFAULT_VIEW_ID);
      expect(result.views).toHaveLength(1);
      expect(result.views[0].id).toBe(DEFAULT_VIEW_ID);
      expect(result.views[0].name).toBe('Default');
    });
  });

  describe('when views table exists but no row for table', () => {
    it('should return default views data', async () => {
      const { draftRevisionId, tableId } = await prepareBranchWithViewsTable();

      const result = await handler.execute(
        new GetTableViewsQuery({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      expect(result).toEqual(DEFAULT_VIEWS_DATA);
    });

    it('should return default views even if other tables have views configured', async () => {
      const { draftRevisionId, tableId, viewsTableVersionId } =
        await prepareBranchWithViewsTable();

      const otherTableId = `other-table-${nanoid()}`;
      await createViewsRow(viewsTableVersionId, otherTableId, {
        version: 1,
        defaultViewId: 'custom',
        views: [
          {
            id: 'custom',
            name: 'Custom View',
          },
        ],
      });

      const result = await handler.execute(
        new GetTableViewsQuery({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      expect(result).toEqual(DEFAULT_VIEWS_DATA);
    });
  });

  describe('when views table and row exist', () => {
    it('should return stored views data', async () => {
      const { draftRevisionId, tableId, viewsTableVersionId } =
        await prepareBranchWithViewsTable();

      const customViewsData: TableViewsData = {
        version: 1,
        defaultViewId: 'published',
        views: [
          {
            id: 'default',
            name: 'Default',
            columns: [
              { field: 'id', width: 150 },
              { field: 'data.title', width: 300 },
            ],
            sorts: [{ field: 'id', direction: 'asc' }],
            search: '',
          },
          {
            id: 'published',
            name: 'Published Only',
            description: 'Shows only published posts',
            columns: [
              { field: 'id', width: 150 },
              { field: 'data.title', width: 400 },
              { field: 'data.publishedAt', width: 150 },
            ],
            filters: {
              logic: 'and',
              conditions: [
                {
                  field: 'data.status',
                  operator: 'equals',
                  value: 'published',
                },
              ],
            },
            sorts: [{ field: 'data.publishedAt', direction: 'desc' }],
            search: '',
          },
        ],
      };

      await createViewsRow(viewsTableVersionId, tableId, customViewsData);

      const result = await handler.execute(
        new GetTableViewsQuery({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      expect(result).toEqual(customViewsData);
      expect(result.version).toBe(1);
      expect(result.defaultViewId).toBe('published');
      expect(result.views).toHaveLength(2);
    });

    it('should return views with filters containing nested groups', async () => {
      const { draftRevisionId, tableId, viewsTableVersionId } =
        await prepareBranchWithViewsTable();

      const viewsWithNestedFilters: TableViewsData = {
        version: 1,
        defaultViewId: 'complex',
        views: [
          {
            id: 'complex',
            name: 'Complex Filter',
            filters: {
              logic: 'and',
              conditions: [
                { field: 'data.status', operator: 'equals', value: 'active' },
              ],
              groups: [
                {
                  logic: 'or',
                  conditions: [
                    { field: 'data.type', operator: 'equals', value: 'post' },
                    {
                      field: 'data.type',
                      operator: 'equals',
                      value: 'article',
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      await createViewsRow(
        viewsTableVersionId,
        tableId,
        viewsWithNestedFilters,
      );

      const result = await handler.execute(
        new GetTableViewsQuery({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      expect(result).toEqual(viewsWithNestedFilters);
      expect(result.views[0].filters?.groups).toHaveLength(1);
      expect(result.views[0].filters?.groups?.[0].conditions).toHaveLength(2);
    });
  });

  describe('head vs draft revision', () => {
    it('should return views from specific revision', async () => {
      const {
        headRevisionId,
        draftRevisionId,
        tableId,
        headViewsTableVersionId,
        draftViewsTableVersionId,
      } = await prepareBranchWithSeparateViewsVersions();

      const headViewsData: TableViewsData = {
        version: 1,
        defaultViewId: 'head-view',
        views: [{ id: 'head-view', name: 'Head View' }],
      };

      const draftViewsData: TableViewsData = {
        version: 1,
        defaultViewId: 'draft-view',
        views: [{ id: 'draft-view', name: 'Draft View' }],
      };

      await createViewsRow(headViewsTableVersionId, tableId, headViewsData);
      await createViewsRow(draftViewsTableVersionId, tableId, draftViewsData);

      const headResult = await handler.execute(
        new GetTableViewsQuery({
          revisionId: headRevisionId,
          tableId,
        }),
      );

      const draftResult = await handler.execute(
        new GetTableViewsQuery({
          revisionId: draftRevisionId,
          tableId,
        }),
      );

      expect(headResult.defaultViewId).toBe('head-view');
      expect(draftResult.defaultViewId).toBe('draft-view');
    });
  });

  async function prepareBranchWithTable() {
    const branch = await prepareBranch();
    const tableId = `table-${nanoid()}`;
    const tableVersionId = nanoid();
    const tableCreatedId = nanoid();

    await prismaService.table.create({
      data: {
        id: tableId,
        versionId: tableVersionId,
        createdId: tableCreatedId,
        readonly: false,
        revisions: {
          connect: [
            { id: branch.headRevisionId },
            { id: branch.draftRevisionId },
          ],
        },
      },
    });

    return {
      ...branch,
      tableId,
      tableVersionId,
    };
  }

  async function prepareBranchWithViewsTable() {
    const branch = await prepareBranchWithTable();
    const viewsTableVersionId = nanoid();
    const viewsTableCreatedId = nanoid();

    await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        versionId: viewsTableVersionId,
        createdId: viewsTableCreatedId,
        readonly: true,
        system: true,
        revisions: {
          connect: [
            { id: branch.headRevisionId },
            { id: branch.draftRevisionId },
          ],
        },
      },
    });

    return {
      ...branch,
      viewsTableVersionId,
    };
  }

  async function prepareBranchWithSeparateViewsVersions() {
    const branch = await prepareBranchWithTable();
    const headViewsTableVersionId = nanoid();
    const draftViewsTableVersionId = nanoid();
    const viewsTableCreatedId = nanoid();

    await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        versionId: headViewsTableVersionId,
        createdId: viewsTableCreatedId,
        readonly: true,
        system: true,
        revisions: {
          connect: { id: branch.headRevisionId },
        },
      },
    });

    await prismaService.table.create({
      data: {
        id: SystemTables.Views,
        versionId: draftViewsTableVersionId,
        createdId: viewsTableCreatedId,
        readonly: true,
        system: true,
        revisions: {
          connect: { id: branch.draftRevisionId },
        },
      },
    });

    return {
      ...branch,
      headViewsTableVersionId,
      draftViewsTableVersionId,
    };
  }

  async function createViewsRow(
    viewsTableVersionId: string,
    tableId: string,
    data: TableViewsData,
  ) {
    await prismaService.row.create({
      data: {
        id: tableId,
        versionId: nanoid(),
        createdId: nanoid(),
        readonly: true,
        data: data as any,
        hash: hash(data),
        schemaHash: hash(tableViewsSchema),
        tables: {
          connect: { versionId: viewsTableVersionId },
        },
      },
    });
  }

  async function prepareBranch() {
    const organizationId = `org-${nanoid()}`;
    const projectId = `project-${nanoid()}`;
    const branchId = `branch-${nanoid()}`;
    const headRevisionId = nanoid();
    const draftRevisionId = nanoid();

    await prismaService.branch.create({
      data: {
        id: branchId,
        name: `name-${branchId}`,
        isRoot: true,
        project: {
          create: {
            id: projectId,
            name: `name-${projectId}`,
            organization: {
              create: {
                id: organizationId,
                createdId: nanoid(),
              },
            },
          },
        },
        revisions: {
          createMany: {
            data: [
              {
                id: headRevisionId,
                isStart: true,
                isHead: true,
                hasChanges: false,
              },
              {
                id: draftRevisionId,
                parentId: headRevisionId,
                hasChanges: true,
                isDraft: true,
              },
            ],
          },
        },
      },
    });

    return {
      organizationId,
      projectId,
      branchId,
      headRevisionId,
      draftRevisionId,
    };
  }

  let module: TestingModule;
  let handler: GetTableViewsHandler;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, CqrsModule, CacheModule.register()],
      providers: [
        GetTableViewsHandler,
        ShareTransactionalQueries,
        ...SHARE_QUERIES_HANDLERS,
      ],
    }).compile();

    await module.init();

    handler = module.get(GetTableViewsHandler);
    prismaService = module.get(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });
});
