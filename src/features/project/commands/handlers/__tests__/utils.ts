import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'async_hooks';
import { nanoid } from 'nanoid';
import { AppOptionsModule } from 'src/core/app-options.module';
import { PROJECT_HANDLERS } from 'src/features/project/commands/handlers/index';
import { PROJECT_QUERIES } from 'src/features/project/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';

export const createTestingModule = async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      ShareModule,
      AppOptionsModule.forRoot({ mode: 'monolith' }),
      NotificationModule,
    ],
    providers: [
      {
        provide: AsyncLocalStorage,
        useValue: new AsyncLocalStorage(),
      },
      ...PROJECT_HANDLERS,
      ...PROJECT_QUERIES,
    ],
  }).compile();

  await module.init();

  const prismaService = module.get(PrismaService);

  const commandBus = module.get(CommandBus);

  const transactionService = module.get(TransactionPrismaService);
  const shareTransactionalQueries = module.get(ShareTransactionalQueries);
  const endpointNotificationService = module.get(EndpointNotificationService);

  return {
    module,
    prismaService,
    commandBus,
    transactionService,
    shareTransactionalQueries,
    endpointNotificationService,
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
  schemaTableCreatedId: string;
  tableId: string;
  tableCreatedId: string;
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
  const schemaTableCreatedId = nanoid();
  const sharedSchemasTableVersionId = nanoid();
  const sharedSchemasTableCreatedId = nanoid();
  const migrationTableVersionId = nanoid();
  const migrationTableCreatedId = nanoid();
  const tableId = nanoid();
  const tableCreatedId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();

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
              isHead: true,
            },
            {
              id: draftRevisionId,
              parentId: headRevisionId,
              isDraft: true,
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
      createdId: schemaTableCreatedId,
      versionId: schemaTableVersionId,
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
      },
    },
  });
  await prismaService.table.create({
    data: {
      id: SystemTables.SharedSchemas,
      createdId: sharedSchemasTableCreatedId,
      versionId: sharedSchemasTableVersionId,
      readonly: true,
      system: true,
      revisions: {
        connect: [{ id: headRevisionId }, { id: draftRevisionId }],
      },
    },
  });
  await prismaService.table.create({
    data: {
      id: SystemTables.Migration,
      createdId: migrationTableCreatedId,
      versionId: migrationTableVersionId,
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
      createdId: tableCreatedId,
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
      createdId: tableCreatedId,
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
    schemaTableCreatedId,
    tableId,
    tableCreatedId,
    headTableVersionId,
    draftTableVersionId,
  };
};

export const createMock = <T>(mockResolvedValue: T) =>
  mockResolvedValue instanceof Error
    ? jest.fn().mockRejectedValue(mockResolvedValue)
    : jest.fn().mockResolvedValue(mockResolvedValue);
