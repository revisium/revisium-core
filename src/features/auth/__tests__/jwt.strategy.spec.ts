import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { nanoid } from 'nanoid';
import { testCreateUser } from 'src/__tests__/create-models';
import { JwtSecretService } from 'src/features/auth/jwt-secret.service';
import { JwtStrategy } from 'src/features/auth/strategy/jwt.strategy';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

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
});
