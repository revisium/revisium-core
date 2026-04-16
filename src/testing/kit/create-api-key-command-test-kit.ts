import { ConfigService } from '@nestjs/config';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import {
  CreateApiKeyHandler,
  RevokeApiKeyHandler,
  RotateApiKeyHandler,
} from 'src/features/api-key/commands/handlers';
import { GetApiKeysHandler } from 'src/features/api-key/queries/handlers';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

export interface ApiKeyCommandTestKitOptions {
  configValues?: Record<string, unknown>;
}

export interface ApiKeyCommandTestKit {
  module: TestingModule;
  prismaService: PrismaService;
  commandBus: CommandBus;
  queryBus: QueryBus;
  apiKeyService: ApiKeyService;
  close(): Promise<void>;
}

export async function createApiKeyCommandTestKit(
  options: ApiKeyCommandTestKitOptions = {},
): Promise<ApiKeyCommandTestKit> {
  const { configValues = {} } = options;
  const module = await Test.createTestingModule({
    imports: [CqrsModule, RevisiumCacheModule.forRootAsync()],
    providers: [
      CreateApiKeyHandler,
      RevokeApiKeyHandler,
      RotateApiKeyHandler,
      GetApiKeysHandler,
      ApiKeyService,
      PrismaService,
      {
        provide: ConfigService,
        useValue: { get: (key: string) => configValues[key] },
      },
    ],
  }).compile();

  await module.init();

  return {
    module,
    prismaService: module.get(PrismaService),
    commandBus: module.get(CommandBus),
    queryBus: module.get(QueryBus),
    apiKeyService: module.get(ApiKeyService),
    async close() {
      await module.close();
    },
  };
}
