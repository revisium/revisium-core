import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/features/auth/auth.service';
import { LoginHandler } from 'src/features/auth/commands/handlers/login.handler';
import { LoginCommand } from 'src/features/auth/commands/impl';
import { HttpJwtAuthGuard } from 'src/features/auth/guards/jwt/http-jwt-auth-guard.service';
import { GqlJwtAuthGuard } from 'src/features/auth/guards/jwt/gql-jwt-auth-guard.service';
import { OptionalHttpJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-http-jwt-auth-guard.service';
import { OptionalGqlJwtAuthGuard } from 'src/features/auth/guards/jwt/optional-gql-jwt-auth-guard.service';
import { UniversalAuthService } from 'src/features/auth/guards/universal-auth.service';
import {
  HttpUniversalAuthGuard,
  OptionalHttpUniversalAuthGuard,
  HttpJwtPassportGuard,
  OptionalHttpJwtPassportGuard,
} from 'src/features/auth/guards/universal/http-universal-auth.guard';
import {
  GqlUniversalAuthGuard,
  OptionalGqlUniversalAuthGuard,
  GqlJwtPassportGuard,
  OptionalGqlJwtPassportGuard,
} from 'src/features/auth/guards/universal/gql-universal-auth.guard';
import { NoAuthService } from 'src/features/auth/no-auth.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('NoAuthService', () => {
  it('should be enabled when REVISIUM_NO_AUTH is "true"', () => {
    const configService = { get: jest.fn().mockReturnValue('true') };
    const service = new NoAuthService(configService as any);

    expect(service.enabled).toBe(true);
  });

  it('should be disabled when REVISIUM_NO_AUTH is undefined', () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    const service = new NoAuthService(configService as any);

    expect(service.enabled).toBe(false);
  });

  it('should be disabled when REVISIUM_NO_AUTH is "false"', () => {
    const configService = { get: jest.fn().mockReturnValue('false') };
    const service = new NoAuthService(configService as any);

    expect(service.enabled).toBe(false);
  });

  it('should return admin user', () => {
    const configService = { get: jest.fn().mockReturnValue('true') };
    const service = new NoAuthService(configService as any);

    expect(service.adminUser).toEqual({ userId: 'admin', email: '' });
  });
});

describe('JWT Guards with NO_AUTH enabled', () => {
  const adminUser = { userId: 'admin', email: '' };

  const noAuthUniversalService = {
    authenticateRequest: jest.fn().mockImplementation(async (request: any) => {
      request.user = adminUser;
      return 'authenticated';
    }),
  } as unknown as UniversalAuthService;

  const mockJwtGuard = { canActivate: jest.fn() };

  const createHttpContext = (): { context: ExecutionContext; request: any } => {
    const request = { user: undefined as any, headers: {}, query: {}, ip: '' };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  const createGqlContext = (): { context: ExecutionContext; request: any } => {
    const request = { user: undefined as any, headers: {}, query: {}, ip: '' };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue({
      getContext: () => ({ req: request }),
    });
    const context = {} as ExecutionContext;
    return { context, request };
  };

  describe('HttpJwtAuthGuard', () => {
    it('should set admin user and return true', async () => {
      const universalGuard = new HttpUniversalAuthGuard(
        noAuthUniversalService,
        mockJwtGuard as unknown as HttpJwtPassportGuard,
      );
      const guard = new HttpJwtAuthGuard(universalGuard);
      const { context, request } = createHttpContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(adminUser);
    });
  });

  describe('OptionalHttpJwtAuthGuard', () => {
    it('should set admin user and return true', async () => {
      const universalGuard = new OptionalHttpUniversalAuthGuard(
        noAuthUniversalService,
        mockJwtGuard as unknown as OptionalHttpJwtPassportGuard,
      );
      const guard = new OptionalHttpJwtAuthGuard(universalGuard);
      const { context, request } = createHttpContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(adminUser);
    });
  });

  describe('GqlJwtAuthGuard', () => {
    it('should set admin user and return true', async () => {
      const universalGuard = new GqlUniversalAuthGuard(
        noAuthUniversalService,
        mockJwtGuard as unknown as GqlJwtPassportGuard,
      );
      const guard = new GqlJwtAuthGuard(universalGuard);
      const { context, request } = createGqlContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(adminUser);
    });
  });

  describe('OptionalGqlJwtAuthGuard', () => {
    it('should set admin user and return true', async () => {
      const universalGuard = new OptionalGqlUniversalAuthGuard(
        noAuthUniversalService,
        mockJwtGuard as unknown as OptionalGqlJwtPassportGuard,
      );
      const guard = new OptionalGqlJwtAuthGuard(universalGuard);
      const { context, request } = createGqlContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(adminUser);
    });
  });
});

describe('LoginHandler with NO_AUTH enabled', () => {
  it('should return token for any credentials', async () => {
    const authService = {
      login: jest.fn().mockReturnValue('no-auth-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        {
          provide: PrismaService,
          useValue: { user: { findFirst: jest.fn() } },
        },
        { provide: AuthService, useValue: authService },
        {
          provide: NoAuthService,
          useValue: {
            enabled: true,
            adminUser: { userId: 'admin', email: '' },
          },
        },
      ],
    }).compile();

    const handler = module.get<LoginHandler>(LoginHandler);
    const command = new LoginCommand({
      emailOrUsername: 'anything',
      password: 'anything',
    });

    const result = await handler.execute(command);

    expect(result).toEqual({ accessToken: 'no-auth-token' });
    expect(authService.login).toHaveBeenCalledWith({
      username: 'admin',
      email: '',
      sub: 'admin',
    });
  });

  it('should not query database', async () => {
    const findFirst = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        {
          provide: PrismaService,
          useValue: { user: { findFirst } },
        },
        {
          provide: AuthService,
          useValue: { login: jest.fn().mockReturnValue('token') },
        },
        {
          provide: NoAuthService,
          useValue: {
            enabled: true,
            adminUser: { userId: 'admin', email: '' },
          },
        },
      ],
    }).compile();

    const handler = module.get<LoginHandler>(LoginHandler);
    await handler.execute(
      new LoginCommand({ emailOrUsername: 'x', password: 'y' }),
    );

    expect(findFirst).not.toHaveBeenCalled();
  });
});
