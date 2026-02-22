import { UnauthorizedException } from '@nestjs/common';
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
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      oAuthRefreshToken: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      oAuthAccessToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthTokenService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OAuthTokenService);
  });

  describe('createTokens', () => {
    it('returns token pair with correct prefixes', async () => {
      const result = await service.createTokens('client-1', 'user-1');

      expect(result.accessToken).toMatch(/^oat_/);
      expect(result.refreshToken).toMatch(/^ort_/);
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
      expect(prisma.$transaction).toHaveBeenCalled();
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

      const result = await service.refreshTokens(refreshToken, clientId);

      expect(result.accessToken).toMatch(/^oat_/);
      expect(result.refreshToken).toMatch(/^ort_/);
      expect(result.tokenType).toBe('Bearer');
    });

    it('rejects second concurrent call (only first updateMany succeeds)', async () => {
      prisma.oAuthRefreshToken.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      prisma.oAuthRefreshToken.findUnique.mockResolvedValue({
        userId: 'user-1',
        clientId,
      });

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
