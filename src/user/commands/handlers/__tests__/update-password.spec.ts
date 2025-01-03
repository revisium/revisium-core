import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import { UpdatePasswordHandler } from '../update-password.handler';
import { UpdatePasswordCommand } from 'src/user/commands/impl';

describe('UpdatePasswordHandler', () => {
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

  it('should throw an error if the old password is incorrect', async () => {
    prismaService.user.findUnique = createMock({
      id: 'userId',
      password: 'hashedPassword',
    });
    authService.comparePassword = createMock(false);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow('Invalid password');
  });

  it('should update the password if all conditions are met', async () => {
    prismaService.user.findUnique = createMock({
      id: 'userId',
      password: 'hashedPassword',
    });
    authService.comparePassword = createMock(true);
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

  let handler: UpdatePasswordHandler;
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
      comparePassword: createMock(true),
      hashPassword: createMock('newHashedPassword'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdatePasswordHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    handler = module.get<UpdatePasswordHandler>(UpdatePasswordHandler);
    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  const createCommand = (data: Partial<UpdatePasswordCommand['data']> = {}) => {
    return new UpdatePasswordCommand({
      newPassword: 'newPassword123',
      oldPassword: 'oldPassword',
      userId: 'userId',
      ...data,
    });
  };
});
