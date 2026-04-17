import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { InternalKeyBootstrapService } from 'src/features/api-key/internal-key-bootstrap.service';
import { APP_OPTIONS_TOKEN, AppOptions } from 'src/app-mode';
import { RevisiumCacheModule } from 'src/infrastructure/cache';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

function deriveKey(jwtSecret: string, serviceName: string): string {
  const hmac = createHmac('sha256', jwtSecret);
  hmac.update(`revisium:internal-key:${serviceName}`);
  return `rev_${hmac.digest('base64url').substring(0, 22)}`;
}

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

  async function cleanupInternalKeys(serviceNames: string[] = ['endpoint']) {
    await prisma.apiKey.deleteMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: { in: serviceNames },
      },
    });
  }

  function clearInternalKeyEnvVars() {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('INTERNAL_API_KEY_')) {
        delete process.env[key];
      }
    }
  }

  beforeEach(() => {
    clearInternalKeyEnvVars();
  });

  afterEach(async () => {
    clearInternalKeyEnvVars();
    if (prisma) {
      await cleanupInternalKeys(['endpoint', 'worker']);
      await prisma.$disconnect();
    }
  });

  describe('monolith mode', () => {
    it('should derive key from JWT_SECRET and set INTERNAL_API_KEY_ENDPOINT', async () => {
      const jwtSecret = 'test-jwt-secret';
      const module = await createModule('monolith', {
        JWT_SECRET: jwtSecret,
      });
      await cleanupInternalKeys();
      const apiKeyService = module.get(ApiKeyService);
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      const expectedKey = deriveKey(jwtSecret, 'endpoint');
      expect(process.env.INTERNAL_API_KEY_ENDPOINT).toBe(expectedKey);

      // Scoped to the specific key hash this test produced — other Jest
      // workers may be creating 'endpoint' internal keys concurrently.
      const ourKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: apiKeyService.hashKey(expectedKey),
        },
      });
      expect(ourKey).not.toBeNull();
      expect(ourKey?.revokedAt).toBeNull();
      expect(ourKey?.name).toBe('internal-endpoint');
    });

    it('should produce the same derived key across restarts (deterministic)', async () => {
      const jwtSecret = 'test-jwt-secret';

      const module1 = await createModule('monolith', {
        JWT_SECRET: jwtSecret,
      });
      await cleanupInternalKeys();
      const apiKeyService = module1.get(ApiKeyService);
      await module1.get(InternalKeyBootstrapService).onModuleInit();
      const key1 = process.env.INTERNAL_API_KEY_ENDPOINT;

      clearInternalKeyEnvVars();

      const module2 = await createModule('monolith', {
        JWT_SECRET: jwtSecret,
      });
      await module2.get(InternalKeyBootstrapService).onModuleInit();
      const key2 = process.env.INTERNAL_API_KEY_ENDPOINT;

      expect(key1).toBe(key2);

      const ourKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: apiKeyService.hashKey(key1 as string),
        },
      });
      expect(ourKey).not.toBeNull();
      expect(ourKey?.revokedAt).toBeNull();
    });

    it('should generate random key when JWT_SECRET is not set', async () => {
      const module = await createModule('monolith');
      await cleanupInternalKeys();
      const apiKeyService = module.get(ApiKeyService);
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      expect(process.env.INTERNAL_API_KEY_ENDPOINT).toBeDefined();
      expect(process.env.INTERNAL_API_KEY_ENDPOINT).toMatch(
        /^rev_[A-Za-z0-9_-]{22}$/,
      );

      const ourKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: apiKeyService.hashKey(
            process.env.INTERNAL_API_KEY_ENDPOINT as string,
          ),
        },
      });
      expect(ourKey).not.toBeNull();
      expect(ourKey?.revokedAt).toBeNull();
    });

    it('should rotate key when JWT_SECRET changes', async () => {
      const module1 = await createModule('monolith', {
        JWT_SECRET: 'secret-v1',
      });
      await cleanupInternalKeys();
      const apiKeyService = module1.get(ApiKeyService);
      await module1.get(InternalKeyBootstrapService).onModuleInit();

      const oldKey = deriveKey('secret-v1', 'endpoint');
      const oldKeyHash = apiKeyService.hashKey(oldKey);

      const module2 = await createModule('monolith', {
        JWT_SECRET: 'secret-v2',
      });
      await module2.get(InternalKeyBootstrapService).onModuleInit();

      const newKey = deriveKey('secret-v2', 'endpoint');
      const newKeyHash = apiKeyService.hashKey(newKey);

      // Assert by key hash rather than global row count: other Jest workers
      // bootstrap CoreModule in parallel and also create 'endpoint' internal
      // keys in the shared test DB. We only care about the two keys this
      // test produced.
      const ownNewKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: newKeyHash,
        },
      });
      expect(ownNewKey).not.toBeNull();
      expect(ownNewKey?.revokedAt).toBeNull();

      const ownOldKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: oldKeyHash,
        },
      });
      expect(ownOldKey).not.toBeNull();
      expect(ownOldKey?.revokedAt).not.toBeNull();
    });

    it('should ignore INTERNAL_API_KEY_* env vars and log warning', async () => {
      process.env.INTERNAL_API_KEY_ENDPOINT = 'rev_shouldbeignored1234567';

      const module = await createModule('monolith', {
        JWT_SECRET: 'test-secret',
      });
      await cleanupInternalKeys();
      const service = module.get(InternalKeyBootstrapService);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ignored in monolith mode'),
      );

      const expectedKey = deriveKey('test-secret', 'endpoint');
      expect(process.env.INTERNAL_API_KEY_ENDPOINT).toBe(expectedKey);
    });
  });

  describe('microservice mode', () => {
    it('should register key from INTERNAL_API_KEY_ENDPOINT', async () => {
      const envKey = 'rev_abcdefghijklmnopqrstuv';
      process.env.INTERNAL_API_KEY_ENDPOINT = envKey;

      const module = await createModule('microservice');
      await cleanupInternalKeys();
      const service = module.get(InternalKeyBootstrapService);
      const apiKeyService = module.get(ApiKeyService);

      await service.onModuleInit();

      const key = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          revokedAt: null,
        },
      });
      expect(key).not.toBeNull();
      expect(key!.keyHash).toBe(apiKeyService.hashKey(envKey));
      expect(key!.name).toBe('internal-endpoint');
    });

    it('should register INTERNAL_API_KEY_WORKER as worker service', async () => {
      const envKey = 'rev_abcdefghijklmnopqrstuv';
      process.env.INTERNAL_API_KEY_WORKER = envKey;

      const module = await createModule('microservice');
      await cleanupInternalKeys(['worker']);
      const service = module.get(InternalKeyBootstrapService);
      const apiKeyService = module.get(ApiKeyService);

      await service.onModuleInit();

      const key = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'worker',
          revokedAt: null,
        },
      });
      expect(key).not.toBeNull();
      expect(key!.keyHash).toBe(apiKeyService.hashKey(envKey));
      expect(key!.name).toBe('internal-worker');
    });

    it('should register multiple services independently', async () => {
      process.env.INTERNAL_API_KEY_ENDPOINT = 'rev_abcdefghijklmnopqrstuv';
      process.env.INTERNAL_API_KEY_WORKER = 'rev_zyxwvutsrqponmlkjihgfe';

      const module = await createModule('microservice');
      await cleanupInternalKeys(['endpoint', 'worker']);
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      const endpointKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          revokedAt: null,
        },
      });
      const workerKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'worker',
          revokedAt: null,
        },
      });

      expect(endpointKey).not.toBeNull();
      expect(workerKey).not.toBeNull();
      expect(endpointKey!.keyHash).not.toBe(workerKey!.keyHash);
    });

    it('should handle key rotation per service independently', async () => {
      process.env.INTERNAL_API_KEY_ENDPOINT = 'rev_abcdefghijklmnopqrstuv';
      process.env.INTERNAL_API_KEY_WORKER = 'rev_zyxwvutsrqponmlkjihgfe';

      const module1 = await createModule('microservice');
      await cleanupInternalKeys(['endpoint', 'worker']);
      const apiKeyService = module1.get(ApiKeyService);
      await module1.get(InternalKeyBootstrapService).onModuleInit();

      clearInternalKeyEnvVars();
      process.env.INTERNAL_API_KEY_ENDPOINT = 'rev_abcdefghijklmnopqrstuv';
      process.env.INTERNAL_API_KEY_WORKER = 'rev_newworkerkey1234567890';

      const module2 = await createModule('microservice');
      await module2.get(InternalKeyBootstrapService).onModuleInit();

      const ourEndpointKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: apiKeyService.hashKey('rev_abcdefghijklmnopqrstuv'),
        },
      });
      expect(ourEndpointKey).not.toBeNull();
      expect(ourEndpointKey?.revokedAt).toBeNull();

      const ourWorkerKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'worker',
          keyHash: apiKeyService.hashKey('rev_newworkerkey1234567890'),
        },
      });
      expect(ourWorkerKey).not.toBeNull();
      expect(ourWorkerKey?.revokedAt).toBeNull();
    });

    it('should skip when no INTERNAL_API_KEY_* env vars are set', async () => {
      const module = await createModule('microservice');
      await cleanupInternalKeys();
      const service = module.get(InternalKeyBootstrapService);
      const upsertSpy = jest.spyOn(prisma.apiKey, 'upsert');

      await service.onModuleInit();

      // Assert the service did not touch the apiKey table. We cannot rely on
      // findMany().toHaveLength(0) because parallel Jest workers may be
      // creating their own 'endpoint' internal keys concurrently in the
      // shared test DB.
      expect(upsertSpy).not.toHaveBeenCalled();
      upsertSpy.mockRestore();
    });

    it('should skip service with invalid key format', async () => {
      process.env.INTERNAL_API_KEY_ENDPOINT = 'invalid-key';

      const module = await createModule('microservice');
      await cleanupInternalKeys();
      const service = module.get(InternalKeyBootstrapService);
      const errorSpy = jest.spyOn((service as any).logger, 'error');
      const upsertSpy = jest.spyOn(prisma.apiKey, 'upsert');

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid format'),
      );
      expect(upsertSpy).not.toHaveBeenCalled();
      upsertSpy.mockRestore();
    });

    it('should be idempotent on restart with same key', async () => {
      const envKey = 'rev_abcdefghijklmnopqrstuv';
      process.env.INTERNAL_API_KEY_ENDPOINT = envKey;

      const module1 = await createModule('microservice');
      await cleanupInternalKeys();
      const apiKeyService = module1.get(ApiKeyService);
      await module1.get(InternalKeyBootstrapService).onModuleInit();

      const module2 = await createModule('microservice');
      await module2.get(InternalKeyBootstrapService).onModuleInit();

      const ourKeys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          keyHash: apiKeyService.hashKey(envKey),
        },
      });
      expect(ourKeys).toHaveLength(1);
      expect(ourKeys[0].revokedAt).toBeNull();
    });
  });
});
