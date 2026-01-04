import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { LoginHandler } from 'src/features/auth/commands/handlers/login.handler';
import { LoginCommand } from 'src/features/auth/commands/impl';

describe('LoginHandler', () => {
  it('should throw an error if user does not exist', async () => {
    prismaService.user.findFirst = createMock(null);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    await expect(handler.execute(command)).rejects.toThrow('User does not exist');
  });

  it('should throw an error if user has no password (OAuth user)', async () => {
    prismaService.user.findFirst = createMock({
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: '',
      isEmailConfirmed: true,
    });
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Password login is not available',
    );
  });

  it('should throw an error if password is incorrect', async () => {
    prismaService.user.findFirst = createMock({
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      isEmailConfirmed: true,
    });
    authService.comparePassword = createMock(false);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    await expect(handler.execute(command)).rejects.toThrow('Invalid password');
  });

  it('should throw an error if email is not confirmed', async () => {
    prismaService.user.findFirst = createMock({
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      isEmailConfirmed: false,
    });
    authService.comparePassword = createMock(true);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    await expect(handler.execute(command)).rejects.toThrow('Email is not confirmed');
  });

  it('should return access token on successful login', async () => {
    prismaService.user.findFirst = createMock({
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      isEmailConfirmed: true,
    });
    authService.comparePassword = createMock(true);
    authService.login = jest.fn().mockReturnValue('jwt-token');
    const command = createCommand();

    const result = await handler.execute(command);

    expect(result).toEqual({ accessToken: 'jwt-token' });
    expect(authService.login).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@example.com',
      sub: 'userId',
    });
  });

  let handler: LoginHandler;
  let prismaService: PrismaService;
  let authService: AuthService;

  const createMock = <T>(mockResolvedValue: T) =>
    jest.fn().mockResolvedValue(mockResolvedValue);

  beforeEach(async () => {
    const prismaServiceMock = {
      user: {
        findFirst: createMock(null),
      },
    };

    const authServiceMock = {
      comparePassword: createMock(true),
      login: jest.fn().mockReturnValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    handler = module.get<LoginHandler>(LoginHandler);
    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
  });

  const createCommand = (data: Partial<LoginCommand['data']> = {}) => {
    return new LoginCommand({
      emailOrUsername: 'testuser',
      password: 'password123',
      ...data,
    });
  };
});
