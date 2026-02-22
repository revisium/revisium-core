import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OAuthTokenService } from '../oauth-token.service';

describe('OAuthTokenService', () => {
  let service: OAuthTokenService;
  let prisma: {
    oAuthRefreshToken: {
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    oAuthAccessToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const createService = async (envOverrides: Record<string, string> = {}) => {
    prisma = {
      oAuthRefreshToken: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      oAuthAccessToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((arg: unknown) => {
        if (typeof arg === 'function') {
          return arg(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    };

    const configValues: Record<string, string> = { ...envOverrides };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthTokenService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => configValues[key] ?? undefined,
          },
        },
      ],
    }).compile();

    return module.get(OAuthTokenService);
  };

  beforeEach(async () => {
    service = await createService();
  });

  describe('createTokens', () => {
    it('returns token pair with 1-hour TTL without scope', async () => {
      const result = await service.createTokens('client-1', 'user-1');

      expect(result.accessToken).toMatch(/^oat_/);
      expect(result.refreshToken).toMatch(/^ort_/);
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns token pair with 30-day TTL for mcp scope', async () => {
      const result = await service.createTokens('client-1', 'user-1', 'mcp');

      expect(result.accessToken).toMatch(/^oat_/);
      expect(result.refreshToken).toMatch(/^ort_/);
      expect(result.expiresIn).toBe(30 * 86400);
      expect(result.tokenType).toBe('Bearer');
    });

    it('stores scope in access token record', async () => {
      await service.createTokens('client-1', 'user-1', 'mcp');

      const createCall = prisma.$transaction.mock.calls[0][0][0];
      await createCall;
      expect(prisma.oAuthAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scope: 'mcp' }),
      });
    });

    it('stores null scope when not provided', async () => {
      await service.createTokens('client-1', 'user-1');

      const createCall = prisma.$transaction.mock.calls[0][0][0];
      await createCall;
      expect(prisma.oAuthAccessToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scope: null }),
      });
    });

    it('uses custom MCP_ACCESS_TOKEN_EXPIRY_DAYS from config', async () => {
      const customService = await createService({
        MCP_ACCESS_TOKEN_EXPIRY_DAYS: '7',
      });

      const result = await customService.createTokens(
        'client-1',
        'user-1',
        'mcp',
      );

      expect(result.expiresIn).toBe(7 * 86400);
    });
  });

  describe('validateAccessToken', () => {
    it('returns user data for valid token', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      prisma.oAuthAccessToken.findUnique.mockResolvedValue({
        tokenHash: 'hash',
        revokedAt: null,
        expiresAt: futureDate,
        user: {
          id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
          roleId: null,
        },
      });

      const result = await service.validateAccessToken('oat_test');

      expect(result).toEqual({
        userId: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        roleId: null,
      });
    });

    it('returns empty strings for null username and email', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      prisma.oAuthAccessToken.findUnique.mockResolvedValue({
        tokenHash: 'hash',
        revokedAt: null,
        expiresAt: futureDate,
        user: {
          id: 'user-1',
          username: null,
          email: null,
          roleId: 'admin',
        },
      });

      const result = await service.validateAccessToken('oat_test');

      expect(result.username).toBe('');
      expect(result.email).toBe('');
    });

    it('rejects unknown token', async () => {
      prisma.oAuthAccessToken.findUnique.mockResolvedValue(null);

      await expect(service.validateAccessToken('oat_bad')).rejects.toThrow(
        'Invalid access token',
      );
    });

    it('rejects revoked token', async () => {
      prisma.oAuthAccessToken.findUnique.mockResolvedValue({
        tokenHash: 'hash',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        user: { id: 'user-1', username: 'test', email: 'a@b.c', roleId: null },
      });

      await expect(service.validateAccessToken('oat_revoked')).rejects.toThrow(
        'Access token has been revoked',
      );
    });

    it('rejects expired token', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      prisma.oAuthAccessToken.findUnique.mockResolvedValue({
        tokenHash: 'hash',
        revokedAt: null,
        expiresAt: pastDate,
        user: { id: 'user-1', username: 'test', email: 'a@b.c', roleId: null },
      });

      await expect(service.validateAccessToken('oat_expired')).rejects.toThrow(
        'Access token expired',
      );
    });
  });

  describe('refreshTokens', () => {
    const clientId = 'client-1';
    const refreshToken = 'ort_abc123';

    it('rejects when atomic revocation fails (already revoked)', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.refreshTokens(refreshToken, clientId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when existing token not found after revocation', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthRefreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens(refreshToken, clientId),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('returns new token pair on success', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthRefreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        clientId,
      });
      prisma.oAuthAccessToken.findFirst.mockResolvedValue(null);

      const result = await service.refreshTokens(refreshToken, clientId);

      expect(result.accessToken).toMatch(/^oat_/);
      expect(result.refreshToken).toMatch(/^ort_/);
      expect(result.tokenType).toBe('Bearer');
    });

    it('inherits mcp scope from previous access token', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthRefreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        clientId,
      });
      prisma.oAuthAccessToken.findFirst.mockResolvedValue({ scope: 'mcp' });

      const result = await service.refreshTokens(refreshToken, clientId);

      expect(result.expiresIn).toBe(30 * 86400);
    });

    it('rejects second concurrent call (only first updateMany succeeds)', async () => {
      prisma.oAuthRefreshToken.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      prisma.oAuthRefreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        clientId,
      });
      prisma.oAuthAccessToken.findFirst.mockResolvedValue(null);

      const results = await Promise.all([
        service
          .refreshTokens(refreshToken, clientId)
          .then((tokens) => ({ success: true, tokens }))
          .catch(() => ({ success: false })),
        service
          .refreshTokens(refreshToken, clientId)
          .then((tokens) => ({ success: true, tokens }))
          .catch(() => ({ success: false })),
      ]);

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });
  });

  describe('revokeToken', () => {
    const clientId = 'client-1';

    it('revokes access token by prefix', async () => {
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeToken('oat_test_token', undefined, clientId);

      expect(prisma.oAuthAccessToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), clientId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('revokes refresh token with cascade by prefix', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthRefreshToken.findUnique.mockResolvedValue({
        clientId,
        userId: 'user-1',
      });
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 2 });

      await service.revokeToken('ort_test_token', undefined, clientId);

      expect(prisma.oAuthRefreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), clientId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.oAuthAccessToken.updateMany).toHaveBeenCalledWith({
        where: { clientId, userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('uses token_type_hint for access_token', async () => {
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeToken('unknown_prefix', 'access_token', clientId);

      expect(prisma.oAuthAccessToken.updateMany).toHaveBeenCalled();
      expect(prisma.oAuthRefreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('uses token_type_hint for refresh_token', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthRefreshToken.findUnique.mockResolvedValue({
        clientId,
        userId: 'user-1',
      });
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 0 });

      await service.revokeToken('unknown_prefix', 'refresh_token', clientId);

      expect(prisma.oAuthRefreshToken.updateMany).toHaveBeenCalled();
    });

    it('tries both types when no hint and no prefix match', async () => {
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 0 });

      await service.revokeToken('unknown_token', undefined, clientId);

      expect(prisma.oAuthAccessToken.updateMany).toHaveBeenCalled();
      expect(prisma.oAuthRefreshToken.updateMany).toHaveBeenCalled();
    });

    it('does not throw on unknown token', async () => {
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.revokeToken('nonexistent', undefined, clientId),
      ).resolves.toBeUndefined();
    });

    it('does not throw on already-revoked token', async () => {
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.revokeToken('oat_already_revoked', undefined, clientId),
      ).resolves.toBeUndefined();
    });

    it('skips cascade when refresh token not found after revocation', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthRefreshToken.findUnique.mockResolvedValue(null);

      await service.revokeToken('ort_test', undefined, clientId);

      expect(prisma.oAuthAccessToken.updateMany).not.toHaveBeenCalled();
    });

    it('ignores token belonging to another client', async () => {
      prisma.oAuthAccessToken.updateMany.mockResolvedValue({ count: 0 });

      await service.revokeToken('oat_other_client', undefined, 'other-client');

      expect(prisma.oAuthAccessToken.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: expect.any(String),
          clientId: 'other-client',
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
