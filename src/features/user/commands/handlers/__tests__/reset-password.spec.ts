import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { ResetPasswordHandler } from 'src/features/user/commands/handlers/reset-password.handler';
import { ResetPasswordCommand } from 'src/features/user/commands/impl';

describe('ResetPasswordHandler', () => {
  it('should throw an error if the new password is less than 8 characters', async () => {
    const command = createCommand({ newPassword: 'short' });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Password must be at least 8 characters',
    );
  });

  it('should throw an error if the user is not found', async () => {
    prismaService.user.findUnique = createMock(null);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow('Not found user');
  });

  it('should reset password without requiring old password', async () => {
    prismaService.user.findUnique = createMock({ id: 'userId' });
    authService.hashPassword = createMock('newHashedPassword');
    prismaService.user.update = createMock(true);
    const command = createCommand();

    const result = await handler.execute(command);

    expect(result).toBe(true);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'userId' },
      data: { password: 'newHashedPassword' },
    });
  });

  it('should reset password even if user has existing password', async () => {
    prismaService.user.findUnique = createMock({
      id: 'userId',
      password: 'existingHashedPassword',
    });
    authService.hashPassword = createMock('newHashedPassword');
    prismaService.user.update = createMock(true);
    const command = createCommand();

    const result = await handler.execute(command);

    expect(result).toBe(true);
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 'userId' },
      data: { password: 'newHashedPassword' },
    });
  });

  let handler: ResetPasswordHandler;
  let prismaService: PrismaService;
  let authService: AuthService;

  const createMock = <T>(mockResolvedValue: T) =>
    jest.fn().mockResolvedValue(mockResolvedValue);

  beforeEach(async () => {
    const prismaServiceMock = {
      user: {
        findUnique: createMock(null),
        update: createMock(true),
      },
    };

    const authServiceMock = {
      hashPassword: createMock('newHashedPassword'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    handler = module.get<ResetPasswordHandler>(ResetPasswordHandler);
    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  const createCommand = (
    data: Partial<ResetPasswordCommand['data']> = {},
  ) => {
    return new ResetPasswordCommand({
      newPassword: 'newPassword123',
      userId: 'userId',
      ...data,
    });
  };
});
