import { Test } from '@nestjs/testing';
import { CleanOAuthExpiredAccessTokensHandler } from 'src/infrastructure/clean/commands/handlers/clean-oauth-expired-access-tokens.handler';
import { CleanOAuthExpiredCodesHandler } from 'src/infrastructure/clean/commands/handlers/clean-oauth-expired-codes.handler';
import { CleanOAuthExpiredRefreshTokensHandler } from 'src/infrastructure/clean/commands/handlers/clean-oauth-expired-refresh-tokens.handler';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

describe('CleanOAuthExpiredCodesHandler', () => {
  let handler: CleanOAuthExpiredCodesHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CleanOAuthExpiredCodesHandler,
        {
          provide: PrismaService,
          useValue: {
            oAuthAuthorizationCode: { deleteMany: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = module.get(CleanOAuthExpiredCodesHandler);
    prisma = module.get(PrismaService);
  });

  it('should delete expired authorization codes', async () => {
    const deleteMany = prisma.oAuthAuthorizationCode.deleteMany as jest.Mock;
    deleteMany.mockResolvedValue({ count: 5 });

    const now = new Date();
    const result = await handler.execute();

    expect(result).toEqual({ count: 5 });
    expect(deleteMany).toHaveBeenCalledTimes(1);

    const where = deleteMany.mock.calls[0][0].where;
    expect(where.expiresAt.lt).toBeInstanceOf(Date);
    expect(where.expiresAt.lt.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });
});

describe('CleanOAuthExpiredAccessTokensHandler', () => {
  let handler: CleanOAuthExpiredAccessTokensHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CleanOAuthExpiredAccessTokensHandler,
        {
          provide: PrismaService,
          useValue: {
            oAuthAccessToken: { deleteMany: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = module.get(CleanOAuthExpiredAccessTokensHandler);
    prisma = module.get(PrismaService);
  });

  it('should delete expired access tokens', async () => {
    const deleteMany = prisma.oAuthAccessToken.deleteMany as jest.Mock;
    deleteMany.mockResolvedValue({ count: 10 });

    const now = new Date();
    const result = await handler.execute();

    expect(result).toEqual({ count: 10 });
    expect(deleteMany).toHaveBeenCalledTimes(1);

    const where = deleteMany.mock.calls[0][0].where;
    expect(where.expiresAt.lt).toBeInstanceOf(Date);
    expect(where.expiresAt.lt.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });
});

describe('CleanOAuthExpiredRefreshTokensHandler', () => {
  let handler: CleanOAuthExpiredRefreshTokensHandler;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CleanOAuthExpiredRefreshTokensHandler,
        {
          provide: PrismaService,
          useValue: {
            oAuthRefreshToken: { deleteMany: jest.fn() },
          },
        },
      ],
    }).compile();

    handler = module.get(CleanOAuthExpiredRefreshTokensHandler);
    prisma = module.get(PrismaService);
  });

  it('should delete expired refresh tokens', async () => {
    const deleteMany = prisma.oAuthRefreshToken.deleteMany as jest.Mock;
    deleteMany.mockResolvedValue({ count: 3 });

    const now = new Date();
    const result = await handler.execute();

    expect(result).toEqual({ count: 3 });
    expect(deleteMany).toHaveBeenCalledTimes(1);

    const where = deleteMany.mock.calls[0][0].where;
    expect(where.expiresAt.lt).toBeInstanceOf(Date);
    expect(where.expiresAt.lt.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });
});
