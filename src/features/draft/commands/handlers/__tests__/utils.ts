import { CacheModule } from '@nestjs/cache-manager';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { QueryHandlerType } from '@nestjs/cqrs/dist/query-bus';
import { Test, TestingModule } from '@nestjs/testing';
import * as hash from 'object-hash';
import { nanoid } from 'nanoid';
import { GetBranchByIdHandler } from 'src/features/branch/quieries/handlers/get-branch-by-id.handler';
import { GetRevisionHandler } from 'src/features/revision/queries/commands/get-revision.handler';
import { GetRowByIdHandler } from 'src/features/row/queries/handlers/get-row-by-id.handler';
import { metaSchema } from 'src/features/share/schema/meta-schema';
import { JsonPatchAdd } from 'src/features/share/utils/schema/types/json-patch.types';
import {
  JsonObjectSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';
import { GetTableByIdHandler } from 'src/features/table/queries/handlers/get-table-by-id.handler';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { TABLE_COMMANDS_HANDLERS } from 'src/features/draft/commands/handlers/index';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DRAFT_REQUEST_DTO } from 'src/features/draft/draft-request-dto';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { SHARE_COMMANDS_HANDLERS } from 'src/features/share/commands/handlers';
import { SHARE_QUERIES_HANDLERS } from 'src/features/share/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import { SystemTables } from 'src/features/share/system-tables.consts';

export const testSchema: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  required: ['ver'],
  properties: {
    ver: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
  },
  additionalProperties: false,
};

export const testSchemaString: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  required: ['ver'],
  properties: {
    ver: {
      type: JsonSchemaTypeName.String,
      default: '',
    },
  },
  additionalProperties: false,
};

export const createTestingModule = async () => {
  const ANOTHER_QUERIES: QueryHandlerType[] = [
    GetRevisionHandler,
    GetBranchByIdHandler,
    GetTableByIdHandler as QueryHandlerType,
    GetRowByIdHandler as QueryHandlerType,
  ];

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
      ...ANOTHER_QUERIES,
    ],
  }).compile();

  const prismaService = module.get(PrismaService);

  const commandBus = module.get(CommandBus);
  commandBus.register([...TABLE_COMMANDS_HANDLERS, ...SHARE_COMMANDS_HANDLERS]);

  const queryBus = module.get(QueryBus);
  queryBus.register([...SHARE_QUERIES_HANDLERS, ...ANOTHER_QUERIES]);

  const transactionService = module.get(TransactionPrismaService);
  const shareTransactionalQueries = module.get(ShareTransactionalQueries);
  const shareTransactionalCommands = module.get(ShareTransactionalCommands);
  const draftTransactionalCommands = module.get(DraftTransactionalCommands);
  const endpointNotificationService = module.get(EndpointNotificationService);

  return {
    module,
    prismaService,
    commandBus,
    transactionService,
    shareTransactionalQueries,
    shareTransactionalCommands,
    draftTransactionalCommands,
    endpointNotificationService,
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
  tableCreatedId: string;
  headTableVersionId: string;
  draftTableVersionId: string;
  rowId: string;
  headRowVersionId: string;
  draftRowVersionId: string;
  headEndpointId: string;
  draftEndpointId: string;
  schemaTableVersionId: string;
  schemaTableCreatedId: string;
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

  const schemaTableVersionId = nanoid();
  const schemaTableCreatedId = nanoid();
  const tableId = nanoid();
  const tableCreatedId = nanoid();
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
      versionId: schemaTableVersionId,
      createdId: schemaTableCreatedId,
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

  // schema for table in SystemTable.schema
  await prismaService.row.create({
    data: {
      id: tableId,
      versionId: nanoid(),
      readonly: true,
      tables: {
        connect: {
          versionId: schemaTableVersionId,
        },
      },
      data: testSchema,
      meta: [
        {
          patches: [
            {
              op: 'add',
              path: '',
              value: testSchema,
            } as JsonPatchAdd,
          ],
          hash: hash(testSchema),
        },
      ],
      hash: hash(testSchema),
      schemaHash: hash(metaSchema),
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
      hash: hash({ ver: 1 }),
      schemaHash: hash(testSchema),
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
      hash: hash({ ver: 2 }),
      schemaHash: hash(testSchema),
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
    tableCreatedId,
    headTableVersionId,
    draftTableVersionId,
    rowId,
    headRowVersionId,
    draftRowVersionId,
    headEndpointId,
    draftEndpointId,
    schemaTableVersionId,
    schemaTableCreatedId,
  };
};

export const createMock = <T>(mockResolvedValue: T) =>
  mockResolvedValue instanceof Error
    ? jest.fn().mockRejectedValue(mockResolvedValue)
    : jest.fn().mockResolvedValue(mockResolvedValue);
