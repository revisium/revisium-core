import { CommandBus } from '@nestjs/cqrs';
import * as objectHash from 'object-hash';
import { prepareProject } from 'src/__tests__/utils/prepareProject';
import {
  createTestingModule,
  invalidTestSchema,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  CreateSchemaCommand,
  CreateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/create-schema.command';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { JsonPatchAdd } from '@revisium/schema-toolkit/types';
import { JsonSchema } from '@revisium/schema-toolkit/types';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('CreateSchemaHandler', () => {
  it('should throw an error if the data is invalid', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const tableId = 'newTableId';
    const command = new CreateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      data: {} as JsonSchema,
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should throw an error if there is invalid field name', async () => {
    const { draftRevisionId } = await prepareProject(prismaService);

    const tableId = 'newTableId';
    const command = new CreateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      data: invalidTestSchema,
    });

    await expect(runTransaction(command)).rejects.toThrow(
      'Invalid field names: 123, $ver. It must contain between',
    );
  });

  it('should create a new schema if conditions are met', async () => {
    const ids = await prepareProject(prismaService);
    const { draftRevisionId } = ids;
    const tableId = 'newTableId';

    const command = new CreateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      data: testSchema,
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
    expect(schemaRow.data).toStrictEqual(testSchema);
    expect(schemaRow.meta).toStrictEqual([
      {
        patches: [{ op: 'add', path: '', value: testSchema } as JsonPatchAdd],
        hash: objectHash(testSchema),
        date: expect.any(String),
      },
    ]);
    expect(schemaRow.hash).toBe(objectHash(testSchema));
    expect(schemaRow.schemaHash).toBe(objectHash(metaSchema));
  });

  function runTransaction(
    command: CreateSchemaCommand,
  ): Promise<CreateSchemaCommandReturnType> {
    return transactionService.run(async () => commandBus.execute(command));
  }

  let prismaService: PrismaService;
  let commandBus: CommandBus;
  let transactionService: TransactionPrismaService;

  beforeAll(async () => {
    const result = await createTestingModule();
    prismaService = result.prismaService;
    commandBus = result.commandBus;
    transactionService = result.transactionService;
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });
});
