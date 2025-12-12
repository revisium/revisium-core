import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { createTestingModule } from 'src/features/draft/commands/handlers/__tests__/utils';
import { UpdateTableViewsCommand } from 'src/features/views/commands/impl';
import { DEFAULT_VIEW_ID, TableViewsData } from 'src/features/views/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaTypeName } from '@revisium/schema-toolkit/types';

describe('UpdateTableViewsHandler', () => {
  describe('validation', () => {
    describe('defaultViewId validation', () => {
      it('should throw error when defaultViewId does not exist in views', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData: TableViewsData = {
          version: 1,
          defaultViewId: 'non-existent',
          views: [{ id: 'default', name: 'Default' }],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData,
            }),
          ),
        ).rejects.toThrow(
          'Default view "non-existent" does not exist in views list',
        );
      });

      it('should accept valid defaultViewId', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'custom',
          views: [{ id: 'custom', name: 'Custom' }],
        };

        const result = await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: validData,
          }),
        );

        expect(result).toBe(true);
      });
    });

    describe('unique view IDs validation', () => {
      it('should throw error when view IDs are not unique', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData: TableViewsData = {
          version: 1,
          defaultViewId: 'duplicate',
          views: [
            { id: 'duplicate', name: 'First' },
            { id: 'duplicate', name: 'Second' },
          ],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData,
            }),
          ),
        ).rejects.toThrow('View IDs must be unique');
      });
    });

    describe('schema validation', () => {
      it('should throw error for invalid version type', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 'not-a-number',
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default' }],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as unknown as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error for version less than 1', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 0,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default' }],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error for view with empty id', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 1,
          defaultViewId: '',
          views: [{ id: '', name: 'View' }],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error for view with name exceeding max length', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const longName = 'a'.repeat(101);
        const invalidData = {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: longName }],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error for column with empty field', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              columns: [{ field: '' }],
            },
          ],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should accept null columns (default columns)', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              columns: null,
            },
          ],
        };

        const result = await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: validData,
          }),
        );

        expect(result).toBe(true);
      });

      it('should accept empty columns array (user hid all columns)', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              columns: [],
            },
          ],
        };

        const result = await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: validData,
          }),
        );

        expect(result).toBe(true);
      });

      it('should throw error for column width less than minimum', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              columns: [{ field: 'id', width: 10 }],
            },
          ],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error for invalid sort direction', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              sorts: [{ field: 'id', direction: 'invalid' }],
            },
          ],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as unknown as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw error for invalid filter operator', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const invalidData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            {
              id: 'default',
              name: 'Default',
              filters: {
                logic: 'and',
                conditions: [{ field: 'id', operator: 'invalid_operator' }],
              },
            },
          ],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: draftRevisionId,
              tableId,
              viewsData: invalidData as unknown as TableViewsData,
            }),
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('valid complex views', () => {
      it('should accept views with all optional fields', async () => {
        const { draftRevisionId, tableId, schemaTableVersionId } =
          await prepareProject(prismaService);

        // Update schema with fields for complex view
        await prismaService.row.updateMany({
          where: {
            id: tableId,
            tables: { some: { versionId: schemaTableVersionId } },
          },
          data: {
            data: {
              type: JsonSchemaTypeName.Object,
              properties: {
                title: { type: JsonSchemaTypeName.String, default: '' },
                status: { type: JsonSchemaTypeName.String, default: '' },
                views: { type: JsonSchemaTypeName.Number, default: 0 },
                category: { type: JsonSchemaTypeName.String, default: '' },
                meta: {
                  type: JsonSchemaTypeName.Object,
                  properties: {
                    author: { type: JsonSchemaTypeName.String, default: '' },
                    publishedAt: {
                      type: JsonSchemaTypeName.String,
                      default: '',
                    },
                  },
                  additionalProperties: false,
                  required: ['author', 'publishedAt'],
                },
              },
              additionalProperties: false,
              required: ['title', 'status', 'views', 'category', 'meta'],
            },
          },
        });

        const complexData: TableViewsData = {
          version: 1,
          defaultViewId: 'complex',
          views: [
            {
              id: 'complex',
              name: 'Complex View',
              description: 'A complex view with all fields',
              columns: [
                { field: 'id', width: 150 },
                { field: 'data.title', width: 300 },
                { field: 'data.meta.author' },
              ],
              filters: {
                logic: 'and',
                conditions: [
                  {
                    field: 'data.status',
                    operator: 'equals',
                    value: 'published',
                  },
                  { field: 'data.views', operator: 'greater_than', value: 100 },
                ],
                groups: [
                  {
                    logic: 'or',
                    conditions: [
                      {
                        field: 'data.category',
                        operator: 'equals',
                        value: 'tech',
                      },
                      {
                        field: 'data.category',
                        operator: 'equals',
                        value: 'science',
                      },
                    ],
                  },
                ],
              },
              sorts: [
                { field: 'data.meta.publishedAt', direction: 'desc' },
                { field: 'id', direction: 'asc' },
              ],
              search: 'test query',
            },
          ],
        };

        const result = await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: complexData,
          }),
        );

        expect(result).toBe(true);
      });

      it('should accept multiple views', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const multiViewData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [
            { id: 'default', name: 'Default' },
            { id: 'published', name: 'Published' },
            { id: 'draft', name: 'Draft' },
            { id: 'archived', name: 'Archived' },
          ],
        };

        const result = await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: multiViewData,
          }),
        );

        expect(result).toBe(true);
      });

      it('should accept empty views array with default view', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        const defaultData: TableViewsData = {
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

        const result = await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: defaultData,
          }),
        );

        expect(result).toBe(true);
      });
    });

    describe('draft revision validation', () => {
      it('should throw error when revision is not a draft', async () => {
        const { headRevisionId, tableId } = await prepareProject(prismaService);

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default' }],
        };

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: headRevisionId,
              tableId,
              viewsData: validData,
            }),
          ),
        ).rejects.toThrow('The revision is not a draft');
      });

      it('should throw error when revision does not exist', async () => {
        const { tableId } = await prepareProject(prismaService);

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default' }],
        };

        jest
          .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
          .mockRejectedValue(new Error('Revision not found'));

        await expect(
          runTransaction(
            new UpdateTableViewsCommand({
              revisionId: 'non-existent-revision',
              tableId,
              viewsData: validData,
            }),
          ),
        ).rejects.toThrow('Revision not found');
      });
    });

    describe('hasChanges flag', () => {
      it('should set hasChanges to true after updating views', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        // Reset hasChanges to false before test
        await prismaService.revision.update({
          where: { id: draftRevisionId },
          data: { hasChanges: false },
        });

        // Ensure hasChanges is false before
        const revisionBefore = await prismaService.revision.findFirstOrThrow({
          where: { id: draftRevisionId },
        });
        expect(revisionBefore.hasChanges).toBe(false);

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default' }],
        };

        await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: validData,
          }),
        );

        // Verify hasChanges is now true
        const revisionAfter = await prismaService.revision.findFirstOrThrow({
          where: { id: draftRevisionId },
        });
        expect(revisionAfter.hasChanges).toBe(true);
      });

      it('should not change hasChanges if already true', async () => {
        const { draftRevisionId, tableId } =
          await prepareProject(prismaService);

        // Set hasChanges to true before
        await prismaService.revision.update({
          where: { id: draftRevisionId },
          data: { hasChanges: true },
        });

        const validData: TableViewsData = {
          version: 1,
          defaultViewId: 'default',
          views: [{ id: 'default', name: 'Default' }],
        };

        await runTransaction(
          new UpdateTableViewsCommand({
            revisionId: draftRevisionId,
            tableId,
            viewsData: validData,
          }),
        );

        // Verify hasChanges is still true
        const revisionAfter = await prismaService.revision.findFirstOrThrow({
          where: { id: draftRevisionId },
        });
        expect(revisionAfter.hasChanges).toBe(true);
      });
    });
  });

  function runTransaction(command: UpdateTableViewsCommand): Promise<boolean> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
