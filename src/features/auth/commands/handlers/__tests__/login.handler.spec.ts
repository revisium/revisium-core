import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { AuthService } from 'src/features/auth/auth.service';
import { LoginHandler } from 'src/features/auth/commands/handlers/login.handler';
import { LoginCommand } from 'src/features/auth/commands/impl';
import { NoAuthService } from 'src/features/auth/no-auth.service';

describe('LoginHandler', () => {
  // Generic "Invalid credentials" prevents user enumeration via either
  // error messages or response time. All three failure modes must produce
  // the same exception with the same message AND must always run bcrypt
  // compare (even when the user is missing) so timing does not leak.
  it('throws Invalid credentials when user does not exist', async () => {
    prismaService.user.findFirst = createMock(null);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(handler.execute(command)).rejects.toThrow(
      'Invalid credentials',
    );
    // bcrypt compare must still run against the dummy hash to equalise
    // response time with the happy path.
    expect(authService.comparePassword).toHaveBeenCalled();
  });

  it('throws Invalid credentials when user has no password (OAuth user)', async () => {
    prismaService.user.findFirst = createMock({
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: '',
      isEmailConfirmed: true,
    });
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(handler.execute(command)).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('throws Invalid credentials when password is wrong', async () => {
    prismaService.user.findFirst = createMock({
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      isEmailConfirmed: true,
    });
    authService.comparePassword = createMock(false);
    const command = createCommand();

    await expect(handler.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(handler.execute(command)).rejects.toThrow(
      'Invalid credentials',
    );
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

    await expect(handler.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(handler.execute(command)).rejects.toThrow(
      'Email is not confirmed',
    );
  });

  it('should return access and refresh tokens on successful login', async () => {
    const user = {
      id: 'userId',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      isEmailConfirmed: true,
      tokenVersion: 0,
    };
    prismaService.user.findFirst = createMock(user);
    authService.comparePassword = createMock(true);
    authService.issueTokens = jest.fn().mockResolvedValue({
      accessToken: 'jwt-token',
      refreshToken: 'ref_abc',
      expiresIn: 1800,
    });
    const command = createCommand();

    const result = await handler.execute(command);

    expect(result).toEqual({
      accessToken: 'jwt-token',
      refreshToken: 'ref_abc',
      expiresIn: 1800,
    });
    expect(authService.issueTokens).toHaveBeenCalledWith(user, {
      ip: undefined,
      userAgent: undefined,
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
      signAccessToken: jest
        .fn()
        .mockReturnValue({ accessToken: 'jwt-token', expiresIn: 1800 }),
      issueTokens: jest.fn().mockResolvedValue({
        accessToken: 'jwt-token',
        refreshToken: 'ref_abc',
        expiresIn: 1800,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NoAuthService, useValue: { enabled: false } },
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
