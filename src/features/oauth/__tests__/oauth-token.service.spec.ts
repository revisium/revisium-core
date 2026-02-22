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
      },
      $transaction: jest
        .fn()
        .mockImplementation((ops: Promise[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthTokenService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OAuthTokenService);
  });

  describe('refreshTokens', () => {
    const clientId = 'client-1';
    const refreshToken = 'ort_abc123';

    it('should reject when atomic revocation fails (already revoked)', async () => {
      prisma.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.refreshTokens(refreshToken, clientId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject second concurrent call (only first updateMany succeeds)', async () => {
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
});
