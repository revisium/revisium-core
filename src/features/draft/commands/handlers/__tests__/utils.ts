import { CacheModule } from '@nestjs/cache-manager';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { TABLE_COMMANDS_HANDLERS } from 'src/features/draft/commands/handlers/index';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DRAFT_REQUEST_DTO } from 'src/features/draft/draft-request-dto';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { SHARE_COMMANDS_HANDLERS } from 'src/features/share/commands/handlers';
import { SHARE_QUERIES_HANDLERS } from 'src/features/share/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';

export const testSchema = {
  type: 'object',
  required: ['test'],
  properties: {
    test: {
      type: 'string',
      default: '',
    },
  },
  additionalProperties: false,
};

export const createTestingModule = async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      ShareModule,
      NotificationModule,
      CacheModule.register(),
    ],
    providers: [
      DraftTransactionalCommands,
      SessionChangelogService,
      DraftContextService,
      JsonSchemaValidatorService,
      ...DRAFT_REQUEST_DTO,
      ...TABLE_COMMANDS_HANDLERS,
    ],
  }).compile();

  const prismaService = module.get(PrismaService);

  const commandBus = module.get(CommandBus);
  commandBus.register([...TABLE_COMMANDS_HANDLERS, ...SHARE_COMMANDS_HANDLERS]);

  const queryBus = module.get(QueryBus);
  queryBus.register([...SHARE_QUERIES_HANDLERS]);

  const transactionService = module.get(TransactionPrismaService);
  const shareTransactionalQueries = module.get(ShareTransactionalQueries);
  const shareTransactionalCommands = module.get(ShareTransactionalCommands);
  const draftTransactionalCommands = module.get(DraftTransactionalCommands);

  return {
    module,
    prismaService,
    commandBus,
    transactionService,
    shareTransactionalQueries,
    shareTransactionalCommands,
    draftTransactionalCommands,
  };
};

export type PrepareBranchReturnType = {
  organizationId: string;
  projectId: string;
  projectName: string;
  branchId: string;
  branchName: string;
  headRevisionId: string;
  draftRevisionId: string;
  headChangelogId: string;
  draftChangelogId: string;
  tableId: string;
  headTableVersionId: string;
  draftTableVersionId: string;
  rowId: string;
  headRowVersionId: string;
  draftRowVersionId: string;
  headEndpointId: string;
  draftEndpointId: string;
};

export const prepareBranch = async (
  prismaService: PrismaService,
): Promise<PrepareBranchReturnType> => {
  const organizationId = nanoid();
  const projectId = nanoid();
  const projectName = `name-${projectId}`;
  const branchId = nanoid();
  const branchName = `name-${branchId}`;
  const headRevisionId = nanoid();
  const draftRevisionId = nanoid();
  const headChangelogId = nanoid();
  const draftChangelogId = nanoid();

  const shemaTableVersionId = nanoid();
  const tableId = nanoid();
  const headTableVersionId = nanoid();
  const draftTableVersionId = nanoid();
  const rowId = nanoid();
  const headRowVersionId = nanoid();
  const draftRowVersionId = nanoid();
  const headEndpointId = nanoid();
  const draftEndpointId = nanoid();

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
      versionId: shemaTableVersionId,
      readonly: true,
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

  // schema for table in SystemTable.schema
  await prismaService.row.create({
    data: {
      id: tableId,
      versionId: nanoid(),
      readonly: true,
      tables: {
        connect: {
          versionId: shemaTableVersionId,
        },
      },
      data: testSchema,
    },
  });

  // row
  await prismaService.row.create({
    data: {
      id: rowId,
      versionId: headRowVersionId,
      readonly: true,
      tables: {
        connect: {
          versionId: headTableVersionId,
        },
      },
      data: { ver: 1 },
    },
  });
  await prismaService.row.create({
    data: {
      id: rowId,
      versionId: draftRowVersionId,
      readonly: false,
      tables: {
        connect: {
          versionId: draftTableVersionId,
        },
      },
      data: { ver: 2 },
    },
  });

  // endpoint
  await prismaService.endpoint.create({
    data: {
      id: headEndpointId,
      revisionId: headRevisionId,
      type: 'REST_API',
    },
  });
  await prismaService.endpoint.create({
    data: {
      id: draftEndpointId,
      revisionId: draftRevisionId,
      type: 'GRAPHQL',
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
    tableId,
    headTableVersionId,
    draftTableVersionId,
    rowId,
    headRowVersionId,
    draftRowVersionId,
    headEndpointId,
    draftEndpointId,
  };
};

export const createMock = <T>(mockResolvedValue: T) =>
  mockResolvedValue instanceof Error
    ? jest.fn().mockRejectedValue(mockResolvedValue)
    : jest.fn().mockResolvedValue(mockResolvedValue);
