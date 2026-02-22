import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { OAuthAuthorizationService } from '../oauth-authorization.service';

describe('OAuthAuthorizationService', () => {
  let service: OAuthAuthorizationService;
  let prisma: {
    oAuthAuthorizationCode: {
      create: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      oAuthAuthorizationCode: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthAuthorizationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(OAuthAuthorizationService);
  });

  describe('exchangeCode', () => {
    const validParams = {
      code: 'auth_abc123',
      clientId: 'client-1',
      codeVerifier: 'test-verifier',
      redirectUri: 'http://localhost:3000/callback',
    };

    it('should reject when atomic claim fails (code already used)', async () => {
      prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.exchangeCode(validParams)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject second concurrent call (only first updateMany succeeds)', async () => {
      prisma.oAuthAuthorizationCode.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue({
        code: validParams.code,
        clientId: validParams.clientId,
        redirectUri: validParams.redirectUri,
        codeChallenge: 'JBbiqONGWPaAmwXk_8bT6UnlPfrn65D32eZlJS-zGG0',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 600_000),
        userId: 'user-1',
      });

      const results = await Promise.all([
        service
          .exchangeCode(validParams)
          .then((r) => ({ success: true, ...r }))
          .catch(() => ({ success: false })),
        service
          .exchangeCode(validParams)
          .then((r) => ({ success: true, ...r }))
          .catch(() => ({ success: false })),
      ]);

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
    });

    it('should reject when PKCE verification fails', async () => {
      prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });
      prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue({
        code: validParams.code,
        clientId: validParams.clientId,
        redirectUri: validParams.redirectUri,
        codeChallenge: 'wrong-challenge',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 600_000),
        userId: 'user-1',
      });

      await expect(service.exchangeCode(validParams)).rejects.toThrow(
        'PKCE verification failed',
      );
    });
  });
});
