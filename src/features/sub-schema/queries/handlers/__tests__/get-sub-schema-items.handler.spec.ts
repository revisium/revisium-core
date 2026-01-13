import { QueryBus } from '@nestjs/cqrs';
import { Prisma } from 'src/__generated__/client';
import {
  getArraySchema,
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftApiService } from 'src/features/draft/draft-api.service';
import {
  GetSubSchemaItemsQuery,
  GetSubSchemaItemsQueryReturnType,
} from 'src/features/sub-schema/queries/impl';
import {
  createSubSchemaTestingModule,
  prepareSubSchemaTest,
  PrepareSubSchemaTestResult,
} from './utils';
import { createEmptyFile } from 'src/__tests__/utils/prepareProject';
import { FileStatus } from 'src/features/plugin/file/consts';

describe('GetSubSchemaItemsHandler', () => {
  let prismaService: PrismaService;
  let queryBus: QueryBus;
  let transactionService: TransactionPrismaService;
  let draftApiService: DraftApiService;

  beforeAll(async () => {
    const result = await createSubSchemaTestingModule();
    prismaService = result.prismaService;
    queryBus = result.queryBus;
    transactionService = result.transactionService;
    draftApiService = result.draftApiService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  function runQuery(
    query: GetSubSchemaItemsQuery,
  ): Promise<GetSubSchemaItemsQueryReturnType> {
    return transactionService.run(() => queryBus.execute(query));
  }

  async function createTable(
    revisionId: string,
    tableId: string,
    schema: Prisma.InputJsonValue,
  ): Promise<void> {
    await transactionService.run(() =>
      draftApiService.apiCreateTable({ revisionId, tableId, schema }),
    );
  }

  async function createRow(
    revisionId: string,
    tableId: string,
    rowId: string,
    data: Prisma.InputJsonValue,
  ): Promise<void> {
    await transactionService.run(() =>
      draftApiService.apiCreateRow({ revisionId, tableId, rowId, data }),
    );
  }

  function createFileData() {
    return createEmptyFile();
  }

  function expectItem(item: {
    tableId: string;
    rowId: string;
    fieldPath: string;
  }) {
    return expect.objectContaining({
      table: expect.objectContaining({ id: item.tableId }),
      row: expect.objectContaining({ id: item.rowId }),
      fieldPath: item.fieldPath,
    });
  }

  describe('empty cases', () => {
    it('should return empty result when no tables exist', async () => {
      const { draftRevisionId } = await prepareSubSchemaTest(prismaService);

      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should return empty result when table has no matching $ref', async () => {
      const { draftRevisionId } = await prepareSubSchemaTest(prismaService);

      await createTable(
        draftRevisionId,
        'users',
        getObjectSchema({
          name: getStringSchema(),
        }),
      );

      await createRow(draftRevisionId, 'users', 'user-1', { name: 'John' });

      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(0);
    });
  });

  describe('single file field', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'assets',
        getObjectSchema({
          name: getStringSchema(),
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createRow(testData.draftRevisionId, 'assets', 'asset-1', {
        name: 'Asset 1',
        file: createFileData(),
      });

      await createRow(testData.draftRevisionId, 'assets', 'asset-2', {
        name: 'Asset 2',
        file: createFileData(),
      });
    });

    it('should return items with file references', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(2);
      expect(result.edges).toHaveLength(2);

      const items = result.edges.map((e) => e.node);
      expect(items).toEqual(
        expect.arrayContaining([
          expectItem({
            tableId: 'assets',
            rowId: 'asset-1',
            fieldPath: 'file',
          }),
          expectItem({
            tableId: 'assets',
            rowId: 'asset-2',
            fieldPath: 'file',
          }),
        ]),
      );
    });

    it('should include data in result', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      const asset1Item = result.edges.find((e) => e.node.row.id === 'asset-1');
      expect(asset1Item?.node.data).toHaveProperty('status');
      expect(asset1Item?.node.data).toHaveProperty('fileId');
    });

    it('should return data extracted from row.data by fieldPath', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      const item = result.edges.find((e) => e.node.row.id === 'asset-1');
      expect(item).toBeDefined();

      const rowData = item!.node.row.data as Record<string, unknown>;
      const fileFromRowData = rowData[item!.node.fieldPath];

      expect(item!.node.data).toEqual(fileFromRowData);
    });

    it('should include url from computeRows for uploaded files with hash', async () => {
      await createRow(testData.draftRevisionId, 'assets', 'asset-uploaded', {
        name: 'Uploaded Asset',
        file: createFileData(),
      });

      const table = await prismaService.table.findFirst({
        where: {
          id: 'assets',
          revisions: { some: { id: testData.draftRevisionId } },
        },
      });

      const row = await prismaService.row.findFirst({
        where: {
          id: 'asset-uploaded',
          tables: { some: { versionId: table?.versionId } },
        },
      });

      if (row) {
        const currentData = row.data as Record<string, unknown>;
        const currentFile = currentData.file as Record<string, unknown>;
        await prismaService.row.update({
          where: { versionId: row.versionId },
          data: {
            data: {
              ...currentData,
              file: {
                ...currentFile,
                status: FileStatus.uploaded,
                hash: 'test-hash-123',
                fileName: 'uploaded.png',
              },
            },
          },
        });
      }

      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      const uploadedItem = result.edges.find(
        (e) => e.node.row.id === 'asset-uploaded',
      );
      expect(uploadedItem).toBeDefined();
      expect(uploadedItem!.node.data.status).toBe(FileStatus.uploaded);
      expect(uploadedItem!.node.data.url).toBeDefined();
      expect(uploadedItem!.node.data.url).not.toBe('');

      const rowData = uploadedItem!.node.row.data as Record<string, unknown>;
      const fileFromRowData = rowData.file as Record<string, unknown>;
      expect(uploadedItem!.node.data.url).toBe(fileFromRowData.url);
    });
  });

  describe('array of files', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'gallery',
        getObjectSchema({
          title: getStringSchema(),
          images: getArraySchema(getRefSchema(SystemSchemaIds.File)),
        }),
      );

      await createRow(testData.draftRevisionId, 'gallery', 'gallery-1', {
        title: 'My Gallery',
        images: [createFileData(), createFileData(), createFileData()],
      });
    });

    it('should return each array element as separate item', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(3);

      const items = result.edges.map((e) => e.node);
      expect(items).toEqual(
        expect.arrayContaining([
          expectItem({
            tableId: 'gallery',
            rowId: 'gallery-1',
            fieldPath: 'images[0]',
          }),
          expectItem({
            tableId: 'gallery',
            rowId: 'gallery-1',
            fieldPath: 'images[1]',
          }),
          expectItem({
            tableId: 'gallery',
            rowId: 'gallery-1',
            fieldPath: 'images[2]',
          }),
        ]),
      );
    });
  });

  describe('nested object with file', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'products',
        getObjectSchema({
          name: getStringSchema(),
          media: getObjectSchema({
            thumbnail: getRefSchema(SystemSchemaIds.File),
            fullImage: getRefSchema(SystemSchemaIds.File),
          }),
        }),
      );

      await createRow(testData.draftRevisionId, 'products', 'product-1', {
        name: 'Product 1',
        media: {
          thumbnail: createFileData(),
          fullImage: createFileData(),
        },
      });
    });

    it('should return nested file fields with correct path', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(2);

      const items = result.edges.map((e) => e.node);
      expect(items).toEqual(
        expect.arrayContaining([
          expectItem({
            tableId: 'products',
            rowId: 'product-1',
            fieldPath: 'media.thumbnail',
          }),
          expectItem({
            tableId: 'products',
            rowId: 'product-1',
            fieldPath: 'media.fullImage',
          }),
        ]),
      );
    });
  });

  describe('array of objects with files', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'multi-assets',
        getObjectSchema({
          value: getObjectSchema({
            files: getArraySchema(
              getObjectSchema({
                file: getRefSchema(SystemSchemaIds.File),
              }),
            ),
          }),
        }),
      );

      await createRow(testData.draftRevisionId, 'multi-assets', 'multi-1', {
        value: {
          files: [{ file: createFileData() }, { file: createFileData() }],
        },
      });
    });

    it('should extract files from array of objects', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(2);

      const items = result.edges.map((e) => e.node);
      expect(items).toEqual(
        expect.arrayContaining([
          expectItem({
            tableId: 'multi-assets',
            rowId: 'multi-1',
            fieldPath: 'value.files[0].file',
          }),
          expectItem({
            tableId: 'multi-assets',
            rowId: 'multi-1',
            fieldPath: 'value.files[1].file',
          }),
        ]),
      );
    });
  });

  describe('filtering', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'table-a',
        getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createTable(
        testData.draftRevisionId,
        'table-b',
        getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createRow(testData.draftRevisionId, 'table-a', 'row-a1', {
        file: createFileData(),
      });
      await createRow(testData.draftRevisionId, 'table-a', 'row-a2', {
        file: createFileData(),
      });
      await createRow(testData.draftRevisionId, 'table-b', 'row-b1', {
        file: createFileData(),
      });
    });

    it('should filter by tableId', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          where: { tableId: 'table-a' },
        }),
      );

      expect(result.totalCount).toBe(2);
      expect(result.edges.every((e) => e.node.table.id === 'table-a')).toBe(
        true,
      );
    });

    it('should filter by rowId', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          where: { rowId: 'row-a1' },
        }),
      );

      expect(result.totalCount).toBe(1);
      expect(result.edges[0].node.row.id).toBe('row-a1');
    });

    it('should filter by tableId and rowId combined', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          where: { tableId: 'table-a', rowId: 'row-a2' },
        }),
      );

      expect(result.totalCount).toBe(1);
      expect(result.edges[0].node.table.id).toBe('table-a');
      expect(result.edges[0].node.row.id).toBe('row-a2');
    });

    it('should return empty when filter matches nothing', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          where: { tableId: 'non-existent' },
        }),
      );

      expect(result.totalCount).toBe(0);
    });
  });

  describe('sorting', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'alpha',
        getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createTable(
        testData.draftRevisionId,
        'beta',
        getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createRow(testData.draftRevisionId, 'alpha', 'row-2', {
        file: createFileData(),
      });
      await createRow(testData.draftRevisionId, 'alpha', 'row-1', {
        file: createFileData(),
      });
      await createRow(testData.draftRevisionId, 'beta', 'row-3', {
        file: createFileData(),
      });
    });

    it('should sort by tableId ascending', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          orderBy: [{ tableId: 'asc' }],
        }),
      );

      const tableIds = result.edges.map((e) => e.node.table.id);
      expect(tableIds[0]).toBe('alpha');
      expect(tableIds[1]).toBe('alpha');
      expect(tableIds[2]).toBe('beta');
    });

    it('should sort by tableId descending', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          orderBy: [{ tableId: 'desc' }],
        }),
      );

      const tableIds = result.edges.map((e) => e.node.table.id);
      expect(tableIds[0]).toBe('beta');
      expect(tableIds[1]).toBe('alpha');
      expect(tableIds[2]).toBe('alpha');
    });

    it('should sort by rowId ascending', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          orderBy: [{ rowId: 'asc' }],
        }),
      );

      const rowIds = result.edges.map((e) => e.node.row.id);
      expect(rowIds).toEqual(['row-1', 'row-2', 'row-3']);
    });

    it('should sort by rowId descending', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
          orderBy: [{ rowId: 'desc' }],
        }),
      );

      const rowIds = result.edges.map((e) => e.node.row.id);
      expect(rowIds).toEqual(['row-3', 'row-2', 'row-1']);
    });
  });

  describe('pagination', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'paginated',
        getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      for (let i = 1; i <= 5; i++) {
        await createRow(testData.draftRevisionId, 'paginated', `row-${i}`, {
          file: createFileData(),
        });
      }
    });

    it('should respect first parameter', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 2,
        }),
      );

      expect(result.totalCount).toBe(5);
      expect(result.edges).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it('should paginate with after cursor', async () => {
      const firstPage = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 2,
        }),
      );

      const secondPage = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 2,
          after: firstPage.pageInfo.endCursor ?? undefined,
        }),
      );

      expect(secondPage.edges).toHaveLength(2);
      expect(secondPage.pageInfo.hasNextPage).toBe(true);

      const firstPageRowIds = firstPage.edges.map((e) => e.node.row.id);
      const secondPageRowIds = secondPage.edges.map((e) => e.node.row.id);
      expect(firstPageRowIds).not.toEqual(secondPageRowIds);
    });

    it('should indicate no more pages', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 10,
        }),
      );

      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('multiple tables with files', () => {
    let testData: PrepareSubSchemaTestResult;

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'users',
        getObjectSchema({
          avatar: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createTable(
        testData.draftRevisionId,
        'documents',
        getObjectSchema({
          attachment: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createRow(testData.draftRevisionId, 'users', 'user-1', {
        avatar: createFileData(),
      });
      await createRow(testData.draftRevisionId, 'users', 'user-2', {
        avatar: createFileData(),
      });
      await createRow(testData.draftRevisionId, 'documents', 'doc-1', {
        attachment: createFileData(),
      });
    });

    it('should return files from all tables', async () => {
      const result = await runQuery(
        new GetSubSchemaItemsQuery({
          revisionId: testData.draftRevisionId,
          schemaId: SystemSchemaIds.File,
          first: 100,
        }),
      );

      expect(result.totalCount).toBe(3);

      const tableIds = [...new Set(result.edges.map((e) => e.node.table.id))];
      expect(tableIds).toContain('users');
      expect(tableIds).toContain('documents');
    });
  });

  describe('data field filters (universal contract)', () => {
    let testData: PrepareSubSchemaTestResult;

    async function createRowWithFile(
      rowId: string,
      fileOverrides: Partial<ReturnType<typeof createEmptyFile>>,
    ): Promise<void> {
      await createRow(testData.draftRevisionId, 'files-table', rowId, {
        file: createFileData(),
      });

      const table = await prismaService.table.findFirst({
        where: {
          id: 'files-table',
          revisions: { some: { id: testData.draftRevisionId } },
        },
      });

      const row = await prismaService.row.findFirst({
        where: {
          id: rowId,
          tables: { some: { versionId: table?.versionId } },
        },
      });

      if (row) {
        const currentData = row.data as Record<string, unknown>;
        const currentFile = currentData.file as Record<string, unknown>;
        await prismaService.row.update({
          where: { versionId: row.versionId },
          data: {
            data: {
              file: { ...currentFile, ...fileOverrides },
            },
          },
        });
      }
    }

    beforeAll(async () => {
      testData = await prepareSubSchemaTest(prismaService);

      await createTable(
        testData.draftRevisionId,
        'files-table',
        getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      );

      await createRowWithFile('img-row', {
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 50 * 1024,
        status: 'uploaded',
      });

      await createRowWithFile('doc-row', {
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 500 * 1024,
        status: 'uploaded',
      });

      await createRowWithFile('audio-row', {
        fileName: 'song.mp3',
        mimeType: 'audio/mpeg',
        size: 5 * 1024 * 1024,
        status: 'ready',
      });

      await createRowWithFile('video-row', {
        fileName: 'video.mp4',
        mimeType: 'video/mp4',
        size: 50 * 1024 * 1024,
        status: 'uploaded',
      });
    });

    describe('string_contains filter on data path', () => {
      it('should filter by fileName containing substring', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'fileName', string_contains: 'photo' } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('photo.jpg');
      });

      it('should return empty when no match', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: {
              data: { path: 'fileName', string_contains: 'nonexistent' },
            },
          }),
        );

        expect(result.totalCount).toBe(0);
      });
    });

    describe('string_starts_with filter on data path', () => {
      it('should filter by mimeType starting with image/', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'mimeType', string_starts_with: 'image/' } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.mimeType).toBe('image/jpeg');
      });

      it('should filter by mimeType starting with audio/', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'mimeType', string_starts_with: 'audio/' } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.mimeType).toBe('audio/mpeg');
      });

      it('should filter by mimeType starting with video/', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'mimeType', string_starts_with: 'video/' } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.mimeType).toBe('video/mp4');
      });
    });

    describe('equals filter on data path', () => {
      it('should filter by status equals uploaded', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'status', equals: 'uploaded' } },
          }),
        );

        expect(result.totalCount).toBe(3);
        expect(
          result.edges.every((e) => e.node.data.status === 'uploaded'),
        ).toBe(true);
      });

      it('should filter by status equals ready', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'status', equals: 'ready' } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.status).toBe('ready');
      });
    });

    describe('numeric filters on data path', () => {
      it('should filter small files (< 100KB)', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'size', lt: 100 * 1024 } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('photo.jpg');
      });

      it('should filter medium files (100KB - 1MB)', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: {
              AND: [
                { data: { path: 'size', gte: 100 * 1024 } },
                { data: { path: 'size', lt: 1024 * 1024 } },
              ],
            },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('document.pdf');
      });

      it('should filter large files (1MB - 10MB)', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: {
              AND: [
                { data: { path: 'size', gte: 1024 * 1024 } },
                { data: { path: 'size', lt: 10 * 1024 * 1024 } },
              ],
            },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('song.mp3');
      });

      it('should filter xlarge files (> 10MB)', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: { data: { path: 'size', gte: 10 * 1024 * 1024 } },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('video.mp4');
      });
    });

    describe('combined filters with AND/OR', () => {
      it('should combine mimeType and status using AND', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: {
              AND: [
                { data: { path: 'mimeType', string_starts_with: 'audio/' } },
                { data: { path: 'status', equals: 'ready' } },
              ],
            },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('song.mp3');
      });

      it('should combine fileName and size filters', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: {
              AND: [
                { data: { path: 'fileName', string_contains: 'video' } },
                { data: { path: 'size', gte: 10 * 1024 * 1024 } },
              ],
            },
          }),
        );

        expect(result.totalCount).toBe(1);
        expect(result.edges[0].node.data.fileName).toBe('video.mp4');
      });

      it('should use OR to match multiple mimeTypes', async () => {
        const result = await runQuery(
          new GetSubSchemaItemsQuery({
            revisionId: testData.draftRevisionId,
            schemaId: SystemSchemaIds.File,
            first: 100,
            where: {
              OR: [
                { data: { path: 'mimeType', string_starts_with: 'image/' } },
                { data: { path: 'mimeType', string_starts_with: 'video/' } },
              ],
            },
          }),
        );

        expect(result.totalCount).toBe(2);
        const mimeTypes = result.edges.map((e) => e.node.data.mimeType);
        expect(mimeTypes).toContain('image/jpeg');
        expect(mimeTypes).toContain('video/mp4');
      });
    });
  });
});
