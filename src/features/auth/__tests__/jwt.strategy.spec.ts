import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { Request } from 'express';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import {
  JwtStrategy,
  extractTokenFromCookieOrHeader,
} from 'src/features/auth/strategy/jwt.strategy';
import { AuthCacheService } from 'src/infrastructure/cache/services/auth-cache.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

// Cache pass-through mock: always delegates to the factory so the
// strategy's DB read path is exercised in tests. Unit tests for the
// cache-hit path live in auth-cache.service.spec.ts.
const passThroughCache: Pick<AuthCacheService, 'userTokenVersion'> = {
  userTokenVersion: async (_userId, factory) => factory(),
};

describe('JwtStrategy', () => {
  let module: TestingModule;
  let strategy: JwtStrategy;
  let prisma: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        PrismaService,
        { provide: JwtSecretService, useValue: { secret: 'test-secret' } },
        { provide: AuthCacheService, useValue: passThroughCache },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('validate', () => {
    it('returns the auth user when ver matches user.tokenVersion', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });

      const result = await strategy.validate({
        sub: userId,
        email: `${userId}@example.com`,
        ver: 0,
      });

      expect(result).toEqual({
        userId,
        email: `${userId}@example.com`,
        authMethod: 'jwt',
      });
    });

    it('throws UnauthorizedException when ver does not match user.tokenVersion', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: 5 },
      });

      await expect(
        strategy.validate({
          sub: userId,
          email: `${userId}@example.com`,
          ver: 0,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('skips the version check when the ver claim is missing (backward compat)', async () => {
      const userId = nanoid();
      await testCreateUser(prisma, { id: userId });
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: 99 },
      });

      const result = await strategy.validate({
        sub: userId,
        email: `${userId}@example.com`,
      });

      expect(result.userId).toBe(userId);
    });

    it('throws when the sub claim is missing', async () => {
      await expect(
        strategy.validate({ sub: '', email: 'x@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the user referenced by sub no longer exists', async () => {
      await expect(
        strategy.validate({
          sub: 'no-such-user',
          email: 'x@example.com',
          ver: 0,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('extractTokenFromCookieOrHeader', () => {
    const makeRequest = (
      headers: Record<string, string> = {},
      cookies?: Record<string, string>,
    ): Request =>
      ({
        headers,
        cookies,
      }) as unknown as Request;

    it('returns the Bearer header when only the header is present', () => {
      const token = extractTokenFromCookieOrHeader(
        makeRequest({ authorization: 'Bearer header-token' }),
      );
      expect(token).toBe('header-token');
    });

    it('returns the rev_at cookie when only the cookie is present', () => {
      const token = extractTokenFromCookieOrHeader(
        makeRequest({}, { rev_at: 'cookie-token' }),
      );
      expect(token).toBe('cookie-token');
    });

    it('returns the Bearer header when BOTH are present — header precedence', () => {
      // This is the real precedence guarantee exercised by the whole
      // dual-path design: a live PAT/OAuth Bearer header always wins
      // over a stale rev_at cookie. Returning the cookie here would
      // silently route PAT consumers through the cookie auth path.
      const token = extractTokenFromCookieOrHeader(
        makeRequest(
          { authorization: 'Bearer header-token' },
          { rev_at: 'cookie-token' },
        ),
      );
      expect(token).toBe('header-token');
      expect(token).not.toBe('cookie-token');
    });

    it('returns null when neither header nor cookie is present', () => {
      expect(extractTokenFromCookieOrHeader(makeRequest())).toBeNull();
    });

    it('returns null when the Authorization header has a non-Bearer scheme', () => {
      const token = extractTokenFromCookieOrHeader(
        makeRequest({ authorization: 'Basic user:pass' }),
      );
      expect(token).toBeNull();
    });

    it('falls through to the cookie when Authorization is not Bearer', () => {
      const token = extractTokenFromCookieOrHeader(
        makeRequest(
          { authorization: 'Basic user:pass' },
          { rev_at: 'cookie-token' },
        ),
      );
      // Documented current behavior — a non-Bearer Authorization header
      // does not bypass the cookie path because UniversalAuthService has
      // already matched 'rev_'/internal-key/api-key routes upstream.
      expect(token).toBe('cookie-token');
    });
  });
});
