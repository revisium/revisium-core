import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import {
  createTestingModule,
  testSchemaWithRef,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import { CreateTableCommand } from 'src/features/draft/commands/impl/create-table.command';
import { CreateTableHandlerReturnType } from 'src/features/draft/commands/types/create-table.handler.types';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { TableApiService } from 'src/features/table/table-api.service';
import { FormulaService } from 'src/features/plugin/formula';

describe('CreateTableHandler', () => {
  it('should throw an error if the tableId is shorter than 1 character', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: '',
      schema: { type: 'string', default: '' },
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Table ID must be 1 to 64 characters, start with a letter or underscore, and contain only letters (a-z, A-Z), digits (0-9), underscores (_), and hyphens (-).',
    );
  });

  it('should throw an error if the revision does not exist', async () => {
    await prepareProject(prismaService);

    jest
      .spyOn(draftTransactionalCommands, 'resolveDraftRevision')
      .mockRejectedValue(new Error('Revision not found'));

    const command = new CreateTableCommand({
      revisionId: 'unreal',
      tableId: 'tableId',
      schema: {},
    });

    await expect(runTransaction(command)).rejects.toThrow('Revision not found');
  });

  it('should throw an error if a similar table already exists', async () => {
    const { tableId, draftRevisionId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId,
      schema: { type: 'string', default: '' },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'A table with this name already exists in the revision',
    );
  });

  it('should throw an error if the schema is invalid', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'tableId',
      schema: { type: 'invalidType' },
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'this type is not allowed',
    );
  });

  it('should throw an error if the schema contains self-referencing foreignKey', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'locations',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: '' },
          parentId: { type: 'string', default: '', foreignKey: 'locations' },
        },
        additionalProperties: false,
        required: ['name', 'parentId'],
      },
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Self-referencing foreignKey is not supported',
    );
  });

  it('should throw an error if the schema contains nested self-referencing foreignKey', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'nodes',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: '' },
          children: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                childId: { type: 'string', default: '', foreignKey: 'nodes' },
              },
              additionalProperties: false,
              required: ['childId'],
            },
          },
        },
        additionalProperties: false,
        required: ['name', 'children'],
      },
    });

    await expect(runTransaction(command)).rejects.toThrow(BadRequestException);
    await expect(runTransaction(command)).rejects.toThrow(
      'Self-referencing foreignKey is not supported',
    );
  });

  it('should create a new table if conditions are met', async () => {
    const { draftRevisionId, branchId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'config',
      schema: { type: 'string', default: '' },
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.revisionId).toBe(draftRevisionId);
    expect(result.tableVersionId).toBeTruthy();

    const table = await tableApiService.getTable({
      revisionId: draftRevisionId,
      tableId: 'config',
    });
    expect(table).not.toBeNull();
  });

  it('should create table with ref', async () => {
    const { draftRevisionId, branchId } = await prepareProject(prismaService);

    const command = new CreateTableCommand({
      revisionId: draftRevisionId,
      tableId: 'config',
      schema: testSchemaWithRef,
    });

    const result = await runTransaction(command);

    expect(result.branchId).toBe(branchId);
    expect(result.revisionId).toBe(draftRevisionId);
    expect(result.tableVersionId).toBeTruthy();

    const table = await tableApiService.getTable({
      revisionId: draftRevisionId,
      tableId: 'config',
    });
    expect(table).not.toBeNull();
  });

  describe('formula validation', () => {
    beforeEach(() => {
      jest.spyOn(formulaService, 'isAvailable', 'get').mockReturnValue(true);
    });

    it('should create table with valid formula', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      const command = new CreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'products',
        schema: {
          type: 'object',
          properties: {
            price: { type: 'number', default: 0 },
            quantity: { type: 'number', default: 0 },
            total: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'price * quantity' },
            },
          },
          additionalProperties: false,
          required: ['price', 'quantity', 'total'],
        },
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });

    it('should throw error for invalid formula syntax', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      const command = new CreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'products',
        schema: {
          type: 'object',
          properties: {
            price: { type: 'number', default: 0 },
            total: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'price * * 2' },
            },
          },
          additionalProperties: false,
          required: ['price', 'total'],
        },
      });

      await expect(runTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runTransaction(command)).rejects.toThrow(
        'formula validation failed',
      );
    });

    it('should throw error for formula referencing non-existent field', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      const command = new CreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'products',
        schema: {
          type: 'object',
          properties: {
            price: { type: 'number', default: 0 },
            total: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'nonExistent * 2' },
            },
          },
          additionalProperties: false,
          required: ['price', 'total'],
        },
      });

      await expect(runTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runTransaction(command)).rejects.toThrow(
        'formula validation failed',
      );
    });

    it('should throw error for circular dependency in formulas', async () => {
      const { draftRevisionId } = await prepareProject(prismaService);

      const command = new CreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'products',
        schema: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'b + 1' },
            },
            b: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'a + 1' },
            },
          },
          additionalProperties: false,
          required: ['a', 'b'],
        },
      });

      await expect(runTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runTransaction(command)).rejects.toThrow(
        'formula validation failed',
      );
    });

    it('should skip formula validation when formula feature is disabled', async () => {
      jest.spyOn(formulaService, 'isAvailable', 'get').mockReturnValue(false);

      const { draftRevisionId } = await prepareProject(prismaService);

      const command = new CreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'products',
        schema: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              default: 0,
              readOnly: true,
              'x-formula': { version: 1, expression: 'invalid * * syntax' },
            },
          },
          additionalProperties: false,
          required: ['total'],
        },
      });

      const result = await runTransaction(command);
      expect(result.tableVersionId).toBeTruthy();
    });

    it('should throw error for field with both x-formula and foreignKey', async () => {
      const { draftRevisionId, tableId } = await prepareProject(prismaService);

      const command = new CreateTableCommand({
        revisionId: draftRevisionId,
        tableId: 'products',
        schema: {
          type: 'object',
          properties: {
            price: { type: 'number', default: 0 },
            refId: {
              type: 'string',
              default: '',
              foreignKey: tableId,
              readOnly: true,
              'x-formula': { version: 1, expression: 'price' },
            },
          },
          additionalProperties: false,
          required: ['price', 'refId'],
        },
      });

      await expect(runTransaction(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(runTransaction(command)).rejects.toThrow(
        'schema is not valid',
      );
    });
  });

  function runTransaction(
    command: CreateTableCommand,
  ): Promise<CreateTableHandlerReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;
  let draftTransactionalCommands: DraftTransactionalCommands;
  let tableApiService: TableApiService;
  let formulaService: FormulaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
    draftTransactionalCommands = result.draftTransactionalCommands;
    tableApiService = result.module.get<TableApiService>(TableApiService);
    formulaService = result.module.get<FormulaService>(FormulaService);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
