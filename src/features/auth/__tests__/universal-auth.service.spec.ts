import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyType } from 'src/__generated__/client';
import { ApiKeyTrackingService } from 'src/features/api-key/api-key-tracking.service';
import { ApiKeyService } from 'src/features/api-key/api-key.service';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

function createMockApiKey(overrides: Record<string, any> = {}) {
  return {
    id: 'key-1',
    prefix: 'rev_',
    keyHash: 'hashed',
    type: ApiKeyType.PERSONAL,
    name: 'Test Key',
    userId: 'user-1',
    serviceId: null,
    internalServiceName: null,
    organizationId: null,
    projectIds: [],
    branchNames: [],
    tableIds: [],
    permissions: null,
    readOnly: false,
    allowedIps: [],
    expiresAt: null,
    revokedAt: null,
    replacedById: null,
    lastUsedAt: null,
    lastUsedIp: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('UniversalAuthService', () => {
  let service: UniversalAuthService;
  let apiKeyService: jest.Mocked<ApiKeyService>;
  let apiKeyTracking: jest.Mocked<ApiKeyTrackingService>;
  let noAuth: jest.Mocked<NoAuthService>;
  let prisma: any;

  beforeEach(() => {
    apiKeyService = {
      validateKeyFormat: jest.fn().mockReturnValue(true),
      hashKey: jest.fn().mockReturnValue('hashed'),
      findByHash: jest.fn(),
      generateKey: jest.fn(),
    } as any;

    apiKeyTracking = {
      track: jest.fn(),
    } as any;

    noAuth = {
      enabled: false,
      adminUser: { userId: 'admin', email: '' },
    } as any;

    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'user@test.com',
        }),
      },
    };

    service = new UniversalAuthService(
      apiKeyService,
      apiKeyTracking,
      noAuth as unknown as NoAuthService,
      prisma as unknown as PrismaService,
    );
  });

  describe('authenticateRequest', () => {
    it('should return authenticated and set admin user when NoAuth enabled', async () => {
      (noAuth as any).enabled = true;
      const request = { headers: {}, query: {}, ip: '127.0.0.1' } as any;

      const result = await service.authenticateRequest(request);

      expect(result).toBe('authenticated');
      expect(request.user).toEqual({ userId: 'admin', email: '' });
    });

    it('should return authenticated when API key found', async () => {
      apiKeyService.findByHash.mockResolvedValue(createMockApiKey());
      const request = {
        headers: { 'x-api-key': 'rev_1234567890123456789012' },
        query: {},
        ip: '127.0.0.1',
      } as any;

      const result = await service.authenticateRequest(request);

      expect(result).toBe('authenticated');
      expect(request.user).toMatchObject({ authMethod: 'personal_key' });
    });

    it('should return jwt when bearer token is not rev_', async () => {
      const request = {
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9' },
        query: {},
        ip: '127.0.0.1',
      } as any;

      const result = await service.authenticateRequest(request);

      expect(result).toBe('jwt');
    });

    it('should return anonymous when no credentials', async () => {
      const request = { headers: {}, query: {}, ip: '127.0.0.1' } as any;

      const result = await service.authenticateRequest(request);

      expect(result).toBe('anonymous');
    });

    it('should return jwt when only the rev_at cookie is present', async () => {
      const request = {
        headers: {},
        query: {},
        ip: '127.0.0.1',
        cookies: { rev_at: 'eyJhbGciOiJIUzI1NiJ9' },
      } as any;

      const result = await service.authenticateRequest(request);

      expect(result).toBe('jwt');
    });

    it('bearer header should still win over rev_at cookie', async () => {
      const request = {
        headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9' },
        query: {},
        ip: '127.0.0.1',
        cookies: { rev_at: 'other-token' },
      } as any;

      const result = await service.authenticateRequest(request);

      expect(result).toBe('jwt');
    });
  });

  describe('authenticate', () => {
    describe('Priority 1: X-Internal-Api-Key header', () => {
      it('should validate internal key', async () => {
        const key = createMockApiKey({
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          userId: null,
        });
        apiKeyService.findByHash.mockResolvedValue(key);

        const result = await service.authenticate(
          { 'x-internal-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result).toMatchObject({
          userId: 'internal:endpoint',
          authMethod: 'internal_key',
          apiKeyId: 'key-1',
        });
        expect(apiKeyTracking.track).toHaveBeenCalledWith('key-1', '127.0.0.1');
      });

      it('should reject non-internal key via X-Internal-Api-Key', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ type: ApiKeyType.PERSONAL }),
        );

        await expect(
          service.authenticate(
            { 'x-internal-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should take priority over X-Api-Key', async () => {
        const key = createMockApiKey({
          type: ApiKeyType.INTERNAL,
          internalServiceName: 'endpoint',
          userId: null,
        });
        apiKeyService.findByHash.mockResolvedValue(key);

        const result = await service.authenticate(
          {
            'x-internal-api-key': 'rev_1234567890123456789012',
            'x-api-key': 'rev_other0000000000000000',
          },
          {},
          '127.0.0.1',
        );

        expect(result!.authMethod).toBe('internal_key');
        expect(apiKeyService.hashKey).toHaveBeenCalledTimes(1);
      });
    });

    describe('Priority 2: X-Api-Key header', () => {
      it('should validate personal key', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result).toMatchObject({
          userId: 'user-1',
          email: 'user@test.com',
          authMethod: 'personal_key',
          apiKeyId: 'key-1',
        });
      });

      it('should validate service key', async () => {
        const key = createMockApiKey({
          type: ApiKeyType.SERVICE,
          userId: null,
          serviceId: 'my-service',
        });
        apiKeyService.findByHash.mockResolvedValue(key);

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result).toMatchObject({
          userId: 'my-service',
          authMethod: 'service_key',
          serviceId: 'my-service',
          apiKeyId: 'key-1',
        });
      });

      it('should reject internal key via X-Api-Key', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ type: ApiKeyType.INTERNAL }),
        );

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Priority 3: Authorization: Bearer', () => {
      it('should validate rev_ prefixed bearer as API key', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());

        const result = await service.authenticate(
          { authorization: 'Bearer rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result).toMatchObject({
          authMethod: 'personal_key',
        });
      });

      it('should return null for non-rev_ bearer (JWT delegation)', async () => {
        const result = await service.authenticate(
          { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test' },
          {},
          '127.0.0.1',
        );

        expect(result).toBeNull();
        expect(apiKeyService.findByHash).not.toHaveBeenCalled();
      });

      it('should return null for malformed authorization header', async () => {
        const result = await service.authenticate(
          { authorization: 'Basic dXNlcjpwYXNz' },
          {},
          '127.0.0.1',
        );

        expect(result).toBeNull();
      });

      it('should block query api_key fallback when Authorization header is present', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());

        const result = await service.authenticate(
          { authorization: 'Basic dXNlcjpwYXNz' },
          { api_key: 'rev_1234567890123456789012' },
          '127.0.0.1',
        );

        expect(result).toBeNull();
        expect(apiKeyService.findByHash).not.toHaveBeenCalled();
      });
    });

    describe('Priority 4: ?api_key query param', () => {
      it('should validate API key from query param', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());

        const result = await service.authenticate(
          {},
          { api_key: 'rev_1234567890123456789012' },
          '127.0.0.1',
        );

        expect(result).toMatchObject({
          authMethod: 'personal_key',
        });
      });
    });

    describe('Priority 5: No credentials', () => {
      it('should return null when no credentials provided', async () => {
        const result = await service.authenticate({}, {}, '127.0.0.1');

        expect(result).toBeNull();
        expect(apiKeyService.findByHash).not.toHaveBeenCalled();
      });
    });

    describe('error cases', () => {
      it('should reject invalid key format', async () => {
        apiKeyService.validateKeyFormat.mockReturnValue(false);

        await expect(
          service.authenticate({ 'x-api-key': 'bad-format' }, {}, '127.0.0.1'),
        ).rejects.toThrow(new UnauthorizedException('Invalid API key format'));
      });

      it('should reject unknown key hash', async () => {
        apiKeyService.findByHash.mockResolvedValue(null);

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('Invalid API key'));
      });

      it('should reject revoked key', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ revokedAt: new Date() }),
        );

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(
          new UnauthorizedException('API key has been revoked'),
        );
      });

      it('should reject expired key', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ expiresAt: pastDate }),
        );

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('API key has expired'));
      });

      it('should accept non-expired key', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ expiresAt: futureDate }),
        );

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result).not.toBeNull();
      });

      it('should reject personal key with no userId', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ userId: null }),
        );

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(
          new UnauthorizedException('API key has no associated user'),
        );
      });

      it('should reject personal key with missing user', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow(new UnauthorizedException('User not found'));
      });
    });

    describe('scope population', () => {
      it('should populate apiKeyScope for personal keys', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({
            organizationId: 'org-1',
            projectIds: ['proj-1'],
            branchNames: ['master'],
            tableIds: ['posts'],
          }),
        );

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyScope).toEqual({
          organizationId: 'org-1',
          projectIds: ['proj-1'],
          branchNames: ['master'],
          tableIds: ['posts'],
        });
      });

      it('should populate apiKeyScope for service keys', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({
            type: ApiKeyType.SERVICE,
            userId: null,
            serviceId: 'svc-1',
            organizationId: 'org-1',
            projectIds: [],
            branchNames: [],
            tableIds: [],
          }),
        );

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyScope).toEqual({
          organizationId: 'org-1',
          projectIds: [],
          branchNames: [],
          tableIds: [],
        });
      });

      it('should not set apiKeyScope for internal keys', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({
            type: ApiKeyType.INTERNAL,
            userId: null,
            internalServiceName: 'endpoint',
          }),
        );

        const result = await service.authenticate(
          { 'x-internal-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyScope).toBeUndefined();
      });
    });

    describe('readOnly flag propagation', () => {
      it('should set apiKeyReadOnly for personal key with readOnly=true', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ readOnly: true }),
        );

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyReadOnly).toBe(true);
      });

      it('should not set apiKeyReadOnly for personal key with readOnly=false', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({ readOnly: false }),
        );

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyReadOnly).toBeUndefined();
      });

      it('should set apiKeyReadOnly for service key with readOnly=true', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({
            type: ApiKeyType.SERVICE,
            userId: null,
            serviceId: 'svc-1',
            readOnly: true,
          }),
        );

        const result = await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyReadOnly).toBe(true);
      });

      it('should not set apiKeyReadOnly for internal keys', async () => {
        apiKeyService.findByHash.mockResolvedValue(
          createMockApiKey({
            type: ApiKeyType.INTERNAL,
            userId: null,
            internalServiceName: 'endpoint',
            readOnly: true,
          }),
        );

        const result = await service.authenticate(
          { 'x-internal-api-key': 'rev_1234567890123456789012' },
          {},
          '127.0.0.1',
        );

        expect(result!.apiKeyReadOnly).toBeUndefined();
      });
    });

    describe('header handling', () => {
      it('should handle array header values', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());

        const result = await service.authenticate(
          { 'x-api-key': ['rev_1234567890123456789012', 'rev_other'] as any },
          {},
          '127.0.0.1',
        );

        expect(result).not.toBeNull();
        expect(apiKeyService.hashKey).toHaveBeenCalledWith(
          'rev_1234567890123456789012',
        );
      });
    });

    describe('tracking', () => {
      it('should track usage on successful API key auth', async () => {
        apiKeyService.findByHash.mockResolvedValue(createMockApiKey());

        await service.authenticate(
          { 'x-api-key': 'rev_1234567890123456789012' },
          {},
          '192.168.1.1',
        );

        expect(apiKeyTracking.track).toHaveBeenCalledWith(
          'key-1',
          '192.168.1.1',
        );
      });

      it('should not track when key not found', async () => {
        apiKeyService.findByHash.mockResolvedValue(null);

        await expect(
          service.authenticate(
            { 'x-api-key': 'rev_1234567890123456789012' },
            {},
            '127.0.0.1',
          ),
        ).rejects.toThrow();

        expect(apiKeyTracking.track).not.toHaveBeenCalled();
      });
    });
  });
});
