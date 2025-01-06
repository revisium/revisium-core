import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { QueryHandlerType } from '@nestjs/cqrs/dist/query-bus';
import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'async_hooks';
import { nanoid } from 'nanoid';
import { PROJECT_HANDLERS } from 'src/features/project/commands/handlers/index';
import { PROJECT_QUERIES } from 'src/features/project/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';

export const createTestingModule = async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [DatabaseModule, CqrsModule, ShareModule, NotificationModule],
    providers: [
      {
        provide: AsyncLocalStorage,
        useValue: new AsyncLocalStorage(),
      },
      ...PROJECT_HANDLERS,
      ...PROJECT_QUERIES,
    ],
  }).compile();

  const prismaService = module.get(PrismaService);

  const commandBus = module.get(CommandBus);
  commandBus.register([...PROJECT_HANDLERS]);

  const queryBus = module.get(QueryBus);
  queryBus.register([...(PROJECT_QUERIES as QueryHandlerType[])]);

  const transactionService = module.get(TransactionPrismaService);
  const shareTransactionalQueries = module.get(ShareTransactionalQueries);

  return {
    module,
    prismaService,
    commandBus,
    transactionService,
    shareTransactionalQueries,
  };
};

export type PrepareProjectReturnType = {
  organizationId: string;
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  headRevisionId: string;
  draftRevisionId: string;
  headChangelogId: string;
  draftChangelogId: string;
  schemaTableVersionId: string;
  tableId: string;
  headTableVersionId: string;
  draftTableVersionId: string;
};

export const prepareProject = async (
  prismaService: PrismaService,
): Promise<PrepareProjectReturnType> => {
  const organizationId = nanoid();
  const projectId = nanoid();
  const projectName = `name-${projectId}`;
  const branchId = nanoid();
  const branchName = `name-${branchId}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();
  const headChangelogId = nanoid();
  const draftChangelogId = nanoid();

  const schemaTableVersionId = nanoid();
  const tableId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();

  // changelog
  await prismaService.changelog.create({
    data: {
      id: headChangelogId,
    },
  });

  await prismaService.changelog.create({
    data: {
      id: draftChangelogId,
    },
  });

  // branch / project / organization / revisions
  await prismaService.branch.create({
    data: {
      id: branchId,
      name: branchName,
      project: {
        create: {
          id: projectId,
          name: projectName,
          organization: {
            create: {
              id: organizationId,
            },
          },
        },
      },
      revisions: {
        createMany: {
          data: [
            {
              id: headRevisionId,
              isHead: true,
              changelogId: headChangelogId,
            },
            {
              id: draftRevisionId,
              parentId: headRevisionId,
              isDraft: true,
              changelogId: draftChangelogId,
            },
          ],
        },
      },
    },
  });

  // schema table
  await prismaService.table.create({
    data: {
      id: SystemTables.Schema,
      versionId: schemaTableVersionId,
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
      },
    },
  });

  // table
  await prismaService.table.create({
    data: {
      id: tableId,
      versionId: headTableVersionId,
      readonly: true,
      revisions: {
        connect: { id: headRevisionId },
      },
    },
  });
  await prismaService.table.create({
    data: {
      id: tableId,
      versionId: draftTableVersionId,
      readonly: false,
      revisions: {
        connect: { id: draftRevisionId },
      },
    },
  });

  return {
    organizationId,
    projectId,
    projectName,
    branchId,
    branchName,
    headRevisionId,
    draftRevisionId,
    headChangelogId,
    draftChangelogId,
    schemaTableVersionId,
    tableId,
    headTableVersionId,
    draftTableVersionId,
  };
};

export const createMock = <T>(mockResolvedValue: T) =>
  mockResolvedValue instanceof Error
    ? jest.fn().mockRejectedValue(mockResolvedValue)
    : jest.fn().mockResolvedValue(mockResolvedValue);
