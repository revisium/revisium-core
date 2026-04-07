import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { InternalKeyBootstrapService } from 'src/features/api-key/internal-key-bootstrap.service';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('InternalKeyBootstrapService', () => {
  let prisma: PrismaService;

  async function createModule(
    mode: AppOptions['mode'],
    envOverrides: Record<string, string | undefined> = {},
  ) {
    const configGet = (key: string) => envOverrides[key];

    const module = await Test.createTestingModule({
      imports: [RevisiumCacheModule.forRootAsync()],
      providers: [
        ApiKeyService,
        InternalKeyBootstrapService,
        PrismaService,
        {
          provide: APP_OPTIONS_TOKEN,
          useValue: { mode } satisfies AppOptions,
        },
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    const newPrisma = module.get<PrismaService>(PrismaService);
    if (prisma && prisma !== newPrisma) {
      await prisma.$disconnect();
    }
    prisma = newPrisma;

    return module;
  }

  async function cleanupInternalKeys() {
    await prisma.apiKey.deleteMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
      },
    });
  }

  beforeEach(async () => {
    delete process.env.INTERNAL_API_KEY;
  });

  afterEach(async () => {
    delete process.env.INTERNAL_API_KEY;
    if (prisma) {
      await cleanupInternalKeys();
      await prisma.$disconnect();
    }
  });

  it('should auto-generate key in monolith mode when INTERNAL_API_KEY not set', async () => {
    const module = await createModule('monolith');
    await cleanupInternalKeys();
    const service = module.get(InternalKeyBootstrapService);

    await service.onModuleInit();

    expect(process.env.INTERNAL_API_KEY).toBeDefined();
    expect(process.env.INTERNAL_API_KEY).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);

    const keys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
        revokedAt: null,
      },
    });
    expect(keys).toHaveLength(1);
    expect(keys[0].name).toBe('internal-endpoint');
  });

  it('should use env key when INTERNAL_API_KEY is set', async () => {
    const envKey = 'rev_abcdefghijklmnopqrstuv';
    const module = await createModule('monolith', {
      INTERNAL_API_KEY: envKey,
    });
    await cleanupInternalKeys();
    const service = module.get(InternalKeyBootstrapService);
    const apiKeyService = module.get(ApiKeyService);

    await service.onModuleInit();

    const expectedHash = apiKeyService.hashKey(envKey);
    const key = await prisma.apiKey.findFirst({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
        revokedAt: null,
      },
    });
    expect(key).not.toBeNull();
    expect(key!.keyHash).toBe(expectedHash);
  });

  it('should be idempotent on restart with same key', async () => {
    const envKey = 'rev_abcdefghijklmnopqrstuv';

    const module1 = await createModule('monolith', {
      INTERNAL_API_KEY: envKey,
    });
    await cleanupInternalKeys();
    await module1.get(InternalKeyBootstrapService).onModuleInit();

    const module2 = await createModule('monolith', {
      INTERNAL_API_KEY: envKey,
    });
    await module2.get(InternalKeyBootstrapService).onModuleInit();

    const keys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
        revokedAt: null,
      },
    });
    expect(keys).toHaveLength(1);
  });

  it('should handle key rotation when env var changes', async () => {
    const oldKey = 'rev_abcdefghijklmnopqrstuv';
    const newKey = 'rev_zyxwvutsrqponmlkjihgfe';

    const module1 = await createModule('monolith', {
      INTERNAL_API_KEY: oldKey,
    });
    await cleanupInternalKeys();
    const apiKeyService = module1.get(ApiKeyService);
    await module1.get(InternalKeyBootstrapService).onModuleInit();

    const module2 = await createModule('monolith', {
      INTERNAL_API_KEY: newKey,
    });
    await module2.get(InternalKeyBootstrapService).onModuleInit();

    const activeKeys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
        revokedAt: null,
      },
    });
    expect(activeKeys).toHaveLength(1);
    expect(activeKeys[0].keyHash).toBe(apiKeyService.hashKey(newKey));

    const revokedKeys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
        revokedAt: { not: null },
      },
    });
    expect(revokedKeys).toHaveLength(1);
    expect(revokedKeys[0].keyHash).toBe(apiKeyService.hashKey(oldKey));
  });

  it('should skip in microservice mode when INTERNAL_API_KEY not set', async () => {
    const module = await createModule('microservice');
    await cleanupInternalKeys();
    const service = module.get(InternalKeyBootstrapService);

    await service.onModuleInit();

    expect(process.env.INTERNAL_API_KEY).toBeUndefined();

    const keys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
      },
    });
    expect(keys).toHaveLength(0);
  });

  it('should register key in microservice mode when INTERNAL_API_KEY is set', async () => {
    const envKey = 'rev_abcdefghijklmnopqrstuv';
    const module = await createModule('microservice', {
      INTERNAL_API_KEY: envKey,
    });
    await cleanupInternalKeys();
    const service = module.get(InternalKeyBootstrapService);

    await service.onModuleInit();

    const keys = await prisma.apiKey.findMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: 'endpoint',
        revokedAt: null,
      },
    });
    expect(keys).toHaveLength(1);
  });
});
