import { CacheModule } from '@nestjs/cache-manager';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import {
  getArraySchema,
  getNumberSchema,
  getObjectSchema,
  getRefSchema,
} from 'src/__tests__/utils/schema/schema.mocks';
import { BRANCH_QUERIES_HANDLERS } from 'src/features/branch/quieries/handlers';
import { GetBranchByIdHandler } from 'src/features/branch/quieries/handlers/get-branch-by-id.handler';
import { DRAFT_COMMANDS_HANDLERS } from 'src/features/draft/commands/handlers/index';
import { DraftContextService } from 'src/features/draft/draft-context.service';
import { DRAFT_REQUEST_DTO } from 'src/features/draft/draft-request-dto';
import { DraftTransactionalCommands } from 'src/features/draft/draft.transactional.commands';
import { ORGANIZATIONS_QUERIES } from 'src/features/organization/queries';
import { PluginModule } from 'src/features/plugin/plugin.module';
import { PROJECT_QUERIES } from 'src/features/project/queries/handlers';
import { GetRowHandler } from 'src/features/row/queries/handlers/get-row.handler';
import { GetRowsHandler } from 'src/features/row/queries/handlers/get-rows.handler';
import { JsonSchemaValidatorService } from 'src/features/share/json-schema-validator.service';
import { GetRevisionHandler } from 'src/features/revision/queries/commands/get-revision.handler';
import { GetRowByIdHandler } from 'src/features/row/queries/handlers/get-row-by-id.handler';
import { SystemSchemaIds } from 'src/features/share/schema-ids.consts';
import { ShareModule } from 'src/features/share/share.module';
import { ShareTransactionalCommands } from 'src/features/share/share.transactional.commands';
import { ShareTransactionalQueries } from 'src/features/share/share.transactional.queries';
import {
  JsonObjectSchema,
  JsonSchemaTypeName,
} from 'src/features/share/utils/schema/types/schema.types';
import { GetRowsByTableHandler } from 'src/features/table/queries/handlers/get-rows-by-table.handler';
import { GetTableByIdHandler } from 'src/features/table/queries/handlers/get-table-by-id.handler';
import { DatabaseModule } from 'src/infrastructure/database/database.module';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { S3Service } from 'src/infrastructure/database/s3.service';
import { TransactionPrismaService } from 'src/infrastructure/database/transaction-prisma.service';
import { EndpointNotificationService } from 'src/infrastructure/notification/endpoint-notification.service';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { AppOptionsModule } from 'src/core/app-options.module';

export const testSchema: JsonObjectSchema = getObjectSchema({
  ver: getNumberSchema(),
});

export const testSchemaWithRef: JsonObjectSchema = getObjectSchema({
  files: getArraySchema(getRefSchema(SystemSchemaIds.File)),
});

export const invalidTestSchema: JsonObjectSchema = {
  type: JsonSchemaTypeName.Object,
  required: ['$ver', '123', 'valid'],
  properties: {
    valid: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
    $ver: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
    ['123']: {
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

export const getTestLinkedSchema = (tableId: string): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  required: ['link'],
  properties: {
    link: {
      type: JsonSchemaTypeName.String,
      default: '',
      foreignKey: tableId,
    },
  },
  additionalProperties: false,
});

export const createTestingModule = async () => {
  const mockS3 = {
    isAvailable: true,
    uploadFile: jest.fn().mockResolvedValue({
      bucket: 'test-bucket',
      key: 'uploads/fake.png',
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    imports: [
      DatabaseModule,
      CqrsModule,
      ShareModule,
      PluginModule,
      AppOptionsModule.forRoot({ mode: 'monolith' }),
      NotificationModule,
      CacheModule.register(),
    ],
    providers: [
      DraftTransactionalCommands,
      DraftContextService,
      JsonSchemaValidatorService,
      ...DRAFT_REQUEST_DTO,
      ...DRAFT_COMMANDS_HANDLERS,
      ...ORGANIZATIONS_QUERIES,
      ...PROJECT_QUERIES,
      ...BRANCH_QUERIES_HANDLERS,
      GetRevisionHandler,
      GetBranchByIdHandler,
      GetTableByIdHandler,
      GetRowByIdHandler,
      GetRowsHandler,
      GetRowHandler,
      GetRowsByTableHandler,
    ],
  })
    .overrideProvider(S3Service)
    .useValue(mockS3)
    .compile();

  await module.init();

  const prismaService = module.get(PrismaService);

  const commandBus = module.get(CommandBus);
  const queryBus = module.get(QueryBus);

  const transactionService = module.get(TransactionPrismaService);
  const shareTransactionalQueries = module.get(ShareTransactionalQueries);
  const shareTransactionalCommands = module.get(ShareTransactionalCommands);
  const draftTransactionalCommands = module.get(DraftTransactionalCommands);
  const endpointNotificationService = module.get(EndpointNotificationService);
  return {
    module,
    prismaService,
    commandBus,
    queryBus,
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
