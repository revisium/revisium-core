import { CacheModule } from '@nestjs/cache-manager';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { QueryHandlerType } from '@nestjs/cqrs/dist/query-bus';
import { Test, TestingModule } from '@nestjs/testing';
import { GetBranchByIdHandler } from 'src/features/branch/quieries/handlers/get-branch-by-id.handler';
import { TABLE_COMMANDS_HANDLERS } from 'src/features/draft/commands/handlers/index';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DRAFT_REQUEST_DTO } from 'src/features/draft/draft-request-dto';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { JsonSchemaValidatorService } from 'src/features/draft/json-schema-validator.service';
import { SessionChangelogService } from 'src/features/draft/session-changelog.service';
import { GetRevisionHandler } from 'src/features/revision/queries/commands/get-revision.handler';
import { GetRowByIdHandler } from 'src/features/row/queries/handlers/get-row-by-id.handler';
import { SHARE_COMMANDS_HANDLERS } from 'src/features/share/commands/handlers';
import { SHARE_QUERIES_HANDLERS } from 'src/features/share/queries/handlers';
import { ShareModule } from 'src/features/share/share.module';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  JsonObjectSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';
import { GetTableByIdHandler } from 'src/features/table/queries/handlers/get-table-by-id.handler';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';

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

export const createMock = <T>(mockResolvedValue: T) =>
  mockResolvedValue instanceof Error
    ? jest.fn().mockRejectedValue(mockResolvedValue)
    : jest.fn().mockResolvedValue(mockResolvedValue);
