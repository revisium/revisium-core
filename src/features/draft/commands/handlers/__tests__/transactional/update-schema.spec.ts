import { CommandBus } from '@nestjs/cqrs';
import * as objectHash from 'object-hash';
import {
  createTestingModule,
  prepareBranch,
  testSchema,
} from 'src/features/draft/commands/handlers/__tests__/utils';
import {
  UpdateSchemaCommand,
  UpdateSchemaCommandReturnType,
} from 'src/features/draft/commands/impl/transactional/update-schema.command';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';

describe('UpdateSchemaHandler', () => {
  it('should throw an error if the data is invalid', async () => {
    const { draftRevisionId, tableId } = await prepareBranch(prismaService);

    const command = new UpdateSchemaCommand({
      revisionId: draftRevisionId,
      tableId,
      data: {},
    });

    await expect(runTransaction(command)).rejects.toThrow('data is not valid');
  });

  it('should update the schema if conditions are met', async () => {
    const ids = await prepareBranch(prismaService);
    const { draftRevisionId, tableId } = ids;

    const command = new UpdateSchemaCommand({
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
    expect(schemaRow.hash).toBe(objectHash(testSchema));
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
