import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { nanoid } from 'nanoid';
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

// Each test builds a unique `internalServiceName` via nanoid so that
// concurrent Jest workers bootstrapping CoreModule against the shared
// test DB cannot collide with this spec's Prisma queries. The production
// service reads `INTERNAL_MONOLITH_SERVICES` from config to let tests
// override the otherwise hard-coded 'endpoint' default.
function uniqueServiceName(prefix: string): string {
  return `${prefix}-${nanoid(8).toLowerCase()}`;
}

function envVarFor(serviceName: string): string {
  return `INTERNAL_API_KEY_${serviceName.toUpperCase()}`;
}

describe('InternalKeyBootstrapService', () => {
  let prisma: PrismaService;
  const trackedEnvVars = new Set<string>();

  function trackEnvVar(envVar: string): void {
    trackedEnvVars.add(envVar);
  }

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

  async function cleanupInternalKeys(serviceNames: string[]) {
    if (serviceNames.length === 0) return;
    await prisma.apiKey.deleteMany({
      where: {
        type: ApiKeyType.INTERNAL,
        internalServiceName: { in: serviceNames },
      },
    });
  }

  function clearTrackedEnvVars() {
    for (const envVar of trackedEnvVars) {
      delete process.env[envVar];
    }
    trackedEnvVars.clear();
  }

  beforeEach(() => {
    clearTrackedEnvVars();
  });

  afterEach(async () => {
    clearTrackedEnvVars();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('monolith mode', () => {
    it('should derive key from JWT_SECRET and set INTERNAL_API_KEY_<service>', async () => {
      const serviceName = uniqueServiceName('derive');
      const jwtSecret = `secret-${nanoid()}`;
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);

      const module = await createModule('monolith', {
        JWT_SECRET: jwtSecret,
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await cleanupInternalKeys([serviceName]);
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      const expectedKey = deriveKey(jwtSecret, serviceName);
      expect(process.env[envVar]).toBe(expectedKey);

      const keys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(keys).toHaveLength(1);
      expect(keys[0].name).toBe(`internal-${serviceName}`);
    });

    it('should produce the same derived key across restarts (deterministic)', async () => {
      const serviceName = uniqueServiceName('det');
      const jwtSecret = `secret-${nanoid()}`;
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);

      const module1 = await createModule('monolith', {
        JWT_SECRET: jwtSecret,
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await cleanupInternalKeys([serviceName]);
      await module1.get(InternalKeyBootstrapService).onModuleInit();
      const key1 = process.env[envVar];

      delete process.env[envVar];

      const module2 = await createModule('monolith', {
        JWT_SECRET: jwtSecret,
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await module2.get(InternalKeyBootstrapService).onModuleInit();
      const key2 = process.env[envVar];

      expect(key1).toBe(key2);

      const keys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(keys).toHaveLength(1);
    });

    it('should generate random key when JWT_SECRET is not set', async () => {
      const serviceName = uniqueServiceName('random');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);

      const module = await createModule('monolith', {
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await cleanupInternalKeys([serviceName]);
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      expect(process.env[envVar]).toBeDefined();
      expect(process.env[envVar]).toMatch(/^rev_[A-Za-z0-9_-]{22}$/);

      const keys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(keys).toHaveLength(1);
    });

    it('should rotate key when JWT_SECRET changes', async () => {
      const serviceName = uniqueServiceName('rotate');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);

      const module1 = await createModule('monolith', {
        JWT_SECRET: 'secret-v1',
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await cleanupInternalKeys([serviceName]);
      const apiKeyService = module1.get(ApiKeyService);
      await module1.get(InternalKeyBootstrapService).onModuleInit();

      const oldKey = deriveKey('secret-v1', serviceName);

      const module2 = await createModule('monolith', {
        JWT_SECRET: 'secret-v2',
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await module2.get(InternalKeyBootstrapService).onModuleInit();

      const newKey = deriveKey('secret-v2', serviceName);

      const activeKeys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(activeKeys).toHaveLength(1);
      expect(activeKeys[0].keyHash).toBe(apiKeyService.hashKey(newKey));

      const revokedKeys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: { not: null },
        },
      });
      expect(revokedKeys).toHaveLength(1);
      expect(revokedKeys[0].keyHash).toBe(apiKeyService.hashKey(oldKey));
    });

    it('should ignore INTERNAL_API_KEY_* env vars and log warning', async () => {
      const serviceName = uniqueServiceName('ignore');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);
      process.env[envVar] = 'rev_shouldbeignored1234567';

      const module = await createModule('monolith', {
        JWT_SECRET: 'test-secret',
        INTERNAL_MONOLITH_SERVICES: serviceName,
      });
      await cleanupInternalKeys([serviceName]);
      const service = module.get(InternalKeyBootstrapService);
      const warnSpy = jest.spyOn((service as any).logger, 'warn');

      await service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ignored in monolith mode'),
      );

      const expectedKey = deriveKey('test-secret', serviceName);
      expect(process.env[envVar]).toBe(expectedKey);
    });
  });

  describe('microservice mode', () => {
    it('should register key from INTERNAL_API_KEY_<service> env var', async () => {
      const serviceName = uniqueServiceName('ms');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);
      const envKey = `rev_${nanoid(22)}`;
      process.env[envVar] = envKey;

      const module = await createModule('microservice');
      await cleanupInternalKeys([serviceName]);
      const service = module.get(InternalKeyBootstrapService);
      const apiKeyService = module.get(ApiKeyService);

      await service.onModuleInit();

      const key = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(key).not.toBeNull();
      expect(key!.keyHash).toBe(apiKeyService.hashKey(envKey));
      expect(key!.name).toBe(`internal-${serviceName}`);
    });

    it('should derive service name from env var suffix (second service variant)', async () => {
      const serviceName = uniqueServiceName('ms2');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);
      const envKey = `rev_${nanoid(22)}`;
      process.env[envVar] = envKey;

      const module = await createModule('microservice');
      await cleanupInternalKeys([serviceName]);
      const service = module.get(InternalKeyBootstrapService);
      const apiKeyService = module.get(ApiKeyService);

      await service.onModuleInit();

      const key = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(key).not.toBeNull();
      expect(key!.keyHash).toBe(apiKeyService.hashKey(envKey));
      expect(key!.name).toBe(`internal-${serviceName}`);
    });

    it('should register multiple services independently', async () => {
      const primary = uniqueServiceName('multi-a');
      const secondary = uniqueServiceName('multi-b');
      const envPrimary = envVarFor(primary);
      const envSecondary = envVarFor(secondary);
      trackEnvVar(envPrimary);
      trackEnvVar(envSecondary);
      const primaryKeyValue = `rev_${nanoid(22)}`;
      const secondaryKeyValue = `rev_${nanoid(22)}`;
      process.env[envPrimary] = primaryKeyValue;
      process.env[envSecondary] = secondaryKeyValue;

      const module = await createModule('microservice');
      await cleanupInternalKeys([primary, secondary]);
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      const primaryKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: primary,
          revokedAt: null,
        },
      });
      const secondaryKey = await prisma.apiKey.findFirst({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: secondary,
          revokedAt: null,
        },
      });

      expect(primaryKey).not.toBeNull();
      expect(secondaryKey).not.toBeNull();
      expect(primaryKey!.keyHash).not.toBe(secondaryKey!.keyHash);
    });

    it('should handle key rotation per service independently', async () => {
      const primary = uniqueServiceName('rot-a');
      const secondary = uniqueServiceName('rot-b');
      const envPrimary = envVarFor(primary);
      const envSecondary = envVarFor(secondary);
      trackEnvVar(envPrimary);
      trackEnvVar(envSecondary);
      const stablePrimaryKey = `rev_${nanoid(22)}`;
      const initialSecondaryKey = `rev_${nanoid(22)}`;
      const rotatedSecondaryKey = `rev_${nanoid(22)}`;
      process.env[envPrimary] = stablePrimaryKey;
      process.env[envSecondary] = initialSecondaryKey;

      const module1 = await createModule('microservice');
      await cleanupInternalKeys([primary, secondary]);
      const apiKeyService = module1.get(ApiKeyService);
      await module1.get(InternalKeyBootstrapService).onModuleInit();

      process.env[envPrimary] = stablePrimaryKey;
      process.env[envSecondary] = rotatedSecondaryKey;

      const module2 = await createModule('microservice');
      await module2.get(InternalKeyBootstrapService).onModuleInit();

      const activePrimary = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: primary,
          revokedAt: null,
        },
      });
      expect(activePrimary).toHaveLength(1);
      expect(activePrimary[0].keyHash).toBe(
        apiKeyService.hashKey(stablePrimaryKey),
      );

      const activeSecondary = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: secondary,
          revokedAt: null,
        },
      });
      expect(activeSecondary).toHaveLength(1);
      expect(activeSecondary[0].keyHash).toBe(
        apiKeyService.hashKey(rotatedSecondaryKey),
      );
    });

    it('should skip when no INTERNAL_API_KEY_* env vars are set', async () => {
      // Microservice mode never writes to process.env, so comparing the
      // INTERNAL_API_KEY_* set before/after is a faithful proxy for 'the
      // service did nothing'. Compare the before/after sets instead of
      // asserting against [] because the parent Node env may legitimately
      // carry unrelated INTERNAL_API_KEY_* vars (CI secrets, dev .env).
      const snapshotInternalEnvKeys = () =>
        Object.keys(process.env)
          .filter((k) => k.startsWith('INTERNAL_API_KEY_'))
          .sort();
      const before = snapshotInternalEnvKeys();

      const module = await createModule('microservice');
      const service = module.get(InternalKeyBootstrapService);

      await service.onModuleInit();

      expect(snapshotInternalEnvKeys()).toEqual(before);
    });

    it('should skip service with invalid key format', async () => {
      const serviceName = uniqueServiceName('invalid');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);
      process.env[envVar] = 'invalid-key';

      const module = await createModule('microservice');
      await cleanupInternalKeys([serviceName]);
      const service = module.get(InternalKeyBootstrapService);
      const errorSpy = jest.spyOn((service as any).logger, 'error');

      await service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid format'),
      );

      const keys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
        },
      });
      expect(keys).toHaveLength(0);
    });

    it('should be idempotent on restart with same key', async () => {
      const serviceName = uniqueServiceName('idem');
      const envVar = envVarFor(serviceName);
      trackEnvVar(envVar);
      const envKey = `rev_${nanoid(22)}`;
      process.env[envVar] = envKey;

      const module1 = await createModule('microservice');
      await cleanupInternalKeys([serviceName]);
      await module1.get(InternalKeyBootstrapService).onModuleInit();

      const module2 = await createModule('microservice');
      await module2.get(InternalKeyBootstrapService).onModuleInit();

      const keys = await prisma.apiKey.findMany({
        where: {
          type: ApiKeyType.INTERNAL,
          internalServiceName: serviceName,
          revokedAt: null,
        },
      });
      expect(keys).toHaveLength(1);
    });
  });
});
