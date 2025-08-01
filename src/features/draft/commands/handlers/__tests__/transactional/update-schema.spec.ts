import { CommandBus } from '@nestjs/cqrs';
import * as hash from 'object-hash';
import * as objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  invalidTestSchema,
  testSchema,
  testSchemaString,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/update-schema.command';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import {
  JsonPatchAdd,
  JsonPatchReplace,
} from 'src/features/share/utils/schema/types/json-patch.types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('UpdateSchemaHandler', () => {
  it('should throw an error if the data is invalid', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      schema: {},
      patches: [
        {
          op: 'replace',
          path: '',
          value: testSchemaString,
        } as JsonPatchReplace,
        { op: 'add', path: '', value: testSchema } as JsonPatchAdd,
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should throw an error if the patches are invalid', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      schema: testSchema,
      patches: [
        {
          op: 'replace',
          path: '',
          value: testSchemaString,
        } as JsonPatchReplace,
        { op: 'add', path: '' } as JsonPatchAdd,
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'tableMigrations are not valid',
    );
  });

  it('should throw an error if there is invalid field name', async () => {
    const { draftRevisionId, tableId } = await prepareProject(prismaService);

    const command = new UpdateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      schema: testSchemaString,
      patches: [
        {
          op: 'replace',
          path: '',
          value: testSchemaString,
        } as JsonPatchReplace,
        {
          op: 'replace',
          path: '',
          value: invalidTestSchema,
        } as JsonPatchReplace,
        {
          op: 'replace',
          path: '',
          value: testSchemaString,
        } as JsonPatchReplace,
      ],
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Invalid field names: 123, $ver. It must contain between',
    );
  });

  it('should update the schema if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId, tableId, tableCreatedId } = ids;

    const command = new UpdateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      schema: testSchemaString,
      patches: [
        {
          op: 'replace',
          path: '',
          value: testSchemaString,
        } as JsonPatchReplace,
        {
          op: 'replace',
          path: '',
          value: testSchema,
        } as JsonPatchReplace,
        {
          op: 'replace',
          path: '',
          value: testSchemaString,
        } as JsonPatchReplace,
      ],
    });

    const result = await runTransaction(command);

    const schemaRow = await prismaService.row.findFirstOrThrow({
      where: {
        id: tableId,
        tables: {
          some: {
            id: SystemTables.Schema,
            revisions: {
              some: {
                id: draftRevisionId,
              },
            },
          },
        },
      },
    });
    expect(result).toBe(true);
    expect(schemaRow.data).toStrictEqual(testSchemaString);
    expect(schemaRow.meta).toStrictEqual({
      createdId: tableCreatedId,
      initMigration: {
        changeType: 'init',
        date: expect.any(String),
        hash: hash(testSchema),
        schema: testSchema,
        tableId,
      },
      migrations: [
        {
          changeType: 'update',
          date: expect.any(String),
          hash: hash(testSchemaString),
          patches: [
            {
              op: 'replace',
              path: '',
              value: testSchemaString,
            } as JsonPatchReplace,
            {
              op: 'replace',
              path: '',
              value: testSchema,
            } as JsonPatchReplace,
            {
              op: 'replace',
              path: '',
              value: testSchemaString,
            } as JsonPatchReplace,
          ],
        },
      ],
    });
    expect(schemaRow.hash).toBe(objectHash(testSchemaString));
    expect(schemaRow.schemaHash).toBe(objectHash(metaSchema));
  });

  function runTransaction(
    command: UpdateSchemaCommand,
  ): Promise<UpdateSchemaCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeEach(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterEach(async () => {
    await prismaService.$disconnect();
  });
});
